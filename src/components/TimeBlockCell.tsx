import { useState, useRef, useEffect } from 'react';
import { Task, TimeBlock } from '../lib/types';
import { TaskItem } from './TaskItem';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdding && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isAdding]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const handleAdd = () => {
    if (newValue.trim()) {
      onAddTask(newValue.trim(), date, timeBlock);
      setNewValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      textareaRef.current?.focus();
    } else {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter: insert newline
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = newValue.substring(0, start) + '\n' + newValue.substring(end);
      setNewValue(val);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 1;
          textareaRef.current.selectionEnd = start + 1;
          autoResize(textareaRef.current);
        }
      }, 0);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Enter alone: add task
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setNewValue('');
      setIsAdding(false);
    }
  };

  const blockTasks = tasks.filter(t => t.timeBlock === timeBlock);

  return (
    <div 
      ref={containerRef}
      className="h-full min-h-[120px] p-2 hover:bg-accent/20 transition-colors relative group flex flex-col overflow-hidden"
      onClick={(e) => {
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
          <div className="flex items-start gap-2 p-1 -ml-1 animate-in fade-in duration-200">
            <textarea
              ref={textareaRef}
              value={newValue}
              onChange={(e) => {
                setNewValue(e.target.value);
                autoResize(e.target);
              }}
              onBlur={handleAdd}
              onKeyDown={handleKeyDown}
              placeholder="输入任务... (Shift+Enter换行)"
              rows={1}
              className="flex-1 bg-transparent border-b border-primary outline-none text-sm resize-none overflow-hidden leading-tight"
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
