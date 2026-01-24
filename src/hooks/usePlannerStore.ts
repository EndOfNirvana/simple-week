import { trpc } from '@/lib/trpc';
import { TimeBlock } from '@/lib/types';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useMemo, useCallback } from 'react';

// Default column width
const DEFAULT_COLUMN_WIDTH = 130;

export function usePlannerStore(currentDate: Date) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');
  
  // Get week ID for notes
  const year = currentDate.getFullYear();
  const weekNumber = Math.ceil(
    ((currentDate.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 
    new Date(year, 0, 1).getDay() + 1) / 7
  );
  const weekId = `${year}-W${weekNumber.toString().padStart(2, '0')}`;

  // Queries
  const tasksQuery = trpc.tasks.getForWeek.useQuery({ startDate, endDate });
  const noteQuery = trpc.notes.getForWeek.useQuery({ weekId });
  const weekSettingsQuery = trpc.weekSettings.get.useQuery({ weekId });

  // Mutations
  const utils = trpc.useUtils();
  
  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.getForWeek.invalidate({ startDate, endDate });
    },
  });

  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.getForWeek.invalidate({ startDate, endDate });
    },
  });

  const deleteTaskMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.getForWeek.invalidate({ startDate, endDate });
    },
  });

  const upsertNoteMutation = trpc.notes.upsert.useMutation({
    onSuccess: () => {
      utils.notes.getForWeek.invalidate({ weekId });
    },
  });

  const updateColumnWidthsMutation = trpc.weekSettings.updateColumnWidths.useMutation({
    onSuccess: () => {
      utils.weekSettings.get.invalidate({ weekId });
    },
  });

  const updateCustomContentMutation = trpc.weekSettings.updateCustomContent.useMutation({
    onSuccess: () => {
      utils.weekSettings.get.invalidate({ weekId });
    },
  });

  const uploadCustomImageMutation = trpc.weekSettings.uploadCustomImage.useMutation({
    onSuccess: () => {
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
  const addTask = (content: string, date: string, timeBlock: TimeBlock) => {
    createTaskMutation.mutate({ content, date, timeBlock });
  };

  const updateTask = (id: number, content: string) => {
    updateTaskMutation.mutate({ id, content });
  };

  const toggleTask = (id: number) => {
    const task = tasksQuery.data?.find(t => t.id === id);
    if (task) {
      updateTaskMutation.mutate({ id, completed: !task.completed });
    }
  };

  const deleteTask = (id: number) => {
    deleteTaskMutation.mutate({ id });
  };

  const moveTask = (id: number, newDate: string, newTimeBlock: TimeBlock, newSortOrder?: number) => {
    updateTaskMutation.mutate({ 
      id, 
      date: newDate, 
      timeBlock: newTimeBlock,
      sortOrder: newSortOrder 
    });
  };

  const updateNote = (content: string) => {
    upsertNoteMutation.mutate({ weekId, content });
  };

  const updateColumnWidth = useCallback((dayIndex: number, width: number) => {
    const newWidths = { ...columnWidths, [dayIndex]: width };
    // Convert to string keys for the API
    const widthsForApi: Record<string, number> = {};
    for (const [key, value] of Object.entries(newWidths)) {
      widthsForApi[key] = value as number;
    }
    updateColumnWidthsMutation.mutate({ weekId, columnWidths: widthsForApi });
  }, [columnWidths, weekId, updateColumnWidthsMutation]);

  const updateCustomText = useCallback((text: string | null) => {
    updateCustomContentMutation.mutate({ weekId, customText: text });
  }, [weekId, updateCustomContentMutation]);

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
