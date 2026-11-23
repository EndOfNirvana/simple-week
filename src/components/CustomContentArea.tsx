import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface CustomContentAreaProps {
  customText: string | null;
  customImageUrl: string | null;
  onUpdateText: (text: string | null) => void;
  onClearImage: () => void;
  className?: string;
}

export function CustomContentArea({
  customText,
  customImageUrl,
  onUpdateText,
  onClearImage,
  className,
}: CustomContentAreaProps) {
  const [draft, setDraft] = useState<string | null>(null);

  function saveTitle() {
    const text = draft?.trim() ?? '';
    setDraft(null);
    if (text !== (customText ?? '')) onUpdateText(text || null);
  }

  return (
    <div className={cn('group relative flex min-h-9 items-center justify-center gap-2', className)}>
      {draft !== null ? (
        <input
          autoFocus
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') setDraft(null);
          }}
          placeholder="输入文字..."
          aria-label="本周标题"
          className="h-9 w-full min-w-0 rounded-lg border border-dashed border-primary/50 bg-transparent px-3 text-center text-sm outline-none"
        />
      ) : (
        <>
          {customImageUrl && <img src={customImageUrl} alt="自定义内容" className="max-h-8 max-w-[120px] object-contain" />}
          <button
            type="button"
            aria-label={customText ? undefined : '添加本周标题'}
            onClick={() => setDraft(customText ?? '')}
            className="min-w-0 flex-1 cursor-text self-stretch truncate rounded-lg px-3 text-center text-sm font-medium focus-visible:outline-2"
          >
            {customText}
          </button>
          {customImageUrl && (
            <button
              type="button"
              onClick={onClearImage}
              aria-label="移除旧图片"
              className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 group-hover:opacity-100"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
