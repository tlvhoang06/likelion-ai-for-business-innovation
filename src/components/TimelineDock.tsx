import { ChevronLeft, ChevronRight, Pause, Play, Send } from 'lucide-react';
import { TIMELINE_DAYS } from '../utils/yagiLogic';

interface TimelineDockProps {
  dayIdx: number;
  isPlaying: boolean;
  campaignLaunched: boolean;
  onChangeDay: (idx: number) => void;
  onTogglePlay: () => void;
  onLaunchCampaign: () => void;
}

export function TimelineDock({
  dayIdx,
  isPlaying,
  campaignLaunched,
  onChangeDay,
  onTogglePlay,
  onLaunchCampaign,
}: TimelineDockProps) {
  const current = TIMELINE_DAYS[dayIdx] ?? TIMELINE_DAYS[0];
  const progressPct =
    TIMELINE_DAYS.length > 1 ? (dayIdx / (TIMELINE_DAYS.length - 1)) * 100 : 0;

  return (
    <section
      aria-label="Thanh mốc thời gian Bão Yagi"
      className="border-t border-line bg-panel px-4 py-3 sm:px-5"
    >
      {/* Top 2-column control strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex flex-wrap items-center gap-3">
            {/* Prev / Mint-patterned Play / Next controls */}
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChangeDay(Math.max(0, dayIdx - 1))}
                disabled={dayIdx === 0}
                title="Ngày trước"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#3E4A5F] bg-[#161C26] text-inkMuted transition-colors hover:border-[#5B6B86] hover:text-ink disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className={`inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[12.5px] font-medium transition-colors ${
                  isPlaying
                    ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
                    : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" strokeWidth={1.85} />
                    <span>Tạm dừng</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" strokeWidth={1.85} />
                    <span>Phát dòng bão</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onChangeDay(Math.min(TIMELINE_DAYS.length - 1, dayIdx + 1))}
                disabled={dayIdx === TIMELINE_DAYS.length - 1}
                title="Ngày tiếp theo"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#3E4A5F] bg-[#161C26] text-inkMuted transition-colors hover:border-[#5B6B86] hover:text-ink disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-[20px] font-semibold tracking-tight text-ink tabular-nums">
                {current.displayDate}
              </span>
              {current.tag && (
                <span className="rounded-[4px] bg-white/[0.07] px-2 py-0.5 font-mono text-[11px] font-medium text-inkMuted">
                  {current.tag}
                </span>
              )}
            </div>
          </div>

          <p className="mt-1.5 text-[12.5px] leading-snug text-inkMuted">
            {current.summary}
          </p>
        </div>

        {/* Compact-balanced Primary CTA (slightly taller than standard h-8 without dead bulk) */}
        <button
          type="button"
          onClick={onLaunchCampaign}
          disabled={campaignLaunched}
          className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[6px] px-4.5 px-5 text-[13px] font-semibold transition-colors sm:min-w-[236px] sm:self-center ${campaignLaunched
            ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
            : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
            }`}
        >
          <Send className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
          <span>
            {campaignLaunched
              ? 'Đã phát đề xuất TT 29 toàn vùng'
              : 'Phát đề xuất 1-Chạm toàn vùng'}
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
          aria-label="Chọn ngày mô phỏng bão Yagi"
          style={{
            background: `linear-gradient(to right, #8ACBB5 0%, #8ACBB5 ${progressPct}%, #232B38 ${progressPct}%, #232B38 100%)`,
          }}
          className="timeline-slider"
        />

        <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
          {TIMELINE_DAYS.map((day, idx) => {
            const active = idx === dayIdx;
            const pastOrNow = idx <= dayIdx;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onChangeDay(idx)}
                className={`flex flex-col items-center justify-center rounded-[5px] border px-1 py-1.5 transition-colors ${active
                  ? 'border-[#8ACBB5]/70 bg-[#1B2B27] text-[#EDF8EF]'
                  : pastOrNow
                    ? 'border-[#8ACBB5]/25 bg-[#15201E] text-[#A8D5C5] hover:border-[#8ACBB5]/50 hover:text-[#EDF8EF]'
                    : 'border-line/70 bg-transparent text-inkDim hover:border-lineStrong hover:text-inkMuted'
                  }`}
              >
                <span className="font-mono text-[11.5px] font-medium tabular-nums">
                  {day.shortDate}
                </span>
                <span
                  className={`mt-0.5 truncate text-[10px] leading-tight ${day.tag
                    ? active
                      ? 'font-medium text-[#8ACBB5]'
                      : pastOrNow
                        ? 'text-[#8ACBB5]/80'
                        : 'text-inkDim'
                    : 'text-transparent select-none'
                    }`}
                >
                  {day.tag ?? '·'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

