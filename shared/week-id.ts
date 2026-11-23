import { addWeeks, format, getISOWeek, getYear, isMonday, isValid, parseISO, startOfISOWeek } from 'date-fns';

export function getWeekId(date: Date): string {
  return format(startOfISOWeek(date), 'yyyy-MM-dd');
}

export function getLegacyWeekId(date: Date): string {
  const monday = startOfISOWeek(date);
  return `${getYear(monday)}-W${String(getISOWeek(monday)).padStart(2, '0')}`;
}

export function getLegacyWeekStarts(weekId: string): string[] {
  const match = /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/.exec(weekId);
  if (!match) return [];

  const [, year, week] = match;
  const firstMonday = startOfISOWeek(parseISO(`${year}-01-04`));
  const candidates = [addWeeks(firstMonday, Number(week) - 1)];
  // The final Monday in December can also have week number 1.
  if (week === '01') candidates.push(startOfISOWeek(parseISO(`${year}-12-31`)));
  return Array.from(new Set(candidates.filter(date => getLegacyWeekId(date) === weekId).map(getWeekId)));
}

export function isWeekStartId(weekId: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) return false;
  const date = parseISO(weekId);
  return isValid(date) && isMonday(date) && getWeekId(date) === weekId;
}

export function getWeekStorageKeys(weekId: string): string[] {
  if (isWeekStartId(weekId)) {
    const legacyId = getLegacyWeekId(parseISO(weekId));
    return getLegacyWeekStarts(legacyId).length === 1 ? [weekId, legacyId] : [weekId];
  }

  const starts = getLegacyWeekStarts(weekId);
  return starts.length === 1 ? [starts[0], weekId] : [weekId];
}

export function selectWeekRecord<T extends { weekId: string }>(records: T[], keys: string[]): T | null {
  const primary = records.find(record => record.weekId === keys[0]);
  if (primary) return primary;

  const legacy = records.filter(record => record.weekId === keys[1]);
  return legacy.length === 1 ? legacy[0] : null;
}
