import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Pencil, X } from 'lucide-react';

interface CustomContentAreaProps {
  customText: string | null;
  customImageUrl: string | null;
  onUpdateText: (text: string | null) => void;
  onClearImage: () => void;
  className?: string;
  isMobile?: boolean;
}

export function CustomContentArea({
  customText,
  customImageUrl,
  onUpdateText,
  onClearImage,
  className,
  isMobile = false,
}: CustomContentAreaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(customText || '');
  const [isHovering, setIsHovering] = useState(false);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditText(customText || '');
  }, [customText]);

  const handleClick = useCallback(() => {
    if (!customText && !customImageUrl && !isEditing) {
      setIsEditing(true);
      setTimeout(() => textInputRef.current?.focus(), 0);
    }
  }, [customText, customImageUrl, isEditing]);

  const handleTextBlur = useCallback(() => {
    setIsEditing(false);
    if (editText.trim() !== (customText || '')) {
      onUpdateText(editText.trim() || null);
    }
  }, [editText, customText, onUpdateText]);

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTextBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(customText || '');
    }
  }, [handleTextBlur, customText]);

  const handleClearContent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (customImageUrl) {
      onClearImage();
    }
    if (customText) {
      onUpdateText(null);
    }
  }, [customImageUrl, customText, onClearImage, onUpdateText]);

  const hasContent = customText || customImageUrl;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center cursor-pointer transition-all",
        !hasContent && !isEditing && "hover:bg-muted/30",
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {!hasContent && !isEditing && (
        <button type="button" onClick={handleClick} className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-1 text-xs font-medium text-muted-foreground hover:text-primary focus-visible:outline-2">
          <Pencil aria-hidden="true" className="size-3.5" />添加本周标题
        </button>
      )}

      {/* Editing state */}
      {isEditing && (
        <input
          ref={textInputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
          placeholder="输入文字..."
          aria-label="本周标题"
          className="min-h-8 w-full bg-transparent px-2 text-center text-sm outline-none"
        />
      )}

      {/* Display content */}
      {!isEditing && hasContent && (
        <div className="flex max-w-full items-center gap-2 overflow-hidden">
          {customImageUrl && (
            <img
              src={customImageUrl}
              alt="自定义内容"
              className="max-h-8 max-w-[120px] object-contain"
            />
          )}
          {customText && (
            <button type="button"
              className="min-w-0 cursor-text truncate rounded-sm text-sm font-medium focus-visible:outline-2"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setTimeout(() => textInputRef.current?.focus(), 0);
              }}
            >
              {customText}
            </button>
          )}
        </div>
      )}

      {!isEditing && hasContent && (
        <button type="button" onClick={handleClearContent} aria-label="清除自定义内容" title="清除自定义内容"
          className={cn('absolute left-1 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100', !isMobile && !isHovering && 'opacity-0')}>
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
