import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSummaryStore } from '../hooks/useSummaryStore';
import { getWeekDays, formatWeekDisplay, getDayLabel, getDateLabel } from '../lib/date-utils';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Loader2, FileDown } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface WeeklySummaryViewProps {
  currentDate: Date;
}

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function WeeklySummaryView({ currentDate }: WeeklySummaryViewProps) {
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  
  const {
    keyword,
    dailyEntries,
    reflection,
    isLoading,
    updateKeyword,
    updateDailyEntry,
    updateReflection,
  } = useSummaryStore(currentDate);

  // Local state for controlled inputs
  const [localKeyword, setLocalKeyword] = useState(keyword);
  const [localDailyEntries, setLocalDailyEntries] = useState<Record<string, string>>({});
  const [localReflection, setLocalReflection] = useState(reflection);

  // Sync from server data
  useEffect(() => {
    setLocalKeyword(keyword);
  }, [keyword]);

  useEffect(() => {
    setLocalDailyEntries(dailyEntries);
  }, [dailyEntries]);

  useEffect(() => {
    setLocalReflection(reflection);
  }, [reflection]);

  // Handlers with auto-save on change
  const handleKeywordChange = useCallback((value: string) => {
    setLocalKeyword(value);
    updateKeyword(value || null);
  }, [updateKeyword]);

  const handleDailyEntryChange = useCallback((dayIndex: number, value: string) => {
    setLocalDailyEntries(prev => ({ ...prev, [dayIndex.toString()]: value }));
    updateDailyEntry(dayIndex, value);
  }, [updateDailyEntry]);

  const handleReflectionChange = useCallback((value: string) => {
    setLocalReflection(value);
    updateReflection(value || null);
  }, [updateReflection]);

  // Build title string: "2026.2.9-2026.2.15 第七周_关键词"
  const weekTitle = useMemo(() => {
    const startStr = format(weekDays[0], 'yyyy.M.d');
    const endStr = format(weekDays[6], 'yyyy.M.d');
    const weekDisplay = formatWeekDisplay(currentDate);
    // Extract week number from "2026年 第7周" -> "第7周"
    const weekNum = weekDisplay.replace(/^\d+年\s*/, '');
    const kw = localKeyword ? `_${localKeyword}` : '';
    return `${startStr}-${endStr}${weekNum}${kw}`;
  }, [weekDays, currentDate, localKeyword]);

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
        const content = localDailyEntries[i.toString()] || '';
        
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
      if (localReflection) {
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

        const reflectionLines = localReflection.split('\n');
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
  }, [weekTitle, weekDays, localDailyEntries, localReflection]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Title with keyword */}
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-foreground shrink-0">
            {format(weekDays[0], 'yyyy.M.d')}-{format(weekDays[6], 'yyyy.M.d')} {formatWeekDisplay(currentDate).replace(/^\d+年\s*/, '')}
          </div>
          <span className="text-muted-foreground shrink-0">_</span>
          <input
            type="text"
            value={localKeyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            placeholder="本周关键词（如：大爷去世）"
            className="flex-1 text-lg font-semibold bg-transparent border-b border-dashed border-border focus:border-primary outline-none px-1 py-0.5 text-foreground placeholder:text-muted-foreground/40"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportWord}
            className="gap-2 shrink-0"
          >
            <FileDown className="h-4 w-4" />
            导出Word
          </Button>
        </div>

        {/* Daily entries */}
        <div className="space-y-4">
          {weekDays.map((day, index) => {
            const dateStr = `${day.getMonth() + 1}.${day.getDate()}`;
            const dayLabel = DAY_LABELS[index];
            const content = localDailyEntries[index.toString()] || '';

            return (
              <div key={index} className="group">
                <div className="flex items-start gap-3">
                  {/* Day label */}
                  <div className="shrink-0 w-24 pt-2">
                    <span className="text-sm font-bold text-primary">
                      {dateStr}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground ml-1">
                      {dayLabel}
                    </span>
                  </div>
                  {/* Content textarea */}
                  <div className="flex-1">
                    <textarea
                      value={content}
                      onChange={(e) => handleDailyEntryChange(index, e.target.value)}
                      placeholder={`${dayLabel}的记录...`}
                      className={cn(
                        "w-full bg-transparent resize-none outline-none text-sm leading-relaxed",
                        "border border-transparent rounded-md p-2",
                        "hover:border-border focus:border-primary/50 transition-colors",
                        "placeholder:text-muted-foreground/30",
                        "min-h-[40px]"
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
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Weekly reflection */}
        <div>
          <div className="text-sm font-bold text-primary mb-2">周总结</div>
          <textarea
            value={localReflection}
            onChange={(e) => handleReflectionChange(e.target.value)}
            placeholder="写下本周的总结和感悟..."
            className={cn(
              "w-full bg-transparent resize-none outline-none text-sm leading-relaxed",
              "border border-dashed border-border rounded-md p-3",
              "hover:border-primary/30 focus:border-primary/50 transition-colors",
              "placeholder:text-muted-foreground/30",
              "min-h-[120px]"
            )}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.max(120, target.scrollHeight) + 'px';
            }}
            ref={(el) => {
              if (el && localReflection) {
                el.style.height = 'auto';
                el.style.height = Math.max(120, el.scrollHeight) + 'px';
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
