import { ChevronLeft, ChevronRight, Pause, Play, Send } from 'lucide-react';
import type { Lang } from '../types/yagi';
import { SIGNAL_COLORS, TIMELINE_DAYS } from '../utils/yagiLogic';

function getTimelineTagColor(date: string): string {
  if (date === '2024-09-07') return SIGNAL_COLORS.r3R50; // Landfall R3 wind
  if (date === '2024-09-08') return SIGNAL_COLORS.r1; // Rain R1
  if (date === '2024-09-11') return SIGNAL_COLORS.s1; // B5 River gauges
  if (date === '2024-09-12') return SIGNAL_COLORS.unosat; // UNOSAT peak
  return SIGNAL_COLORS.r2;
}

interface TimelineDockProps {
  lang: Lang;
  dayIdx: number;
  isPlaying: boolean;
  campaignLaunched: boolean;
  onChangeDay: (idx: number) => void;
  onTogglePlay: () => void;
  onLaunchCampaign: () => void;
}

export function TimelineDock({
  lang,
  dayIdx,
  isPlaying,
  campaignLaunched,
  onChangeDay,
  onTogglePlay,
  onLaunchCampaign,
}: TimelineDockProps) {
  const current = TIMELINE_DAYS[dayIdx] ?? TIMELINE_DAYS[0];
  const currentTag = lang === 'en' ? current.tagEn : current.tag;
  const currentSummary = lang === 'en' ? current.summaryEn : current.summary;
  const progressPct =
    TIMELINE_DAYS.length > 1 ? (dayIdx / (TIMELINE_DAYS.length - 1)) * 100 : 0;

  return (
    <section
      data-tour="timeline-dock"
      aria-label={lang === 'en' ? 'Typhoon Yagi Timeline' : 'Thanh mốc thời gian Bão Yagi'}
      className="border-t border-lineStrong bg-panel px-4 py-3 sm:px-5"
    >
      {/* Top 2-column control strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex flex-wrap items-center gap-3">
            {/* Prev / Play / Next controls */}
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChangeDay(Math.max(0, dayIdx - 1))}
                disabled={dayIdx === 0}
                title={lang === 'en' ? 'Previous day' : 'Ngày trước'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-lineStrong bg-canvas text-inkMuted transition-colors hover:border-inkDim hover:text-ink disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3 text-[12.5px] font-medium transition-colors ${
                  isPlaying
                    ? 'bg-[#8ACBB5] text-[#0E1F1A]'
                    : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" strokeWidth={1.85} />
                    <span>{lang === 'en' ? 'Pause' : 'Tạm dừng'}</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" strokeWidth={1.85} />
                    <span>{lang === 'en' ? 'Play Storm' : 'Phát dòng bão'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onChangeDay(Math.min(TIMELINE_DAYS.length - 1, dayIdx + 1))}
                disabled={dayIdx === TIMELINE_DAYS.length - 1}
                title={lang === 'en' ? 'Next day' : 'Ngày tiếp theo'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-lineStrong bg-canvas text-inkMuted transition-colors hover:border-inkDim hover:text-ink disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-[20px] font-semibold tracking-tight text-ink tabular-nums">
                {current.displayDate}
              </span>
              {currentTag && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-[4px] border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] font-medium text-ink"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: getTimelineTagColor(current.date) }}
                  />
                  <span>{currentTag}</span>
                </span>
              )}
            </div>
          </div>

          <p className="mt-1.5 text-[12.5px] leading-snug text-inkMuted">
            {currentSummary}
          </p>
        </div>

        {/* Compact-balanced Primary CTA (slightly taller than standard h-8 without dead bulk) */}
        <button
          type="button"
          onClick={onLaunchCampaign}
          disabled={campaignLaunched}
          className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[6px] px-5 text-[13px] font-semibold transition-colors sm:min-w-[236px] sm:self-center ${campaignLaunched
            ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
            : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
            }`}
        >
          <Send className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
          <span>
            {campaignLaunched
              ? lang === 'en'
                ? 'Regional Circular 29 offers sent'
                : 'Đã gửi giãn nợ TT 29 toàn vùng'
              : lang === 'en'
              ? 'Send regional deferral offers'
              : 'Gửi đề xuất giãn nợ toàn vùng'}
          </span>
        </button>
      </div>

      {/* Rich scrubber with #8ACBB5 elapsed fill + 10 clickable milestone date buttons */}
      <div className="mt-3 flex flex-col gap-2">
        <input
          type="range"
          min={0}
          max={TIMELINE_DAYS.length - 1}
          value={dayIdx}
          onChange={(e) => onChangeDay(Number(e.target.value))}
          aria-label={
            lang === 'en'
              ? 'Select Typhoon Yagi simulation date'
              : 'Chọn ngày mô phỏng bão Yagi'
          }
          style={{
            background: `linear-gradient(to right, #8ACBB5 0%, #8ACBB5 ${progressPct}%, #232B38 ${progressPct}%, #232B38 100%)`,
          }}
          className="timeline-slider"
        />

        <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
          {TIMELINE_DAYS.map((day, idx) => {
            const active = idx === dayIdx;
            const pastOrNow = idx <= dayIdx;
            const dayTag = lang === 'en' ? day.tagEn : day.tag;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onChangeDay(idx)}
                className={`flex flex-col items-center justify-center rounded-[4px] border px-1 py-1.5 transition-colors ${active
                  ? 'border-[#8ACBB5] bg-[#8ACBB5] text-[#0E1F1A]'
                  : pastOrNow
                    ? 'border-lineStrong bg-[#18202B] text-inkMuted hover:border-inkDim hover:text-ink'
                    : 'border-line bg-transparent text-inkDim hover:border-lineStrong hover:text-inkMuted'
                  }`}
              >
                <span
                  className={`font-mono text-[11.5px] tabular-nums ${
                    active ? 'font-bold text-[#0E1F1A]' : 'font-medium'
                  }`}
                >
                  {day.shortDate}
                </span>
                <span
                  style={
                    dayTag && !active
                      ? { color: getTimelineTagColor(day.date) }
                      : undefined
                  }
                  className={`mt-0.5 truncate text-[10px] leading-tight ${dayTag
                    ? active
                      ? 'font-semibold text-[#0E1F1A]/85'
                      : 'font-medium'
                    : 'text-transparent select-none'
                    }`}
                >
                  {dayTag ?? '·'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

