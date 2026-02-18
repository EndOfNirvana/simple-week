import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useRef, useEffect } from 'react';
import { Task } from '../lib/types';
import { Trash2 } from 'lucide-react';
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
      <div ref={setNodeRef} style={style} className="flex items-start gap-1.5 p-1 -ml-1">
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
          className="flex-1 bg-transparent border-b border-primary outline-none text-sm font-medium resize-none overflow-hidden leading-tight"
        />
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="group flex items-start gap-1.5 py-1 text-sm animate-in fade-in duration-200"
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
          "mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border transition-all cursor-grab active:cursor-grabbing",
          isCompleted
            ? "bg-primary border-primary"
            : "border-muted-foreground/40 hover:border-primary bg-transparent"
        )}
        title={isCompleted ? "点击取消完成" : "点击标记完成 | 拖动排序"}
      >
        {isCompleted && (
          <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        )}
      </button>
      
      <span 
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className={cn(
          "flex-1 cursor-text break-all whitespace-pre-wrap leading-tight transition-opacity min-w-0",
          isCompleted && "line-through text-muted-foreground opacity-60"
        )}
      >
        {task.content}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 p-0.5 rounded shrink-0"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
