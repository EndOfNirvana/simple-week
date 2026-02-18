import { useState, useRef, useEffect } from 'react';
import { Task } from '../lib/types';
import { Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface TaskItemProps {
  task: Task;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, content: string) => void;
}

export function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (e.key === 'Enter' && e.ctrlKey) {
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
    } else if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(task.content);
      setIsEditing(false);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(task.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="flex items-start gap-2 p-1 -ml-1">
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

  const isCompleted = task.completed;

  return (
    <div className="group flex items-start gap-2 py-1 text-sm animate-in fade-in duration-200">
      <span 
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={cn(
          "flex-1 cursor-text break-all whitespace-pre-wrap leading-tight transition-opacity min-w-0 select-none",
          isCompleted && "line-through text-muted-foreground opacity-60"
        )}
      >
        {task.content}
      </span>

      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 p-0.5 rounded shrink-0"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
