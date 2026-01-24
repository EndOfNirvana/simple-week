import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useRef, useEffect } from 'react';
import { Task } from '../lib/types';
import { Check, Trash2, GripVertical } from 'lucide-react';
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
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
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
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(task.id, editValue.trim());
    } else {
      onDelete(task.id);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(task.content);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-1 -ml-1">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-b border-primary outline-none text-sm font-medium"
        />
      </div>
    );
  }

  const isCompleted = task.completed === 1;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="group flex items-start gap-1 py-1 text-sm animate-in fade-in duration-200"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border transition-colors hover:bg-accent",
          isCompleted 
            ? "bg-primary border-primary text-primary-foreground" 
            : "border-input bg-transparent"
        )}
      >
        {isCompleted && <Check className="h-3 w-3" />}
      </button>
      
      <span 
        onClick={() => setIsEditing(true)}
        className={cn(
          "flex-1 cursor-text break-all whitespace-pre-wrap leading-tight transition-opacity min-w-0",
          isCompleted && "line-through text-muted-foreground opacity-60"
        )}
      >
        {task.content}
      </span>

      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 p-0.5 rounded"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
