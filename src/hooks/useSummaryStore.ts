import { useEffect, useMemo, useRef, useState } from 'react';
import { parseDailyEntries, type DailyEntries } from '../../shared/week-data';
import { trpc } from '../lib/trpc';

type SummaryChanges = {
  dailyEntryChanges: DailyEntries;
  reflection?: string | null;
};

type Draft = {
  changes: SummaryChanges;
  status: 'pending' | 'saving' | 'error';
};

export function useSummaryStore(weekId: string, enabled: boolean) {
  const query = trpc.weeklySummary.get.useQuery({ weekId }, { enabled, staleTime: 30000 });
  const utils = trpc.useUtils();
  const { mutateAsync } = trpc.weeklySummary.upsert.useMutation({
    onMutate: ({ weekId }) => utils.weeklySummary.get.cancel({ weekId }),
    onSuccess: (summary, { weekId }) => {
      utils.weeklySummary.get.setData({ weekId }, summary);
    },
  });
  const drafts = useRef(new Map<string, Draft>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saving = useRef(new Set<string>());
  const [draftState, setDraftState] = useState(() => new Map<string, Draft>());

  function setDraft(id: string, draft?: Draft) {
    if (draft) drafts.current.set(id, draft);
    else drafts.current.delete(id);
    setDraftState(new Map(drafts.current));
  }

  function cancelTimer(id: string) {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }

  async function saveWeek(id: string) {
    const draft = drafts.current.get(id);
    if (!draft || saving.current.has(id)) return;

    cancelTimer(id);
    saving.current.add(id);
    setDraft(id, { ...draft, status: 'saving' });
    const submitted = draft.changes;

    try {
      await mutateAsync({
        weekId: id,
        dailyEntryChanges: Object.keys(submitted.dailyEntryChanges).length ? submitted.dailyEntryChanges : undefined,
        reflection: submitted.reflection,
      });
      const latest = (drafts.current.get(id) ?? draft).changes;
      const dailyEntryChanges = { ...latest.dailyEntryChanges };
      for (const [day, content] of Object.entries(submitted.dailyEntryChanges)) {
        if (dailyEntryChanges[day] === content) delete dailyEntryChanges[day];
      }
      const reflection = latest.reflection === submitted.reflection ? undefined : latest.reflection;
      if (Object.keys(dailyEntryChanges).length || reflection !== undefined) {
        setDraft(id, { status: 'pending', changes: { dailyEntryChanges, reflection } });
      } else {
        cancelTimer(id);
        setDraft(id);
      }
    } catch {
      cancelTimer(id);
      const latest = drafts.current.get(id) ?? draft;
      setDraft(id, { ...latest, status: 'error' });
    } finally {
      saving.current.delete(id);
    }

    if (drafts.current.get(id)?.status === 'pending' && !timers.current.has(id)) {
      void saveWeek(id);
    }
  }

  function updateChanges(update: (changes: SummaryChanges) => SummaryChanges) {
    const changes = drafts.current.get(weekId)?.changes ?? { dailyEntryChanges: {} };
    setDraft(weekId, { status: 'pending', changes: update(changes) });
    cancelTimer(weekId);
    timers.current.set(weekId, setTimeout(() => {
      timers.current.delete(weekId);
      void saveWeek(weekId);
    }, 500));
  }

  const hasUnsavedChanges = draftState.size > 0;
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  const draft = draftState.get(weekId);
  const dailyEntries = useMemo(() => ({
    ...parseDailyEntries(query.data?.dailyEntries),
    ...draft?.changes.dailyEntryChanges,
  }), [query.data?.dailyEntries, draft?.changes.dailyEntryChanges]);

  return {
    dailyEntries,
    reflection: draft?.changes.reflection !== undefined ? draft.changes.reflection ?? '' : query.data?.reflection ?? '',
    isLoading: query.isLoading,
    loadFailed: query.isError && query.data === undefined,
    retryLoad: () => { void query.refetch(); },
    saveStatus: draft?.status ?? 'idle',
    retrySave: () => { void saveWeek(weekId); },
    updateDailyEntry: (dayIndex: number, content: string) => updateChanges(changes => ({
      ...changes,
      dailyEntryChanges: { ...changes.dailyEntryChanges, [dayIndex]: content },
    })),
    updateReflection: (reflection: string | null) => updateChanges(changes => ({ ...changes, reflection })),
  };
}
