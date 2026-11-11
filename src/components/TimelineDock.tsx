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

  return (
    <section
      aria-label="Thanh mốc thời gian Bão Yagi"
      className="border-t border-line bg-panel px-4 py-3 sm:px-5"
    >
      {/* Top control & status strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Minimal grouped playback controls */}
          <div className="inline-flex items-center rounded-[4px] border border-line bg-canvas p-0.5">
            <button
              type="button"
              onClick={() => onChangeDay(Math.max(0, dayIdx - 1))}
              disabled={dayIdx === 0}
              title="Ngày trước"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] text-inkMuted transition-colors hover:bg-panelAlt hover:text-ink disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              className={`inline-flex h-7 items-center gap-1.5 rounded-[3px] px-2.5 text-[12px] font-medium transition-colors ${
                isPlaying
                  ? 'bg-panelAlt text-ink'
                  : 'text-inkMuted hover:bg-panelAlt hover:text-ink'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Phát dòng bão</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onChangeDay(Math.min(TIMELINE_DAYS.length - 1, dayIdx + 1))}
              disabled={dayIdx === TIMELINE_DAYS.length - 1}
              title="Ngày tiếp theo"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] text-inkMuted transition-colors hover:bg-panelAlt hover:text-ink disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-[20px] font-semibold tracking-tight text-ink tabular-nums">
              {current.displayDate}
            </span>
            {current.tag && (
              <span className="rounded-[4px] bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] font-medium text-inkMuted">
                {current.tag}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onLaunchCampaign}
          disabled={campaignLaunched}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] px-3.5 text-[12.5px] font-medium transition-colors ${
            campaignLaunched
              ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
              : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
          }`}
        >
          <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>
            {campaignLaunched
              ? 'Đã phát đề xuất TT 29 toàn vùng'
              : 'Phát đề xuất 1-Chạm toàn vùng'}
          </span>
        </button>
      </div>

      <p className="mt-2 text-[12.5px] text-inkMuted">{current.summary}</p>

      {/* Rich scrubber + 10 clickable milestone date buttons */}
      <div className="mt-3 flex flex-col gap-2">
        <input
          type="range"
          min={0}
          max={TIMELINE_DAYS.length - 1}
          value={dayIdx}
          onChange={(e) => onChangeDay(Number(e.target.value))}
          aria-label="Chọn ngày mô phỏng bão Yagi"
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
                className={`flex flex-col items-center justify-center rounded-[5px] border px-1 py-1.5 transition-colors ${
                  active
                    ? 'border-white/[0.14] bg-[#222938] text-ink'
                    : pastOrNow
                    ? 'border-line bg-[#141922] text-inkMuted hover:border-white/[0.1] hover:text-ink'
                    : 'border-transparent bg-transparent text-inkDim hover:border-line hover:text-inkMuted'
                }`}
              >
                <span className="font-mono text-[11.5px] font-medium tabular-nums">
                  {day.shortDate}
                </span>
                <span
                  className={`mt-0.5 truncate text-[10px] leading-tight ${
                    day.tag
                      ? active
                        ? 'font-medium text-ink'
                        : 'text-inkMuted'
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

