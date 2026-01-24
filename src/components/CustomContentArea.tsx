import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomContentAreaProps {
  customText: string | null;
  customImageUrl: string | null;
  onUpdateText: (text: string | null) => void;
  onUploadImage: (file: File) => Promise<string>;
  onClearImage: () => void;
  isUploading: boolean;
  className?: string;
  isMobile?: boolean;
}

export function CustomContentArea({
  customText,
  customImageUrl,
  onUpdateText,
  onUploadImage,
  onClearImage,
  isUploading,
  className,
  isMobile = false,
}: CustomContentAreaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(customText || '');
  const [isHovering, setIsHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          try {
            await onUploadImage(file);
            toast.success('图片已上传');
          } catch {
            toast.error('图片上传失败');
          }
        }
        return;
      }
    }
  }, [onUploadImage]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await onUploadImage(file);
        toast.success('图片已上传');
      } catch {
        toast.error('图片上传失败');
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUploadImage]);

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
      onPaste={handlePaste}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state - show placeholder on hover */}
      {!hasContent && !isEditing && (
        <div className={cn(
          "text-xs text-muted-foreground/50 transition-opacity",
          isHovering ? "opacity-100" : "opacity-0"
        )}>
          {isMobile ? '点击添加内容' : '点击添加文字，粘贴添加图片'}
        </div>
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
          className="w-full h-full bg-transparent outline-none text-sm text-center px-2"
        />
      )}

      {/* Display content */}
      {!isEditing && hasContent && (
        <div className="relative flex items-center gap-2 max-w-full overflow-hidden">
          {customImageUrl && (
            <img
              src={customImageUrl}
              alt="自定义内容"
              className="max-h-8 max-w-[120px] object-contain"
            />
          )}
          {customText && (
            <span 
              className="text-sm text-foreground/80 truncate cursor-text"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setTimeout(() => textInputRef.current?.focus(), 0);
              }}
            >
              {customText}
            </span>
          )}
          
          {/* Clear button - show on hover */}
          {isHovering && (
            <button
              onClick={handleClearContent}
              className="absolute -right-1 -top-1 p-0.5 rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Add image button for mobile or when there's text but no image */}
      {!isEditing && !customImageUrl && (isHovering || isMobile) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className={cn(
            "absolute right-1 text-xs text-muted-foreground hover:text-foreground transition-colors",
            hasContent ? "top-1" : ""
          )}
        >
          {!hasContent && !isMobile && '+ 图片'}
        </button>
      )}
    </div>
  );
}
