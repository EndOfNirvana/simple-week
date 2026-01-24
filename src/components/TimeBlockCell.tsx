import { useState, useRef, useEffect } from 'react';
import { Task, TimeBlock } from '@/lib/types';
import { TaskItem } from './TaskItem';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeBlockCellProps {
  date: string;
  timeBlock: TimeBlock;
  tasks: Task[];
  onAddTask: (content: string, date: string, timeBlock: TimeBlock) => void;
  onUpdateTask: (id: number, content: string) => void;
  onToggleTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
}

export function TimeBlockCell({ 
  date, 
  timeBlock, 
  tasks, 
  onAddTask, 
  onUpdateTask, 
  onToggleTask, 
  onDeleteTask 
}: TimeBlockCellProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAdd = () => {
    if (newValue.trim()) {
      onAddTask(newValue.trim(), date, timeBlock);
      setNewValue('');
      // Keep adding mode if needed, or close it. 
      // For efficiency, let's keep focus to add multiple tasks
      inputRef.current?.focus();
    } else {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      setNewValue('');
      setIsAdding(false);
    }
  };

  // Filter tasks for this specific block
  const blockTasks = tasks.filter(t => t.timeBlock === timeBlock);

  return (
    <div 
      ref={containerRef}
      className="h-full min-h-[120px] p-2 hover:bg-accent/20 transition-colors relative group flex flex-col overflow-hidden"
      onClick={(e) => {
        // Only trigger add if clicking empty space
        if (e.target === containerRef.current) {
          setIsAdding(true);
        }
      }}
    >
      <div className="flex-1 space-y-1">
        {blockTasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggleTask}
            onDelete={onDeleteTask}
            onUpdate={onUpdateTask}
          />
        ))}
        
        {isAdding ? (
          <div className="flex items-center gap-2 p-1 -ml-1 animate-in fade-in duration-200">
            <div className="h-4 w-4 border border-dashed border-muted-foreground/50 shrink-0" />
            <input
              ref={inputRef}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onBlur={handleAdd}
              onKeyDown={handleKeyDown}
              placeholder="输入任务..."
              className="flex-1 bg-transparent border-b border-primary outline-none text-sm"
            />
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className={cn(
              "w-full text-left text-xs text-muted-foreground/50 hover:text-primary py-1 px-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all",
              blockTasks.length === 0 && "opacity-100 text-muted-foreground/30"
            )}
          >
            <Plus className="h-3 w-3" /> 添加任务
          </button>
        )}
      </div>
    </div>
  );
}
