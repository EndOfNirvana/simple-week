import { useCallback, useMemo, type KeyboardEvent } from 'react';
import type { useSummaryStore } from '../hooks/useSummaryStore';
import { getWeekDays, formatWeekDisplay } from '../lib/date-utils';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Loader2, FileDown, NotebookPen, PenLine } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface WeeklySummaryViewProps {
  currentDate: Date;
  title: string;
  onTitleChange: (title: string) => void;
  summary: ReturnType<typeof useSummaryStore>;
}

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// Two full-width spaces for Chinese paragraph indentation
const INDENT = '\u3000\u3000';

/**
 * Handle Tab key in textarea: insert two full-width spaces (Chinese paragraph indent)
 */
function handleTabKey(e: KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const value = target.value;

    // Insert indent at cursor position
    const newValue = value.substring(0, start) + INDENT + value.substring(end);
    
    // We need to trigger the change through a native input event
    // so React's controlled component picks it up
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    nativeInputValueSetter?.call(target, newValue);
    
    // Fire input event so React onChange fires
    const inputEvent = new Event('input', { bubbles: true });
    target.dispatchEvent(inputEvent);
    
    // Restore cursor position after indent
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + INDENT.length;
    });
  }
}

export function WeeklySummaryView({ currentDate, title, onTitleChange, summary }: WeeklySummaryViewProps) {
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  
  const {
    dailyEntries,
    reflection,
    isLoading,
    loadFailed,
    retryLoad,
    saveStatus,
    retrySave,
    updateDailyEntry,
    updateReflection,
  } = summary;

  // Build title string: "2026.2.9-2026.2.15 第七周_关键词"
  const weekTitle = useMemo(() => {
    const startStr = format(weekDays[0], 'yyyy.M.d');
    const endStr = format(weekDays[6], 'yyyy.M.d');
    const weekDisplay = formatWeekDisplay(currentDate);
    // Extract week number from "2026年 第7周" -> "第7周"
    const weekNum = weekDisplay.replace(/^\d+年\s*/, '');
    const kw = title ? `_${title}` : '';
    return `${startStr}-${endStr}${weekNum}${kw}`;
  }, [weekDays, currentDate, title]);

  // Export to Word
  const handleExportWord = useCallback(async () => {
    toast.info('正在生成 Word 文档...');
    
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      
      const children: any[] = [];
      
      // Title
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: weekTitle,
              bold: true,
              size: 28, // 14pt
              font: 'Microsoft YaHei',
            }),
          ],
          spacing: { after: 200 },
        })
      );

      // Daily entries
      for (let i = 0; i < 7; i++) {
        const day = weekDays[i];
        const dateStr = `${day.getMonth() + 1}.${day.getDate()}`;
        const dayLabel = DAY_LABELS[i];
        const content = dailyEntries[i.toString()] || '';
        
        // Day header + content in one paragraph
        const dayHeaderText = `${dateStr} ${dayLabel}`;
        
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: dayHeaderText,
                bold: true,
                size: 24, // 12pt
                font: 'Microsoft YaHei',
              }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );

        if (content) {
          // Split content by newlines and create paragraphs
          const lines = content.split('\n');
          for (const line of lines) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 22, // 11pt
                    font: 'Microsoft YaHei',
                  }),
                ],
                spacing: { after: 60 },
              })
            );
          }
        }
      }

      // Reflection section
      if (reflection) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '',
              }),
            ],
            spacing: { before: 300 },
          })
        );

        const reflectionLines = reflection.split('\n');
        for (const line of reflectionLines) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: 22,
                  font: 'Microsoft YaHei',
                }),
              ],
              spacing: { after: 60 },
            })
          );
        }
      }

      const doc = new Document({
        sections: [{
          children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${weekTitle}.docx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Word 文档已保存');
    } catch (error) {
      console.error('Export Word failed:', error);
      toast.error('导出失败，请重试');
    }
  }, [weekTitle, weekDays, dailyEntries, reflection]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <main className="grid flex-1 place-content-center gap-3 text-center text-sm text-muted-foreground">
        <p role="alert">周总结加载失败</p>
        <Button variant="outline" onClick={retryLoad}>重新加载</Button>
      </main>
    );
  }

  return (
    <main className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-4xl space-y-4 px-3 pt-3 pb-6 sm:px-6 md:space-y-5 md:pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs sm:flex-nowrap sm:p-4">
          <label className="flex min-w-0 flex-1 items-center rounded-lg border bg-secondary/35 px-3 focus-within:border-primary/50 focus-within:bg-card">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="本周标题"
              aria-label="本周标题"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
          </label>
          {saveStatus !== 'idle' && (
            <div role="status" className={cn(
              'flex shrink-0 items-center gap-2 text-xs',
              saveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {saveStatus === 'error' ? (
                <>保存失败 <Button variant="outline" size="sm" onClick={retrySave}>重试</Button></>
              ) : (
                <><Loader2 aria-hidden="true" className="size-3.5 animate-spin" />正在保存</>
              )}
            </div>
          )}
          <Button onClick={handleExportWord} className="h-10 rounded-lg">
            <FileDown aria-hidden="true" className="size-4" />导出 Word
          </Button>
        </div>

        {/* Daily entries */}
        <section className="overflow-hidden rounded-xl border bg-card shadow-xs" aria-labelledby="daily-entries-title">
          <h2 id="daily-entries-title" className="flex items-center gap-2 border-b px-4 py-3.5 text-sm font-semibold sm:px-5">
            <NotebookPen aria-hidden="true" className="size-4 text-primary" />每日记录
          </h2>
          <div className="divide-y">
          {weekDays.map((day, index) => {
            const dateStr = `${day.getMonth() + 1}.${day.getDate()}`;
            const dayLabel = DAY_LABELS[index];
            const content = dailyEntries[index.toString()] || '';

            return (
              <div key={index} className="flex items-start gap-2 px-2 py-2.5 focus-within:bg-accent/35 sm:gap-3 sm:px-5">
                  <label htmlFor={`daily-entry-${index}`} className="flex w-[4.25rem] shrink-0 flex-col gap-0.5 py-1.5 pl-2 sm:w-24 sm:pl-0">
                    <span className="text-sm font-semibold tabular-nums text-primary">
                      {dateStr}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {dayLabel}
                    </span>
                  </label>
                  <div className="flex-1 min-w-0">
                    <textarea
                      id={`daily-entry-${index}`}
                      value={content}
                      onChange={(e) => updateDailyEntry(index, e.target.value)}
                      onKeyDown={handleTabKey}
                      placeholder={`${dayLabel}的记录...`}
                      className={cn(
                        "block min-h-11 w-full resize-none whitespace-pre-wrap rounded-lg border border-transparent bg-transparent px-2.5 py-2 text-sm leading-7 outline-none [overflow-wrap:anywhere]",
                        "transition-colors placeholder:text-muted-foreground/80 hover:border-border focus:border-primary/35 focus:bg-card"
                      )}
                      rows={1}
                      onInput={(e) => {
                        // Auto-resize textarea
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                      ref={(el) => {
                        // Set initial height
                        if (el && content) {
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                        }
                      }}
                    />
                  </div>
              </div>
            );
          })}
          </div>
        </section>

        {/* Weekly reflection */}
        <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
          <label htmlFor="weekly-reflection" className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <PenLine aria-hidden="true" className="size-4 text-primary" />周总结
          </label>
          <textarea
            id="weekly-reflection"
            value={reflection}
            onChange={(e) => updateReflection(e.target.value || null)}
            onKeyDown={handleTabKey}
            placeholder="写下本周的总结和感悟..."
            className={cn(
              "block min-h-[120px] w-full resize-none rounded-lg border bg-secondary/30 p-3 text-sm leading-7 outline-none",
              "transition-colors placeholder:text-muted-foreground hover:border-primary/30 focus:border-primary/50 focus:bg-card"
            )}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.max(120, target.scrollHeight) + 'px';
            }}
            ref={(el) => {
              if (el && reflection) {
                el.style.height = 'auto';
                el.style.height = Math.max(120, el.scrollHeight) + 'px';
              }
            }}
          />
        </section>
      </div>
    </main>
  );
}
