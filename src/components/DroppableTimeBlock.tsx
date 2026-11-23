import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TimeBlock } from '../lib/types';
import { DraggableTaskItem } from './DraggableTaskItem';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface DroppableTimeBlockProps {
  date: string;
  timeBlock: TimeBlock;
  tasks: Task[];
  onAddTask: (content: string, date: string, timeBlock: TimeBlock) => void;
  onUpdateTask: (id: number, content: string) => void;
  onToggleTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
}

export function DroppableTimeBlock({ 
  date, 
  timeBlock, 
  tasks, 
  onAddTask, 
  onUpdateTask, 
  onToggleTask, 
  onDeleteTask 
}: DroppableTimeBlockProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const droppableId = `${date}-${timeBlock}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId, data: { location: { date, timeBlock } } });

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

  // Filter tasks for this specific block
  const blockTasks = tasks.filter(t => t.timeBlock === timeBlock);
  const taskIds = blockTasks.map(t => t.id);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "group/block relative flex min-h-0 flex-col overflow-auto p-1.5 transition-colors md:p-2",
        isOver ? "bg-primary/10" : "hover:bg-accent/25"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsAdding(true);
        }
      }}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-1.5" onClick={(event) => {
          if (event.target === event.currentTarget) setIsAdding(true);
        }}>
          {blockTasks.map(task => (
            <DraggableTaskItem
              key={task.id}
              task={task}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
              onUpdate={onUpdateTask}
            />
          ))}
          
          {isAdding ? (
            <div className="flex rounded-lg border border-primary/40 bg-card px-2 py-1.5 shadow-xs">
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
                aria-label="新任务"
                className="w-full min-w-0 resize-none overflow-hidden bg-transparent text-sm leading-relaxed outline-none"
              />
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className={cn(
                "flex min-h-7 w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-2",
                blockTasks.length > 0 && "[@media(hover:hover)]:opacity-0 group-hover/block:opacity-100 focus-visible:opacity-100"
              )}
            >
              <Plus className="h-3 w-3" /> 添加任务
            </button>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
