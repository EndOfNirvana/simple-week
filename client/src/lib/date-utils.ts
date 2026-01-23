import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  addWeeks, 
  subWeeks, 
  getISOWeek, 
  getYear,
  isSameDay,
  parseISO,
  startOfToday
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const getWeekId = (date: Date): string => {
  const year = getYear(date);
  const week = getISOWeek(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

export const getWeekDays = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Week starts on Monday
  const end = endOfWeek(date, { weekStartsOn: 1 });
  
  return eachDayOfInterval({ start, end });
};

export const formatWeekDisplay = (date: Date): string => {
  const year = getYear(date);
  const week = getISOWeek(date);
  return `${year}年 第${week}周`;
};

export const formatDateDisplay = (date: Date): string => {
  return format(date, 'M.d EEEE', { locale: zhCN });
};

export const getNextWeek = (date: Date): Date => addWeeks(date, 1);
export const getPrevWeek = (date: Date): Date => subWeeks(date, 1);

export const isToday = (date: Date): boolean => isSameDay(date, new Date());

export const getDayLabel = (date: Date): string => format(date, 'EEEE', { locale: zhCN }); // e.g. 周一
export const getDateLabel = (date: Date): string => format(date, 'M.d'); // e.g. 1.19
