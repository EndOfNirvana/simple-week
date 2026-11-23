import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useRef, useEffect } from 'react';
import { Task } from '../lib/types';
import { Check, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface DraggableTaskItemProps {
  task: Task;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, content: string) => void;
}

export function DraggableTaskItem({ task, onToggle, onDelete, onUpdate }: DraggableTaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
      autoResize(textareaRef.current);
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(task.content);
    }
  }, [task.content, isEditing]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(task.id, editValue.trim());
    } else {
      onDelete(task.id);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter: insert newline
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = editValue.substring(0, start) + '\n' + editValue.substring(end);
      setEditValue(newValue);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 1;
          textareaRef.current.selectionEnd = start + 1;
          autoResize(textareaRef.current);
        }
      }, 0);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Enter alone: save
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(task.content);
      setIsEditing(false);
    }
  };

  const isCompleted = task.completed;

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="flex rounded-lg border border-primary/40 bg-card px-2 py-1.5 shadow-xs">
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            autoResize(e.target);
          }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          rows={1}
          aria-label="编辑任务"
          className="w-full min-w-0 resize-none overflow-hidden bg-transparent text-sm leading-relaxed outline-none"
        />
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn('group/task flex items-start gap-1.5 rounded-lg border px-1.5 py-2 text-sm transition-colors', isCompleted ? 'border-border/80 bg-secondary/45' : 'border-primary/15 bg-accent/70 hover:bg-accent')}
    >
      {/* Drag handle: the dot indicator area */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        className={cn(
          "mt-0.5 flex size-4 shrink-0 touch-none cursor-grab items-center justify-center rounded-full border transition-colors focus-visible:outline-2 active:cursor-grabbing",
          isCompleted
            ? "bg-primary border-primary"
            : "border-primary/55 hover:border-primary bg-card"
        )}
        title={isCompleted ? "点击取消完成" : "点击标记完成 | 拖动排序"}
        aria-label={isCompleted ? '取消完成' : '标记完成'}
        aria-pressed={isCompleted}
      >
        {isCompleted && (
          <Check aria-hidden="true" className="size-2.5 text-primary-foreground" />
        )}
      </button>
      
      <button type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className={cn(
          "min-w-0 flex-1 cursor-text whitespace-pre-wrap text-left text-[13px] leading-5 [overflow-wrap:anywhere] focus-visible:outline-2 md:text-sm",
          isCompleted && "text-muted-foreground line-through"
        )}
      >
        {task.content}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        aria-label="删除任务"
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 group-hover/task:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
