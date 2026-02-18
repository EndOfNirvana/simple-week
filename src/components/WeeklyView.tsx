import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay,
  DragStartEvent,
  closestCenter,
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
import { DroppableTimeBlock } from './DroppableTimeBlock';
import { YearWeekPicker } from './YearWeekPicker';
import { CustomContentArea } from './CustomContentArea';
import { ChevronLeft, ChevronRight, Loader2, Image as ImageIcon, BookOpen, CalendarDays } from 'lucide-react';
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

export function WeeklyView() {
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
    columnWidths,
    updateColumnWidth,
    customText,
    customImageUrl,
    updateCustomText,
    uploadCustomImage,
    clearCustomImage,
    isUploadingImage,
  } = usePlannerStore(currentDate);

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
  }, [note]);

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

    if (!over) return;

    const taskId = active.id as number;
    const overId = over.id as string;
    
    // Parse the droppable ID (format: "YYYY-MM-DD-timeBlock")
    const parts = overId.split('-');
    if (parts.length >= 4) {
      const newDate = parts.slice(0, 3).join('-');
      const newTimeBlock = parts[3] as TimeBlock;
      
      const task = tasks.find(t => t.id === taskId);
      if (task && (task.date !== newDate || task.timeBlock !== newTimeBlock)) {
        moveTask(taskId, newDate, newTimeBlock);
      }
    }
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
      // 临时隐藏不需要导出的元素
      const buttonsToHide = exportContainerRef.current.querySelectorAll('[data-export-hide]');
      buttonsToHide.forEach(el => (el as HTMLElement).style.visibility = 'hidden');
      
      const dataUrl = await toPng(exportContainerRef.current, {
        backgroundColor: '#ffffff',
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
      
      // 恢复隐藏的元素
      buttonsToHide.forEach(el => (el as HTMLElement).style.visibility = 'visible');
      
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

  return (
    <>
    <div ref={exportContainerRef} className="flex flex-col h-screen max-h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Header */}
      <header className={cn(
        "flex items-center justify-between border-b border-border bg-background z-10",
        isMobile ? "px-3 py-2 flex-wrap gap-2" : "px-6 py-4"
      )}>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setShowYearPicker(true)}
            className={cn(
              "font-bold tracking-tight text-primary hover:text-primary/80 transition-colors cursor-pointer",
              isMobile ? "text-lg" : "text-2xl"
            )}
          >
            {formatWeekDisplay(currentDate)}
          </button>
          <span className={cn(
            "text-muted-foreground font-medium",
            isMobile ? "text-xs" : "text-sm"
          )}>
            {format(weekDays[0], 'yyyy.MM.dd')} - {format(weekDays[6], 'MM.dd')}
          </span>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        
        {/* Custom content area - Desktop: in header, Mobile: replaces export button */}
        {!isMobile && (
          <div className="flex-1 mx-4 h-10">
            <CustomContentArea
              customText={customText}
              customImageUrl={customImageUrl}
              onUpdateText={updateCustomText}
              onUploadImage={uploadCustomImage}
              onClearImage={clearCustomImage}
              isUploading={isUploadingImage}
              className="h-full border border-transparent hover:border-border rounded-md px-3"
            />
          </div>
        )}
        
        {/* Mobile: Custom content area - takes remaining space */}
        {isMobile && (
          <div className="flex-1 h-8 mx-2">
            <CustomContentArea
              customText={customText}
              customImageUrl={customImageUrl}
              onUpdateText={updateCustomText}
              onUploadImage={uploadCustomImage}
              onClearImage={clearCustomImage}
              isUploading={isUploadingImage}
              className="h-full border border-dashed border-border/50 rounded px-2"
              isMobile={true}
            />
          </div>
        )}
        
        <div className="flex items-center gap-1 md:gap-2 mr-12" data-export-hide>
          {/* Desktop: View toggle button */}
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(prev => prev === 'planner' ? 'summary' : 'planner')}
              className="gap-2"
            >
              {viewMode === 'planner' ? (
                <><BookOpen className="h-4 w-4" />周总结</>
              ) : (
                <><CalendarDays className="h-4 w-4" />周计划</>
              )}
            </Button>
          )}
          {/* Desktop: Export button - only show in planner mode */}
          {!isMobile && viewMode === 'planner' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportImage}
              className="gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              导出图片
            </Button>
          )}
          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "sm"} 
            onClick={scrollToToday}
            className={isMobile ? "text-xs px-2" : ""}
          >
            今天
          </Button>
          <Button variant="ghost" size="icon" onClick={handlePrevWeek} className={isMobile ? "h-8 w-8" : ""}>
            <ChevronLeft className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNextWeek} className={isMobile ? "h-8 w-8" : ""}>
            <ChevronRight className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
          </Button>
        </div>
      </header>

      {/* Main Content - conditionally render planner or summary */}
      {viewMode === 'summary' ? (
        <WeeklySummaryView currentDate={currentDate} />
      ) : (
      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        <div 
          ref={plannerRef} 
          className="h-full flex flex-col bg-background" 
          style={{ 
            minWidth: isMobile 
              ? mobileTimeLabelWidth + totalDaysWidth 
              : TIME_LABEL_WIDTH + totalDaysWidth + NOTES_WIDTH 
          }}
        >
          {/* Days Header */}
          <div className="flex border-b border-border sticky top-0 bg-background z-10">
            {/* Corner */}
            <div 
              className="p-2 md:p-4 border-r border-border bg-secondary/30 shrink-0"
              style={{ width: isMobile ? mobileTimeLabelWidth : TIME_LABEL_WIDTH }}
            />
            
            {/* Day columns */}
            {weekDays.map((day, index) => {
              const width = isMobile ? mobileColumnWidth : (localColumnWidths[index] || 130);
              const isTodayColumn = isToday(day);
              return (
                <div 
                  key={day.toString()} 
                  className={cn(
                    "relative p-2 md:p-3 text-center border-r border-border shrink-0",
                    isTodayColumn && "bg-primary/5"
                  )}
                  style={{ width }}
                >
                  <div className={cn(
                    "text-xs md:text-sm font-medium", 
                    isTodayColumn ? "text-primary" : "text-muted-foreground"
                  )}>
                    {getDayLabel(day)}
                  </div>
                  <div className={cn(
                    "text-lg md:text-2xl font-bold mt-0.5 md:mt-1", 
                    isTodayColumn && "text-primary"
                  )}>
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
                className="p-3 text-center font-bold text-muted-foreground bg-secondary/10 shrink-0"
                style={{ width: NOTES_WIDTH }}
              >
                备注
              </div>
            )}
          </div>
          
          {/* Content Grid with DnD */}
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 flex h-full">
              
              {/* Left: Time Labels */}
              <div 
                className="grid grid-rows-3 divide-y divide-border bg-secondary/5 h-full border-r border-border shrink-0"
                style={{ width: isMobile ? mobileTimeLabelWidth : TIME_LABEL_WIDTH }}
              >
                <div className={cn(
                  "flex items-center justify-center font-medium text-muted-foreground",
                  isMobile ? "text-xs py-4" : "writing-vertical-lr py-8"
                )}>
                  上午
                </div>
                <div className={cn(
                  "flex items-center justify-center font-medium text-muted-foreground",
                  isMobile ? "text-xs py-4" : "writing-vertical-lr py-8"
                )}>
                  下午
                </div>
                <div className={cn(
                  "flex items-center justify-center font-medium text-muted-foreground",
                  isMobile ? "text-xs py-4" : "writing-vertical-lr py-8"
                )}>
                  晚上
                </div>
              </div>

              {/* Center: 7 Days x 3 TimeBlocks */}
              <div className="flex h-full">
                {weekDays.map((day, index) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayTasks = tasks.filter(t => t.date === dateStr);
                  const width = isMobile ? mobileColumnWidth : (localColumnWidths[index] || 130);
                  
                  return (
                    <div 
                      key={day.toString()} 
                      className={cn(
                        "relative grid grid-rows-3 divide-y divide-border h-full border-r border-border shrink-0",
                        isToday(day) && "bg-primary/5"
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
                  className="bg-secondary/5 shrink-0 cursor-text flex flex-col h-full"
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
                    className="w-full flex-1 p-4 bg-transparent resize-none outline-none text-sm leading-relaxed placeholder:text-muted-foreground/50 block min-h-0"
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
