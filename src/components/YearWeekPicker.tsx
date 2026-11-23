import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { 
  getISOWeek, 
  getISOWeekYear,
  eachWeekOfInterval, 
  getMonth,
  startOfISOWeekYear,
  subWeeks
} from 'date-fns';

interface YearWeekPickerProps {
  currentDate: Date;
  onSelectWeek: (date: Date) => void;
  onClose: () => void;
}

interface WeekInfo {
  weekNumber: number;
  startDate: Date;
}

export function YearWeekPicker({ currentDate, onSelectWeek, onClose }: YearWeekPickerProps) {
  const [selectedYear, setSelectedYear] = useState(() => getISOWeekYear(currentDate));
  
  // 计算某一年的所有周，按月分组
  const weeksByMonth = useMemo(() => {
    const yearStart = startOfISOWeekYear(new Date(selectedYear, 0, 4));
    const nextYearStart = startOfISOWeekYear(new Date(selectedYear + 1, 0, 4));
    
    // 获取这一年的所有周的起始日期
    const allWeeks = eachWeekOfInterval(
      { start: yearStart, end: subWeeks(nextYearStart, 1) },
      { weekStartsOn: 1 }
    );
    
    // 按月分组
    const monthGroups: WeekInfo[][] = Array.from({ length: 12 }, () => []);
    
    for (const weekStart of allWeeks) {
      const month = weekStart.getFullYear() < selectedYear ? 0 : getMonth(weekStart);
      monthGroups[month].push({ weekNumber: getISOWeek(weekStart), startDate: weekStart });
    }
    
    return monthGroups;
  }, [selectedYear]);
  
  const handlePrevYear = useCallback(() => {
    setSelectedYear(y => y - 1);
  }, []);
  
  const handleNextYear = useCallback(() => {
    setSelectedYear(y => y + 1);
  }, []);
  
  const handleSelectWeek = useCallback((weekStart: Date) => {
    onSelectWeek(weekStart);
    onClose();
  }, [onSelectWeek, onClose]);
  
  const currentWeekNumber = getISOWeek(currentDate);
  const currentYear = getISOWeekYear(currentDate);
  
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  
  return (
    <div className="week-workspace fixed inset-0 z-50 flex items-center justify-center bg-foreground/35" onClick={onClose}>
      <div 
        className="mx-4 max-h-[80dvh] w-full max-w-2xl overflow-hidden rounded-2xl border bg-card text-foreground shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="选择周"
        onKeyDown={event => { if (event.key === 'Escape') onClose(); }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Button autoFocus variant="ghost" size="icon" aria-label="上一年" onClick={handlePrevYear}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-primary">{selectedYear}年</h2>
            <Button variant="ghost" size="icon" aria-label="下一年" onClick={handleNextYear}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" aria-label="关闭" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Week Grid */}
        <div className="max-h-[calc(80dvh-80px)] overflow-y-auto p-4">
          <div className="space-y-2">
            {monthNames.map((monthName, monthIndex) => {
              const weeks = weeksByMonth[monthIndex];
              if (weeks.length === 0) return null;
              
              return (
                <div key={monthIndex} className="flex items-center gap-2">
                  <div className="w-12 text-sm font-medium text-muted-foreground shrink-0">
                    {monthName}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {weeks.map((week) => {
                      const isCurrentWeek = selectedYear === currentYear && week.weekNumber === currentWeekNumber;
                      
                      return (
                        <button
                          key={week.weekNumber}
                          aria-label={`${selectedYear}年第${week.weekNumber}周`}
                          onClick={() => handleSelectWeek(week.startDate)}
                          className={cn(
                            "size-9 rounded-lg text-sm font-medium tabular-nums transition-colors",
                            "hover:bg-primary hover:text-primary-foreground",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                            isCurrentWeek 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-secondary/50 text-foreground"
                          )}
                        >
                          {week.weekNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
