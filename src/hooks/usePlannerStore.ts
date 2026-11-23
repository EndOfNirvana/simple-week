import { trpc } from '../lib/trpc';
import { TimeBlock, Task } from '../lib/types';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useMemo, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { moveTaskWithinWeek } from '../../shared/week-data';
import { getWeekId } from '../../shared/week-id';

// Default column width
const DEFAULT_COLUMN_WIDTH = 130;

// Debounce helper
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function usePlannerStore(currentDate: Date) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');
  
  const weekId = getWeekId(weekStart);

  // Queries with staleTime to reduce refetches
  const tasksQuery = trpc.tasks.getForWeek.useQuery(
    { startDate, endDate },
    { staleTime: 30000 } // 30 seconds
  );
  const noteQuery = trpc.notes.getForWeek.useQuery(
    { weekId },
    { staleTime: 30000 }
  );
  const weekSettingsQuery = trpc.weekSettings.get.useQuery(
    { weekId },
    { staleTime: 60000 } // 1 minute
  );
  const legacySummaryQuery = trpc.weeklySummary.get.useQuery(
    { weekId },
    {
      enabled: weekSettingsQuery.isSuccess && weekSettingsQuery.data?.customText == null,
      staleTime: 30000,
    }
  );
  const [titleDrafts, setTitleDrafts] = useState<Record<string, { text: string }>>({});
  const titleTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Mutations with optimistic updates
  const utils = trpc.useUtils();
  
  const createTaskMutation = trpc.tasks.create.useMutation({
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await utils.tasks.getForWeek.cancel({ startDate, endDate });
      
      // Snapshot previous value
      const previousTasks = utils.tasks.getForWeek.getData({ startDate, endDate });
      
      // Optimistically update
      utils.tasks.getForWeek.setData({ startDate, endDate }, (old) => {
        if (!old) return old;
        const now = new Date();
        const tempTask: Task = {
          id: -now.getTime(),
          userId: old[0]?.userId ?? 0,
          content: newTask.content,
          date: newTask.date,
          timeBlock: newTask.timeBlock,
          completed: false,
          sortOrder: old.filter(task => task.date === newTask.date && task.timeBlock === newTask.timeBlock)
            .reduce((next, task) => Math.max(next, task.sortOrder + 1), 0),
          createdAt: now,
          updatedAt: now,
        };
        return [...old, tempTask];
      });
      
      return { previousTasks };
    },
    onError: (err, newTask, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        utils.tasks.getForWeek.setData({ startDate, endDate }, context.previousTasks);
      }
    },
    onSettled: () => {
      utils.tasks.getForWeek.invalidate({ startDate, endDate });
    },
  });

  const updateTaskMutation = trpc.tasks.update.useMutation({
    onMutate: async (updatedTask) => {
      await utils.tasks.getForWeek.cancel({ startDate, endDate });
      const previousTasks = utils.tasks.getForWeek.getData({ startDate, endDate });
      
      utils.tasks.getForWeek.setData({ startDate, endDate }, (old) => {
        if (!old) return old;
        return old.map(task => 
          task.id === updatedTask.id 
            ? { ...task, ...updatedTask }
            : task
        );
      });
      
      return { previousTasks };
    },
    onError: (err, updatedTask, context) => {
      if (context?.previousTasks) {
        utils.tasks.getForWeek.setData({ startDate, endDate }, context.previousTasks);
      }
    },
    onSettled: () => {
      utils.tasks.getForWeek.invalidate({ startDate, endDate });
    },
  });

  const deleteTaskMutation = trpc.tasks.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.tasks.getForWeek.cancel({ startDate, endDate });
      const previousTasks = utils.tasks.getForWeek.getData({ startDate, endDate });
      
      utils.tasks.getForWeek.setData({ startDate, endDate }, (old) => {
        if (!old) return old;
        return old.filter(task => task.id !== id);
      });
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        utils.tasks.getForWeek.setData({ startDate, endDate }, context.previousTasks);
      }
    },
    onSettled: () => {
      utils.tasks.getForWeek.invalidate({ startDate, endDate });
    },
  });

  const moveTaskMutation = trpc.tasks.move.useMutation({
    scope: { id: 'task-placement' },
    onMutate: async (input) => {
      const week = { startDate, endDate };
      await utils.tasks.getForWeek.cancel(week);
      const previous = utils.tasks.getForWeek.getData(week);
      const task = previous?.find(task => task.id === input.id);
      if (previous && task) {
        const changes = moveTaskWithinWeek(previous, task, input, input.targetTaskId);
        const positions = new Map(changes.map(task => [task.id, task]));
        utils.tasks.getForWeek.setData(week, previous
          .map(task => positions.get(task.id) ?? task)
          .sort((a, b) => a.sortOrder - b.sortOrder));
      }
      return { week, previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) utils.tasks.getForWeek.setData(context.week, context.previous);
      toast.error('任务移动失败，请重试');
    },
    onSettled: (_tasks, _error, _input, context) => {
      if (context) utils.tasks.getForWeek.invalidate(context.week);
    },
  });

  const upsertNoteMutation = trpc.notes.upsert.useMutation({
    scope: { id: 'week-note' },
    onMutate: async ({ weekId, content }) => {
      await utils.notes.getForWeek.cancel({ weekId });
      const previousNote = utils.notes.getForWeek.getData({ weekId });
      
      utils.notes.getForWeek.setData({ weekId }, (old) => {
        if (!old) return { id: 0, weekId, content, userId: 0, createdAt: new Date(), updatedAt: new Date() };
        return { ...old, content };
      });
      
      return { previousNote };
    },
    onError: (err, variables, context) => {
      if (context?.previousNote !== undefined) {
        utils.notes.getForWeek.setData({ weekId: variables.weekId }, context.previousNote);
      }
      toast.error('备注保存失败，请重试');
    },
    onSettled: (_note, _error, { weekId }) => {
      utils.notes.getForWeek.invalidate({ weekId });
    },
  });

  const updateColumnWidthsMutation = trpc.weekSettings.updateColumnWidths.useMutation({
    onSettled: () => {
      utils.weekSettings.get.invalidate({ weekId });
    },
  });

  const updateCustomContentMutation = trpc.weekSettings.updateCustomContent.useMutation({
    scope: { id: 'week-custom-content' },
    onMutate: async ({ weekId, customText, customImageUrl }) => {
      await utils.weekSettings.get.cancel({ weekId });
      const previousSettings = utils.weekSettings.get.getData({ weekId });
      
      utils.weekSettings.get.setData({ weekId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          customText: customText !== undefined ? customText : old.customText,
          customImageUrl: customImageUrl !== undefined ? customImageUrl : old.customImageUrl,
        };
      });
      
      return { previousSettings };
    },
    onError: (err, variables, context) => {
      if (context?.previousSettings) {
        utils.weekSettings.get.setData({ weekId: variables.weekId }, context.previousSettings);
      }
    },
    onSuccess: (settings, { weekId, customText, customImageUrl }) => {
      utils.weekSettings.get.setData({ weekId }, (old) => old ? {
        ...old,
        customText: customText !== undefined ? settings.customText : old.customText,
        customImageUrl: customImageUrl !== undefined ? settings.customImageUrl : old.customImageUrl,
      } : settings);
    },
    onSettled: (_settings, _error, { weekId }) => {
      utils.weekSettings.get.invalidate({ weekId });
    },
  });

  // Parse column widths from settings
  const columnWidths = useMemo(() => {
    const defaultWidths: Record<number, number> = {};
    for (let i = 0; i < 7; i++) {
      defaultWidths[i] = DEFAULT_COLUMN_WIDTH;
    }
    
    if (weekSettingsQuery.data?.columnWidths) {
      try {
        const parsed = JSON.parse(weekSettingsQuery.data.columnWidths);
        return { ...defaultWidths, ...parsed };
      } catch {
        return defaultWidths;
      }
    }
    return defaultWidths;
  }, [weekSettingsQuery.data?.columnWidths]);

  // Custom content from settings
  // An empty saved title is an explicit clear. Only missing titles fall back to legacy keywords.
  const customText = titleDrafts[weekId]?.text ?? weekSettingsQuery.data?.customText ?? legacySummaryQuery.data?.keyword ?? '';
  const customImageUrl = weekSettingsQuery.data?.customImageUrl ?? null;

  // Actions
  const addTask = useCallback((content: string, date: string, timeBlock: TimeBlock) => {
    createTaskMutation.mutate({ content, date, timeBlock });
  }, [createTaskMutation]);

  const updateTask = useCallback((id: number, content: string) => {
    updateTaskMutation.mutate({ id, content });
  }, [updateTaskMutation]);

  const toggleTask = useCallback((id: number) => {
    const task = tasksQuery.data?.find(t => t.id === id);
    if (task) {
      updateTaskMutation.mutate({ id, completed: !task.completed });
    }
  }, [tasksQuery.data, updateTaskMutation]);

  const deleteTask = useCallback((id: number) => {
    deleteTaskMutation.mutate({ id });
  }, [deleteTaskMutation]);

  const moveTask = useCallback((id: number, date: string, timeBlock: TimeBlock, targetTaskId?: number) => {
    moveTaskMutation.mutate({ id, date, timeBlock, targetTaskId });
  }, [moveTaskMutation]);

  const updateNote = useCallback((content: string) => {
    upsertNoteMutation.mutate({ weekId, content });
  }, [weekId, upsertNoteMutation]);

  // Debounced column width update
  const debouncedColumnWidthUpdate = useRef(
    debounce((wId: string, widths: Record<string, number>) => {
      updateColumnWidthsMutation.mutate({ weekId: wId, columnWidths: widths });
    }, 300)
  ).current;

  const updateColumnWidth = useCallback((dayIndex: number, width: number) => {
    const newWidths = { ...columnWidths, [dayIndex]: width };
    const widthsForApi: Record<string, number> = {};
    for (const [key, value] of Object.entries(newWidths)) {
      widthsForApi[key] = value as number;
    }
    debouncedColumnWidthUpdate(weekId, widthsForApi);
  }, [columnWidths, weekId, debouncedColumnWidthUpdate]);

  const { mutateAsync: saveCustomContent } = updateCustomContentMutation;
  const updateCustomText = useCallback((text: string | null) => {
    const draft = { text: text ?? '' };
    setTitleDrafts(current => ({ ...current, [weekId]: draft }));
    clearTimeout(titleTimers.current.get(weekId));

    const timer = setTimeout(async () => {
      titleTimers.current.delete(weekId);
      try {
        await saveCustomContent({ weekId, customText: draft.text });
        setTitleDrafts(current => {
          if (current[weekId] !== draft) return current;
          const next = { ...current };
          delete next[weekId];
          return next;
        });
      } catch {
        toast.error('本周标题保存失败，请重试');
      }
    }, 500);
    titleTimers.current.set(weekId, timer);
  }, [weekId, saveCustomContent]);

  const clearCustomImage = useCallback(() => {
    updateCustomContentMutation.mutate({ weekId, customImageUrl: null });
  }, [weekId, updateCustomContentMutation]);

  return {
    tasks: tasksQuery.data ?? [],
    note: noteQuery.data,
    isLoading: tasksQuery.isLoading || noteQuery.isLoading,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    moveTask,
    updateNote,
    weekId,
    columnWidths,
    updateColumnWidth,
    customText,
    customImageUrl,
    updateCustomText,
    clearCustomImage,
  };
}
