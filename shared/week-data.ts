export type DailyEntries = Record<string, string>;
export type TimeBlockHeights = [number, number, number];
export const MIN_TIME_BLOCK_HEIGHT = 64;

export function parseDailyEntries(value: string | null | undefined): DailyEntries {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, text]) => typeof text === 'string'));
  } catch {
    return {};
  }
}

type OrderedTask = {
  id: number;
  date: string;
  timeBlock: string;
  sortOrder: number;
};

export function moveTaskWithinWeek<T extends OrderedTask>(
  tasks: T[],
  task: T,
  destination: Pick<T, 'date' | 'timeBlock'>,
  targetTaskId?: number
): T[] {
  if (targetTaskId === task.id) return [];
  const { date, timeBlock } = destination;
  const destinationTasks = tasks.filter(item => item.date === date && item.timeBlock === timeBlock);
  const targetIndex = targetTaskId === undefined
    ? destinationTasks.length
    : destinationTasks.findIndex(item => item.id === targetTaskId);
  if (targetIndex === -1) return [];

  const ordered = destinationTasks.filter(item => item.id !== task.id);
  ordered.splice(targetIndex, 0, { ...task, date, timeBlock });
  return ordered.flatMap((item, sortOrder) => {
    const previous = item.id === task.id ? task : item;
    return previous.date !== date || previous.timeBlock !== timeBlock || previous.sortOrder !== sortOrder
      ? [{ ...item, sortOrder }]
      : [];
  });
}
