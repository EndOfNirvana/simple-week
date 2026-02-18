import { trpc } from '../lib/trpc';
import { format, startOfWeek, getISOWeek, getYear } from 'date-fns';
import { useCallback, useRef, useMemo } from 'react';

// Debounce helper
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export interface DailyEntries {
  [key: string]: string; // "0" -> Monday content, "1" -> Tuesday content, etc.
}

export function useSummaryStore(currentDate: Date) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  
  const year = getYear(weekStart);
  const weekNumber = getISOWeek(weekStart);
  const weekId = `${year}-W${weekNumber.toString().padStart(2, '0')}`;

  const summaryQuery = trpc.weeklySummary.get.useQuery(
    { weekId },
    { staleTime: 30000 }
  );

  const utils = trpc.useUtils();

  const upsertMutation = trpc.weeklySummary.upsert.useMutation({
    onMutate: async (input) => {
      await utils.weeklySummary.get.cancel({ weekId: input.weekId });
      const previous = utils.weeklySummary.get.getData({ weekId: input.weekId });

      utils.weeklySummary.get.setData({ weekId: input.weekId }, (old) => {
        const base = old || {
          id: 0,
          userId: 0,
          weekId: input.weekId,
          keyword: null,
          dailyEntries: null,
          reflection: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return {
          ...base,
          keyword: input.keyword !== undefined ? input.keyword ?? null : base.keyword,
          dailyEntries: input.dailyEntries !== undefined ? input.dailyEntries ?? null : base.dailyEntries,
          reflection: input.reflection !== undefined ? input.reflection ?? null : base.reflection,
        };
      });

      return { previous };
    },
    onError: (err, input, context) => {
      if (context?.previous !== undefined) {
        utils.weeklySummary.get.setData({ weekId: input.weekId }, context.previous);
      }
    },
    onSettled: () => {
      utils.weeklySummary.get.invalidate({ weekId });
    },
  });

  // Debounced updates
  const debouncedKeywordUpdate = useRef(
    debounce((wId: string, keyword: string | null) => {
      upsertMutation.mutate({ weekId: wId, keyword });
    }, 500)
  ).current;

  const debouncedDailyEntriesUpdate = useRef(
    debounce((wId: string, dailyEntries: string) => {
      upsertMutation.mutate({ weekId: wId, dailyEntries });
    }, 500)
  ).current;

  const debouncedReflectionUpdate = useRef(
    debounce((wId: string, reflection: string | null) => {
      upsertMutation.mutate({ weekId: wId, reflection });
    }, 500)
  ).current;

  const updateKeyword = useCallback((keyword: string | null) => {
    debouncedKeywordUpdate(weekId, keyword);
  }, [weekId, debouncedKeywordUpdate]);

  const updateDailyEntry = useCallback((dayIndex: number, content: string) => {
    // Parse existing entries, update the specific day, and save
    const currentEntries: DailyEntries = summaryQuery.data?.dailyEntries
      ? JSON.parse(summaryQuery.data.dailyEntries)
      : {};
    const newEntries = { ...currentEntries, [dayIndex.toString()]: content };
    debouncedDailyEntriesUpdate(weekId, JSON.stringify(newEntries));
  }, [weekId, summaryQuery.data?.dailyEntries, debouncedDailyEntriesUpdate]);

  const updateReflection = useCallback((reflection: string | null) => {
    debouncedReflectionUpdate(weekId, reflection);
  }, [weekId, debouncedReflectionUpdate]);

  // Parse daily entries from JSON
  const dailyEntries: DailyEntries = useMemo(() => {
    if (summaryQuery.data?.dailyEntries) {
      try {
        return JSON.parse(summaryQuery.data.dailyEntries);
      } catch {
        return {};
      }
    }
    return {};
  }, [summaryQuery.data?.dailyEntries]);

  return {
    keyword: summaryQuery.data?.keyword ?? '',
    dailyEntries,
    reflection: summaryQuery.data?.reflection ?? '',
    isLoading: summaryQuery.isLoading,
    updateKeyword,
    updateDailyEntry,
    updateReflection,
    weekId,
  };
}
