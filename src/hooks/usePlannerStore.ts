import { trpc } from '../lib/trpc';
import { TimeBlock, Task } from '../lib/types';
import { format, startOfWeek, endOfWeek, getISOWeek, getYear } from 'date-fns';
import { useMemo, useCallback, useRef } from 'react';

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
  
  // Get week ID using ISO week number for consistency
  const year = getYear(weekStart);
  const weekNumber = getISOWeek(weekStart);
  const weekId = `${year}-W${weekNumber.toString().padStart(2, '0')}`;

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
        const tempTask: Task = {
          id: Date.now(), // Temporary ID
          content: newTask.content,
          date: newTask.date,
          timeBlock: newTask.timeBlock,
          completed: false,
          sortOrder: old.length,
          createdAt: new Date(),
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

  const upsertNoteMutation = trpc.notes.upsert.useMutation({
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
    },
    onSettled: () => {
      utils.notes.getForWeek.invalidate({ weekId });
    },
  });

  const updateColumnWidthsMutation = trpc.weekSettings.updateColumnWidths.useMutation({
    onSettled: () => {
      utils.weekSettings.get.invalidate({ weekId });
    },
  });

  const updateCustomContentMutation = trpc.weekSettings.updateCustomContent.useMutation({
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
    onSettled: () => {
      utils.weekSettings.get.invalidate({ weekId });
    },
  });

  const uploadCustomImageMutation = trpc.weekSettings.uploadCustomImage.useMutation({
    onSettled: () => {
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
  const customText = weekSettingsQuery.data?.customText ?? null;
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

  const moveTask = useCallback((id: number, newDate: string, newTimeBlock: TimeBlock, newSortOrder?: number) => {
    updateTaskMutation.mutate({ 
      id, 
      date: newDate, 
      timeBlock: newTimeBlock,
      sortOrder: newSortOrder 
    });
  }, [updateTaskMutation]);

  // Debounced note update
  const debouncedNoteUpdate = useRef(
    debounce((wId: string, content: string) => {
      upsertNoteMutation.mutate({ weekId: wId, content });
    }, 500)
  ).current;

  const updateNote = useCallback((content: string) => {
    debouncedNoteUpdate(weekId, content);
  }, [weekId, debouncedNoteUpdate]);

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

  // Debounced custom text update
  const debouncedCustomTextUpdate = useRef(
    debounce((wId: string, text: string | null) => {
      updateCustomContentMutation.mutate({ weekId: wId, customText: text });
    }, 500)
  ).current;

  const updateCustomText = useCallback((text: string | null) => {
    debouncedCustomTextUpdate(weekId, text);
  }, [weekId, debouncedCustomTextUpdate]);

  const uploadCustomImage = useCallback(async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        uploadCustomImageMutation.mutate(
          { weekId, imageBase64: base64, mimeType: file.type },
          {
            onSuccess: (data) => resolve(data.url),
            onError: (error) => reject(error),
          }
        );
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }, [weekId, uploadCustomImageMutation]);

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
    uploadCustomImage,
    clearCustomImage,
    isUploadingImage: uploadCustomImageMutation.isPending,
  };
}
