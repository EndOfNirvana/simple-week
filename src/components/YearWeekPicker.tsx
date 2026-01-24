import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { 
  getISOWeek, 
  getYear, 
  startOfYear, 
  endOfYear, 
  eachWeekOfInterval, 
  getMonth,
  startOfWeek,
  addYears,
  subYears,
  isSameWeek
} from 'date-fns';

interface YearWeekPickerProps {
  currentDate: Date;
  onSelectWeek: (date: Date) => void;
  onClose: () => void;
}

interface WeekInfo {
  weekNumber: number;
  startDate: Date;
  month: number;
}

export function YearWeekPicker({ currentDate, onSelectWeek, onClose }: YearWeekPickerProps) {
  const [selectedYear, setSelectedYear] = useState(() => getYear(currentDate));
  
  // 计算某一年的所有周，按月分组
  const weeksByMonth = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
    
    // 获取这一年的所有周的起始日期
    const allWeeks = eachWeekOfInterval(
      { start: yearStart, end: yearEnd },
      { weekStartsOn: 1 }
    );
    
    // 按月分组
    const monthGroups: WeekInfo[][] = Array.from({ length: 12 }, () => []);
    
    allWeeks.forEach((weekStart) => {
      const weekYear = getYear(weekStart);
      // 只处理属于当前年份的周（ISO周可能跨年）
      const isoWeek = getISOWeek(weekStart);
      const isoYear = getYear(startOfWeek(weekStart, { weekStartsOn: 1 }));
      
      // 使用周一所在的月份来决定这周属于哪个月
      const month = getMonth(weekStart);
      
      // 确保这周属于选中的年份
      if (weekYear === selectedYear || (isoYear === selectedYear && month === 11)) {
        const weekInfo: WeekInfo = {
          weekNumber: isoWeek,
          startDate: weekStart,
          month: month
        };
        
        // 避免重复添加同一周
        const existingWeek = monthGroups[month].find(w => w.weekNumber === isoWeek);
        if (!existingWeek) {
          monthGroups[month].push(weekInfo);
        }
      }
    });
    
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
  const currentYear = getYear(currentDate);
  
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-background rounded-lg shadow-xl border border-border max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handlePrevYear}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-primary">{selectedYear}年</h2>
            <Button variant="ghost" size="icon" onClick={handleNextYear}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Week Grid */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
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
                          onClick={() => handleSelectWeek(week.startDate)}
                          className={cn(
                            "w-8 h-8 rounded-full text-sm font-medium transition-colors",
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
