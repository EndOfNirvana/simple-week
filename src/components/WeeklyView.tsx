import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay,
  DragStartEvent,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { 
  getWeekDays, 
  formatWeekDisplay, 
  getDayLabel, 
  getDateLabel, 
  getNextWeek, 
  getPrevWeek, 
  isToday
} from '../lib/date-utils';
import { usePlannerStore } from '../hooks/usePlannerStore';
import { useSummaryStore } from '../hooks/useSummaryStore';
import { DroppableTimeBlock } from './DroppableTimeBlock';
import { YearWeekPicker } from './YearWeekPicker';
import { CustomContentArea } from './CustomContentArea';
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Download, BookOpen, CalendarDays, Moon, NotebookPen, Sun, Sunset } from 'lucide-react';
import { WeeklySummaryView } from './WeeklySummaryView';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Task, TimeBlock } from '../lib/types';

// Default widths
const TIME_LABEL_WIDTH = 80;
const NOTES_WIDTH = 200;
const MIN_COLUMN_WIDTH = 80;
const MAX_COLUMN_WIDTH = 400;

// Mobile breakpoint
const MOBILE_BREAKPOINT = 768;
const TIME_LABELS = [
  { icon: Sun, label: '上午' },
  { icon: Sunset, label: '下午' },
  { icon: Moon, label: '晚上' },
];

export function WeeklyView({ accountMenu }: { accountMenu?: React.ReactNode }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localColumnWidths, setLocalColumnWidths] = useState<Record<number, number>>({});
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [viewMode, setViewMode] = useState<'planner' | 'summary'>('planner');
  const plannerRef = useRef<HTMLDivElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  
  const { 
    tasks, 
    note,
    isLoading,
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
  } = usePlannerStore(currentDate);
  const summary = useSummaryStore(weekId, viewMode === 'summary');

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync local widths with server widths
  useEffect(() => {
    setLocalColumnWidths(columnWidths);
  }, [columnWidths]);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Find today's index in the week
  const todayIndex = useMemo(() => {
    const today = new Date();
    return weekDays.findIndex(day => 
      day.getDate() === today.getDate() && 
      day.getMonth() === today.getMonth() && 
      day.getFullYear() === today.getFullYear()
    );
  }, [weekDays]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handlePrevWeek = () => setCurrentDate(prev => getPrevWeek(prev));
  const handleNextWeek = () => setCurrentDate(prev => getNextWeek(prev));
  
  // Scroll to today's column (centered) on mobile
  const scrollToToday = useCallback(() => {
    setCurrentDate(new Date());
    
    // Wait for the date to update, then scroll
    setTimeout(() => {
      if (!scrollContainerRef.current || !isMobile) return;
      
      const container = scrollContainerRef.current;
      const todayIdx = new Date().getDay();
      // Convert Sunday (0) to 6, others shift down by 1 (Monday = 0)
      const adjustedIndex = todayIdx === 0 ? 6 : todayIdx - 1;
      
      // Calculate scroll position to center today's column
      const columnWidth = isMobile ? 130 : (localColumnWidths[adjustedIndex] || 130);
      const timeLabelWidth = isMobile ? 50 : TIME_LABEL_WIDTH;
      const containerWidth = container.clientWidth;
      
      // Calculate the left position of today's column
      let leftPosition = timeLabelWidth;
      for (let i = 0; i < adjustedIndex; i++) {
        leftPosition += isMobile ? 130 : (localColumnWidths[i] || 130);
      }
      
      // Center the column
      const scrollLeft = leftPosition - (containerWidth / 2) + (columnWidth / 2);
      
      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      });
    }, 100);
  }, [isMobile, localColumnWidths]);

  // Note auto-save logic
  const [noteContent, setNoteContent] = useState(note?.content || '');
  
  useEffect(() => {
    setNoteContent(note?.content || '');
  }, [weekId, note?.content]);

  const handleNoteBlur = () => {
    if (noteContent !== (note?.content || '')) {
      updateNote(noteContent);
    }
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id || typeof active.id !== 'number' || active.id <= 0) return;
    const targetTask = typeof over.id === 'number' ? tasks.find(task => task.id === over.id) : undefined;
    const destination: { date: string; timeBlock: TimeBlock } | undefined =
      targetTask ?? over.data.current?.location;
    if (!destination || (targetTask && targetTask.id <= 0)) return;
    moveTask(active.id, destination.date, destination.timeBlock, targetTask?.id);
  };

  // Column resize handlers (desktop only)
  const handleResizeStart = useCallback((dayIndex: number, e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setResizingColumn(dayIndex);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = localColumnWidths[dayIndex] || 130;
  }, [localColumnWidths, isMobile]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (resizingColumn === null) return;
    
    const diff = e.clientX - resizeStartX.current;
    const newWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, resizeStartWidth.current + diff));
    
    setLocalColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth,
    }));
  }, [resizingColumn]);

  const handleResizeEnd = useCallback(() => {
    if (resizingColumn !== null) {
      const newWidth = localColumnWidths[resizingColumn];
      if (newWidth !== undefined) {
        updateColumnWidth(resizingColumn, newWidth);
      }
    }
    setResizingColumn(null);
  }, [resizingColumn, localColumnWidths, updateColumnWidth]);

  useEffect(() => {
    if (resizingColumn !== null) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingColumn, handleResizeMove, handleResizeEnd]);

  // Export to image (desktop only)
  const handleExportImage = useCallback(async () => {
    if (!exportContainerRef.current) return;
    
    toast.info('正在生成图片...');
    
    try {
      const dataUrl = await toPng(exportContainerRef.current, {
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
        },
        filter: (node) => {
          // 过滤掉带有 data-export-hide 属性的元素
          if (node instanceof HTMLElement && node.hasAttribute('data-export-hide')) {
            return false;
          }
          return true;
        }
      });
      
      const link = document.createElement('a');
      const weekTitle = formatWeekDisplay(currentDate);
      const startDate = `${weekDays[0].getMonth() + 1}.${weekDays[0].getDate()}`;
      const endDate = `${weekDays[6].getMonth() + 1}.${weekDays[6].getDate()}`;
      link.download = `${weekTitle}${startDate}-${endDate}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('图片已保存');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('导出失败，请重试');
    }
  }, [weekDays]);

  // Calculate total width for the days section
  const totalDaysWidth = useMemo(() => {
    if (isMobile) {
      return weekDays.length * 130; // Fixed width on mobile
    }
    return weekDays.reduce((sum, _, index) => sum + (localColumnWidths[index] || 130), 0);
  }, [weekDays, localColumnWidths, isMobile]);

  // Mobile-specific widths
  const mobileTimeLabelWidth = 50;
  const mobileColumnWidth = 130;
  const viewTabs = [
    { mode: 'planner', label: '周计划', icon: CalendarDays },
    { mode: 'summary', label: '周总结', icon: BookOpen },
  ] as const;

  return (
    <>
    <div ref={exportContainerRef} className="week-workspace flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b bg-card">
        <div className="week-container week-toolbar">
          <div className="week-brand flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><CalendarDays aria-hidden="true" className="size-4" /></span>
            <span className="text-[17px] font-bold tracking-wide">简周</span>
          </div>
          <div className="week-period">
            <h1>
              <button onClick={() => setShowYearPicker(true)} aria-label={`选择周，当前${formatWeekDisplay(currentDate)}`}
                className="flex items-center gap-1.5 rounded-lg text-left text-[16px] font-bold tracking-tight hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 sm:text-xl">
                {formatWeekDisplay(currentDate)} <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            </h1>
            <p className="flex items-center gap-1 whitespace-nowrap text-xs font-medium tabular-nums text-muted-foreground">
              {format(weekDays[0], 'yyyy.MM.dd')} — {format(weekDays[6], weekDays[0].getFullYear() === weekDays[6].getFullYear() ? 'MM.dd' : 'yyyy.MM.dd')}
              {isLoading && <Loader2 aria-label="正在加载" className="size-3 shrink-0 animate-spin" />}
            </p>
          </div>

          {viewMode === 'planner' && (
            <CustomContentArea
              key={weekId}
              customText={customText}
              customImageUrl={customImageUrl}
              onUpdateText={updateCustomText}
              onClearImage={clearCustomImage}
              className="week-custom-content min-h-9 rounded-lg border border-dashed bg-background/45 px-9"
              isMobile={isMobile}
            />
          )}

          <div className="week-controls flex items-center justify-end gap-2" data-export-hide>
            <div className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-xs">
              <Button variant="ghost" size="icon-sm" onClick={handlePrevWeek} aria-label="上一周"><ChevronLeft /></Button>
              <Button variant="ghost" size="sm" onClick={scrollToToday}>今天</Button>
              <Button variant="ghost" size="icon-sm" onClick={handleNextWeek} aria-label="下一周"><ChevronRight /></Button>
            </div>
            {!isMobile && viewMode === 'planner' && (
              <Button onClick={handleExportImage} className="h-9 rounded-lg"><Download />导出图片</Button>
            )}
          </div>
          <div className="week-view-switch flex items-center gap-2" data-export-hide>
            <nav aria-label="周视图" className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5 sm:gap-1 sm:p-1">
              {viewTabs.map(({ mode, label, icon: Icon }) => (
                <Button key={mode} variant="ghost" size="sm" aria-pressed={viewMode === mode}
                  className={cn('rounded-md px-2 text-muted-foreground sm:px-3', viewMode === mode && 'bg-card text-primary shadow-xs hover:bg-card hover:text-primary')}
                  onClick={() => setViewMode(mode)}>
                  <Icon aria-hidden="true" className="hidden size-4 sm:block" />{label}
                </Button>
              ))}
            </nav>
            {accountMenu && <div className="flex shrink-0 items-center">{accountMenu}</div>}
          </div>
        </div>
      </header>

      {/* Main Content - conditionally render planner or summary */}
      {viewMode === 'summary' ? (
        <WeeklySummaryView currentDate={currentDate} title={customText} onTitleChange={updateCustomText} summary={summary} />
      ) : (
      <main className="week-container flex min-h-0 flex-1 flex-col py-3 md:py-4">
      <div ref={scrollContainerRef} className="week-board flex-1 overflow-auto rounded-xl border bg-card">
        <div 
          ref={plannerRef} 
          className="flex h-full flex-col bg-card"
          style={{ 
            minWidth: isMobile 
              ? mobileTimeLabelWidth + totalDaysWidth 
              : TIME_LABEL_WIDTH + totalDaysWidth + NOTES_WIDTH 
          }}
        >
          {/* Days Header */}
          <div className="sticky top-0 z-10 flex shrink-0 border-b bg-card">
            {/* Corner */}
            <div 
              className="week-time-column grid shrink-0 place-items-center border-r bg-secondary/60 text-xs font-medium text-muted-foreground"
              style={{ width: isMobile ? mobileTimeLabelWidth : TIME_LABEL_WIDTH }}
            >时段</div>
            
            {/* Day columns */}
            {weekDays.map((day, index) => {
              const width = isMobile ? mobileColumnWidth : (localColumnWidths[index] || 130);
              const isTodayColumn = isToday(day);
              return (
                <div 
                  key={day.toString()} 
                  className={cn(
                    "relative min-w-0 shrink-0 border-r px-3 py-3 text-center md:grow",
                    isTodayColumn ? "bg-accent" : index > 4 && "bg-secondary/35"
                  )}
                  style={{ width }}
                >
                  <div className={cn(
                    "text-xs md:text-sm font-medium", 
                    isTodayColumn ? "text-primary" : "text-muted-foreground"
                  )}>
                    {getDayLabel(day)}
                  </div>
                  <div className={cn('mx-auto mt-1 inline-flex h-8 items-center rounded-full px-2.5 text-xl font-semibold tabular-nums leading-none md:text-[22px]', isTodayColumn && 'bg-primary text-primary-foreground')}>
                    {getDateLabel(day)}
                  </div>
                  
                  {/* Resize handle - desktop only */}
                  {!isMobile && (
                    <div
                      className={cn(
                        "absolute top-0 right-0 w-2 h-full cursor-col-resize z-20 group",
                        "hover:bg-primary/20 transition-colors",
                        resizingColumn === index && "bg-primary/30"
                      )}
                      onMouseDown={(e) => handleResizeStart(index, e)}
                    >
                      <div className={cn(
                        "absolute top-1/2 right-0 -translate-y-1/2 w-1 h-8 rounded-full",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "bg-primary/50",
                        resizingColumn === index && "opacity-100"
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Notes header - desktop only */}
            {!isMobile && (
              <div 
                className="flex shrink-0 items-center justify-center gap-2 bg-secondary/55 px-3 text-sm font-semibold text-primary"
                style={{ width: NOTES_WIDTH }}
              >
                <NotebookPen aria-hidden="true" className="size-4" />本周备注
              </div>
            )}
          </div>
          
          {/* Content Grid with DnD */}
          <DndContext 
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveTask(null)}
          >
            <div className="flex min-h-[390px] flex-1">
              
              {/* Left: Time Labels */}
              <div 
                className="week-time-column grid shrink-0 grid-rows-3 divide-y border-r bg-secondary/60"
                style={{ width: isMobile ? mobileTimeLabelWidth : TIME_LABEL_WIDTH }}
              >
                {TIME_LABELS.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center justify-center gap-2 text-xs font-medium text-muted-foreground md:text-sm">
                    <Icon aria-hidden="true" className="size-4 text-primary/75" />{label}
                  </div>
                ))}
              </div>

              {/* Center: 7 Days x 3 TimeBlocks */}
              <div className="flex min-w-0 flex-1">
                {weekDays.map((day, index) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayTasks = tasks.filter(t => t.date === dateStr);
                  const width = isMobile ? mobileColumnWidth : (localColumnWidths[index] || 130);
                  
                  return (
                    <div 
                      key={day.toString()} 
                      className={cn(
                        "relative grid min-w-0 shrink-0 grid-rows-3 divide-y border-r md:grow",
                        isToday(day) ? "bg-accent/45" : index > 4 && "bg-secondary/20"
                      )}
                      style={{ width }}
                    >
                      <DroppableTimeBlock 
                        date={dateStr}
                        timeBlock="morning"
                        tasks={dayTasks}
                        onAddTask={addTask}
                        onUpdateTask={updateTask}
                        onToggleTask={toggleTask}
                        onDeleteTask={deleteTask}
                      />
                      <DroppableTimeBlock 
                        date={dateStr}
                        timeBlock="afternoon"
                        tasks={dayTasks}
                        onAddTask={addTask}
                        onUpdateTask={updateTask}
                        onToggleTask={toggleTask}
                        onDeleteTask={deleteTask}
                      />
                      <DroppableTimeBlock 
                        date={dateStr}
                        timeBlock="evening"
                        tasks={dayTasks}
                        onAddTask={addTask}
                        onUpdateTask={updateTask}
                        onToggleTask={toggleTask}
                        onDeleteTask={deleteTask}
                      />
                      
                      {/* Resize handle for content area - desktop only */}
                      {!isMobile && (
                        <div
                          className={cn(
                            "absolute top-0 right-0 w-2 h-full cursor-col-resize z-20",
                            "hover:bg-primary/20 transition-colors",
                            resizingColumn === index && "bg-primary/30"
                          )}
                          onMouseDown={(e) => handleResizeStart(index, e)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right: Notes - desktop only */}
              {!isMobile && (
                <div 
                  className="flex shrink-0 cursor-text flex-col bg-secondary/30"
                  style={{ width: NOTES_WIDTH }}
                  onClick={(e) => {
                    // Click anywhere in the notes area to focus the textarea
                    const textarea = (e.currentTarget as HTMLDivElement).querySelector('textarea');
                    if (textarea) {
                      textarea.focus();
                    }
                  }}
                >
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    onBlur={handleNoteBlur}
                    placeholder="本周备注..."
                    aria-label="本周备注"
                    className="block min-h-0 w-full flex-1 resize-none bg-transparent p-4 text-sm leading-7 outline-none placeholder:text-muted-foreground focus:bg-card/50"
                  />
                </div>
              )}
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="bg-background border border-primary shadow-lg rounded px-2 py-1 text-sm">
                  {activeTask.content}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
      {isMobile && (
        <details key={weekId} className="mt-2 shrink-0 rounded-lg border bg-card" data-export-hide>
          <summary className="relative cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium text-primary focus-visible:outline-2">
            本周备注
            <span className="pointer-events-none absolute right-3 top-3 text-xs font-normal text-muted-foreground">左右滑动查看整周</span>
          </summary>
          <textarea
            value={noteContent}
            onChange={event => setNoteContent(event.target.value)}
            onBlur={handleNoteBlur}
            placeholder="本周备注..."
            aria-label="本周备注"
            rows={4}
            className="block w-full resize-none border-t bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:bg-secondary/25"
          />
        </details>
      )}
      </main>
      )}
    </div>
      
      {/* Year Week Picker Modal */}
      {showYearPicker && (
        <YearWeekPicker
          currentDate={currentDate}
          onSelectWeek={(date) => setCurrentDate(date)}
          onClose={() => setShowYearPicker(false)}
        />
      )}
    </>
  );
}
