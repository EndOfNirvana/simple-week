import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResizableColumnProps {
  children: React.ReactNode;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  onWidthChange: (width: number) => void;
  className?: string;
  isLast?: boolean;
}

export function ResizableColumn({
  children,
  width,
  minWidth = 80,
  maxWidth = 400,
  onWidthChange,
  className,
  isLast = false,
}: ResizableColumnProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const diff = e.clientX - startXRef.current;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + diff));
    onWidthChange(newWidth);
  }, [isResizing, minWidth, maxWidth, onWidthChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div 
      className={cn("relative", className)}
      style={{ width: `${width}px`, minWidth: `${width}px`, flexShrink: 0 }}
    >
      {children}
      
      {/* Resize handle */}
      {!isLast && (
        <div
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize z-20 group",
            "hover:bg-primary/30 transition-colors",
            isResizing && "bg-primary/50"
          )}
          onMouseDown={handleMouseDown}
        >
          {/* Visual indicator */}
          <div className={cn(
            "absolute top-1/2 right-0 -translate-y-1/2 w-1 h-8 rounded-full",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "bg-primary/50",
            isResizing && "opacity-100"
          )} />
        </div>
      )}
    </div>
  );
}
