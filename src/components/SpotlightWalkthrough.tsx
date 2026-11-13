import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { DrawerTab, Lang } from '../types/yagi';

export interface WalkthroughStep {
  id: string;
  targets: string[];
  titleVi: string;
  titleEn: string;
  bodyVi: string;
  bodyEn: string;
  drawerTab?: DrawerTab;
  preferredPlacement?: 'auto' | 'bottom-left-edge' | 'side-compact';
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'map',
    targets: ['map-desk'],
    titleVi: 'Bản đồ 12 tỉnh & từng lớp tín hiệu',
    titleEn: '12-Province Map & Signal Layers',
    bodyVi:
      'Lần lượt bật R1 Mưa (>200mm), R2 Lũ sông (>BĐ3, 215 xã), R3 Gió, vệ tinh UNOSAT 3966 và Radar Sentinel-1. Bấm trực tiếp từng thẻ trên bản đồ để tự phối hợp.',
    bodyEn:
      'Sequentially enables R1 Rain (>200mm), R2 River >AL3 (215 communes), R3 Wind, UNOSAT 3966, and Sentinel-1 SAR. Click any layer pill above to toggle directly.',
  },
  {
    id: 'drill',
    targets: ['map-desk', 'drawer-panel'],
    preferredPlacement: 'bottom-left-edge',
    drawerTab: 'bank',
    titleVi: 'Bấm vào địa bàn để xem thông số',
    titleEn: 'Select Any Area for Live Metrics',
    bodyVi:
      'Chọn 1 xã trên bản đồ (đang chọn Xã Vũ Xá, Bắc Giang) để mở ngay lượng mưa, gió, % ngập UNOSAT, số hộ vay và dự phòng 5%.',
    bodyEn:
      'Click any commune (focused on Vũ Xá, Bắc Giang) to inspect live rain, wind, UNOSAT flood %, loan count, and 5% provision.',
  },
  {
    id: 'timeline',
    targets: ['timeline-dock'],
    drawerTab: 'bank',
    titleVi: 'Diễn biến bão & Đề xuất toàn vùng',
    titleEn: 'Storm Timeline & Batch Proposal',
    bodyVi:
      'Bấm "Phát dòng bão" hoặc kéo qua 05/09 → 14/09/2024 để xem ngập theo ngày và gửi đề xuất giãn nợ theo TT 29/2025.',
    bodyEn:
      'Play Storm or scrub Sep 05–14, 2024 to track flood spread and dispatch regional Circular 29/2025 deferral offers.',
  },
  {
    id: 'deferral',
    targets: ['drawer-panel'],
    drawerTab: 'bank',
    titleVi: 'Giãn nợ nhanh & giữ Nhóm nợ 1',
    titleEn: 'Fast Deferral & Group 1 Retention',
    bodyVi:
      'Gửi thông báo App/SMS trong cửa sổ 10 ngày để hộ vay xác nhận giãn nợ 3–6 tháng, giúp ngân hàng tránh trích lập 5% dự phòng.',
    bodyEn:
      'Capture 1-tap App/SMS consent inside the 10-day window for 3–6 month deferral while keeping loans in Group 1.',
  },
  {
    id: 'ai',
    targets: ['drawer-panel'],
    drawerTab: 'ai',
    titleVi: 'Trợ lý Gemini: hỏi số liệu & nháp tờ trình',
    titleEn: 'Gemini Assistant: Q&A & Memo Drafts',
    bodyVi:
      'Hỏi nhanh về tỉnh rủi ro hay ca ngập đo mưa bỏ sót (đã lọc bên tab Ngoại lệ) và soạn tờ trình. Gắn Gemini Key tại Google AI Studio nếu cần.',
    bodyEn:
      'Ask grounded portfolio questions on missed floods filtered under Exceptions or draft review memos. Optionally connect your Google AI Studio key.',
  },
  {
    id: 'ubnd-brief',
    targets: ['drawer-panel'],
    drawerTab: 'ubnd',
    titleVi: 'Danh sách & Biên bản UBND Xã',
    titleEn: 'Commune List & Batch Attestation',
    bodyVi:
      'Hiện danh sách xã ngập trọng điểm rồi tự mở biên bản Xã Vũ Xá: 1 chữ ký UBND xác nhận chung cho toàn bộ 140 hộ vay.',
    bodyEn:
      'Lists flooded communes then opens Vũ Xá’s attestation brief: one signature validates all 140 loans without per-household forms.',
  },
  {
    id: 'legal',
    targets: ['legal-modal'],
    preferredPlacement: 'side-compact',
    titleVi: 'Kiểm chứng thực nghiệm & Pháp lý',
    titleEn: 'Empirical Audit & Legal Basis',
    bodyVi:
      'Tách biệt Cảnh báo sớm R1|R2|R3 (27,35% Prec / 91,23% Rec) và Hậu kiểm Sentinel-1 (63,46% / 79,11%) trước khi gửi đề xuất 1-Chạm, cùng căn cứ TT 29/2025, NĐ 86/2024, QĐ 18/2021 và NĐ 346/2026.',
    bodyEn:
      'Separates R1|R2|R3 early alert (27.35% Prec / 91.23% Rec) from post-event S1 confirmation (63.46% / 79.11%) before 1-Tap dispatch, mapped to Cir. 29/2025, Dec. 86/2024, and Dec. 18/2021.',
  },
];

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface HoleBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CardPos {
  top: number;
  left: number;
  width: number;
}

interface SpotlightWalkthroughProps {
  lang: Lang;
  open: boolean;
  stepIdx: number;
  steps?: WalkthroughStep[];
  onChangeStep: (idx: number) => void;
  onClose: () => void;
}

const TRANSITION_MS = 560;
const CARD_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

function toPaddedHole(r: RectBox, vw: number, vh: number, pad = 5): HoleBox {
  return {
    x: Math.max(4, r.left - pad),
    y: Math.max(4, r.top - pad),
    w: Math.min(vw - 8, r.width + pad * 2),
    h: Math.min(vh - 8, r.height + pad * 2),
  };
}

function computeCardPosition(
  step: WalkthroughStep,
  holes: HoleBox[],
  viewport: { w: number; h: number }
): CardPos {
  const estCardH = 236;
  let cardW = Math.min(356, viewport.w - 24);
  let cardLeft = Math.round((viewport.w - cardW) / 2);
  let cardTop = Math.round((viewport.h - estCardH) / 2);

  if (step.preferredPlacement === 'bottom-left-edge' && viewport.w >= 1024) {
    cardW = Math.min(356, viewport.w - 24);
    cardLeft = 152;
    cardTop = Math.max(16, viewport.h - estCardH - 16);
    return { top: cardTop, left: cardLeft, width: cardW };
  }

  const primaryHole = holes[0] ?? null;
  if (!primaryHole) {
    return { top: cardTop, left: cardLeft, width: cardW };
  }

  const spaceRight = viewport.w - (primaryHole.x + primaryHole.w);
  const spaceLeft = primaryHole.x;
  const spaceBelow = viewport.h - (primaryHole.y + primaryHole.h);
  const spaceAbove = primaryHole.y;

  if (step.preferredPlacement === 'side-compact' && spaceRight >= 288) {
    cardW = Math.min(316, spaceRight - 22);
    cardLeft = primaryHole.x + primaryHole.w + 12;
    cardTop = Math.min(
      Math.max(20, Math.round((viewport.h - estCardH) / 2)),
      viewport.h - estCardH - 16
    );
  } else if (step.preferredPlacement === 'side-compact' && spaceLeft >= 288) {
    cardW = Math.min(316, spaceLeft - 22);
    cardLeft = primaryHole.x - cardW - 12;
    cardTop = Math.min(
      Math.max(20, Math.round((viewport.h - estCardH) / 2)),
      viewport.h - estCardH - 16
    );
  } else if (spaceLeft >= cardW + 24 && primaryHole.h > 220) {
    cardLeft = primaryHole.x - cardW - 18;
    cardTop = Math.min(
      Math.max(16, primaryHole.y + 40),
      viewport.h - estCardH - 16
    );
  } else if (spaceRight >= cardW + 24 && primaryHole.h > 220) {
    cardLeft = primaryHole.x + primaryHole.w + 18;
    cardTop = Math.min(
      Math.max(16, primaryHole.y + 40),
      viewport.h - estCardH - 16
    );
  } else if (spaceBelow >= estCardH + 20) {
    cardLeft = Math.min(
      Math.max(12, primaryHole.x + 24),
      viewport.w - cardW - 12
    );
    cardTop = primaryHole.y + primaryHole.h + 14;
  } else if (spaceAbove >= estCardH + 20) {
    cardLeft = Math.min(
      Math.max(12, primaryHole.x + 24),
      viewport.w - cardW - 12
    );
    cardTop = primaryHole.y - estCardH - 14;
  } else {
    cardLeft = Math.round((viewport.w - cardW) / 2);
    cardTop =
      primaryHole.y > viewport.h * 0.45
        ? 16
        : Math.max(16, viewport.h - estCardH - 16);
  }

  return { top: cardTop, left: cardLeft, width: cardW };
}

export function SpotlightWalkthrough({
  lang,
  open,
  stepIdx,
  steps = WALKTHROUGH_STEPS,
  onChangeStep,
  onClose,
}: SpotlightWalkthroughProps) {
  const maskId = useId();
  const [rawRects, setRawRects] = useState<RectBox[]>([]);
  const [animHoles, setAnimHoles] = useState<HoleBox[]>([]);
  const [viewport, setViewport] = useState({ w: 1440, h: 900 });
  const [cardPos, setCardPos] = useState<CardPos | null>(null);

  const animHolesRef = useRef<HoleBox[]>([]);
  animHolesRef.current = animHoles;

  const step = steps[stepIdx] ?? steps[0];
  const isEn = lang === 'en';
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;

  // Measure target bounding boxes once mounted (preserving previous position until new async modal mounts so nothing flashes to center)
  useLayoutEffect(() => {
    if (!open || !step) {
      setRawRects([]);
      setAnimHoles([]);
      animHolesRef.current = [];
      setCardPos(null);
      return;
    }

    let animRaf = 0;
    let resizeObservers: ResizeObserver[] = [];

    const startTweenToCurrent = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewport({ w: vw, h: vh });

      const measured: RectBox[] = [];
      for (const target of step.targets) {
        const el = document.querySelector(`[data-tour="${target}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            measured.push({
              top: r.top,
              left: r.left,
              width: r.width,
              height: r.height,
            });
          }
        }
      }
      if (measured.length === 0) return;

      setRawRects(measured);
      const targetHoles = measured.map((r) => toPaddedHole(r, vw, vh));
      setCardPos(computeCardPosition(step, targetHoles, { w: vw, h: vh }));

      const prev = animHolesRef.current;
      if (prev.length === 0) {
        animHolesRef.current = targetHoles;
        setAnimHoles(targetHoles);
        return;
      }

      // Skip tween if destination barely changed (e.g. steady resize ticks)
      const sameShape =
        prev.length === targetHoles.length &&
        targetHoles.every((nh, i) => {
          const ph = prev[i];
          return (
            Math.abs(ph.x - nh.x) < 2 &&
            Math.abs(ph.y - nh.y) < 2 &&
            Math.abs(ph.w - nh.w) < 2 &&
            Math.abs(ph.h - nh.h) < 2
          );
        });
      if (sameShape) {
        animHolesRef.current = targetHoles;
        setAnimHoles(targetHoles);
        return;
      }

      const fromHoles: HoleBox[] = targetHoles.map((nh, i) => {
        if (i < prev.length) return prev[i];
        return {
          x: nh.x + nh.w * 0.5,
          y: nh.y + nh.h * 0.5,
          w: 24,
          h: 24,
        };
      });

      window.cancelAnimationFrame(animRaf);
      const start = performance.now();

      const tick = (now: number) => {
        const rawT = Math.min(1, (now - start) / TRANSITION_MS);
        const eased = easeOutCubic(rawT);
        const frameHoles = targetHoles.map((nh, i) => ({
          x: lerp(fromHoles[i].x, nh.x, eased),
          y: lerp(fromHoles[i].y, nh.y, eased),
          w: lerp(fromHoles[i].w, nh.w, eased),
          h: lerp(fromHoles[i].h, nh.h, eased),
        }));
        animHolesRef.current = frameHoles;
        setAnimHoles(frameHoles);
        if (rawT < 1) {
          animRaf = window.requestAnimationFrame(tick);
        }
      };

      animRaf = window.requestAnimationFrame(tick);
    };

    const bindObservers = () => {
      resizeObservers.forEach((ro) => ro.disconnect());
      resizeObservers = [];
      for (const target of step.targets) {
        const el = document.querySelector(`[data-tour="${target}"]`);
        if (el) {
          const ro = new ResizeObserver(startTweenToCurrent);
          ro.observe(el);
          resizeObservers.push(ro);
        }
      }
    };

    startTweenToCurrent();
    bindObservers();

    const firstEl = step.targets[0]
      ? document.querySelector(`[data-tour="${step.targets[0]}"]`)
      : null;
    if (firstEl) {
      const r = firstEl.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        firstEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    const mo = new MutationObserver(() => {
      bindObservers();
      startTweenToCurrent();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const onWinChange = () => startTweenToCurrent();
    window.addEventListener('resize', onWinChange);
    window.addEventListener('scroll', onWinChange, true);

    return () => {
      window.cancelAnimationFrame(animRaf);
      mo.disconnect();
      resizeObservers.forEach((ro) => ro.disconnect());
      window.removeEventListener('resize', onWinChange);
      window.removeEventListener('scroll', onWinChange, true);
    };
  }, [open, step, stepIdx]);

  // Keyboard navigation while tutorial is open
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isLast) onClose();
        else onChangeStep(stepIdx + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!isFirst) onChangeStep(stepIdx - 1);
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, isFirst, isLast, stepIdx, onChangeStep, onClose]);

  if (!open || !step) return null;

  const holes = animHoles;

  // Raw non-padded holes for exact evenodd click-through path so outside clicks stay blocked while cutouts remain 100% interactive
  const rawSubpaths = rawRects
    .map(
      (r) =>
        `M ${r.left} ${r.top} V ${r.top + r.height} H ${r.left + r.width} V ${r.top} Z`
    )
    .join(' ');
  const blockerPath = `M 0 0 H ${viewport.w} V ${viewport.h} H 0 Z ${rawSubpaths}`;

  const resolvedCardPos =
    cardPos ??
    computeCardPosition(
      step,
      holes,
      viewport
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEn ? 'Interactive product tour' : 'Hướng dẫn sử dụng nhanh'}
      className="pointer-events-none fixed inset-0 z-[2200]"
    >
      {/* Fullscreen SVG Dimmer (darker 90% black outside cutout) + interactive hole pass-through */}
      <svg
        className="pointer-events-none fixed inset-0 h-full w-full"
        width={viewport.w}
        height={viewport.h}
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width={viewport.w} height={viewport.h} fill="white" />
            {holes.map((h, i) => (
              <rect
                key={i}
                x={h.x}
                y={h.y}
                width={h.w}
                height={h.h}
                rx="8"
                ry="8"
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={viewport.w}
          height={viewport.h}
          fill="rgba(2, 4, 8, 0.90)"
          mask={`url(#${maskId})`}
        />
        <path
          d={blockerPath}
          fill="rgba(0, 0, 0, 0.001)"
          fillRule="evenodd"
          className="pointer-events-auto"
        />
      </svg>

      {/* Crisp spotlight rings tracking animated cutout holes smoothly */}
      {holes.map((h, i) => (
        <div
          key={i}
          style={{
            top: h.y,
            left: h.x,
            width: h.w,
            height: h.h,
          }}
          className="pointer-events-none fixed z-[2201] rounded-[8px] border-2 border-[#8ACBB5]"
        />
      ))}

      {/* Floating Game-Tutorial Instruction Card (glides smoothly across steps, zero glassy AI-slop styling) */}
      <div
        style={{
          top: resolvedCardPos.top,
          left: resolvedCardPos.left,
          width: resolvedCardPos.width,
          transition: `top ${TRANSITION_MS}ms ${CARD_EASE}, left ${TRANSITION_MS}ms ${CARD_EASE}, width ${TRANSITION_MS}ms ${CARD_EASE}`,
        }}
        className="pointer-events-auto fixed z-[2202] rounded-[6px] border border-lineStrong bg-panel p-4 text-ink shadow-[0_24px_60px_rgba(0,0,0,0.92)]"
      >
        {/* Top Row: Plain Mono Step Counter + Clean Matte High-Contrast Exit Action */}
        <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
          <span className="font-mono text-[11.5px] font-semibold tracking-wide text-[#8ACBB5]">
            {isEn
              ? `Step ${stepIdx + 1} / ${steps.length}`
              : `Bước ${stepIdx + 1} / ${steps.length}`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[#64748B] bg-[#1E2532] px-2.5 text-[11.5px] font-semibold text-white transition-colors hover:border-white hover:bg-[#2B3548]"
          >
            <span>{isEn ? 'Exit (Esc)' : 'Thoát (Esc)'}</span>
            <X className="h-3.5 w-3.5 stroke-[2.2]" />
          </button>
        </div>

        <h3 className="mt-2.5 text-[14px] font-semibold leading-snug text-ink">
          {isEn ? step.titleEn : step.titleVi}
        </h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-inkMuted">
          {isEn ? step.bodyEn : step.bodyVi}
        </p>

        {/* Interactive step progress bar dots */}
        <div className="mt-3 flex items-center gap-1.5">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChangeStep(idx)}
              aria-label={`${isEn ? 'Go to step' : 'Tới bước'} ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === stepIdx
                  ? 'w-5 bg-[#8ACBB5]'
                  : idx < stepIdx
                  ? 'w-2 bg-[#8ACBB5]/45'
                  : 'w-2 bg-white/15 hover:bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Bottom Prev / Next Actions */}
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => onChangeStep(Math.max(0, stepIdx - 1))}
            disabled={isFirst}
            className="inline-flex h-8 items-center gap-1 rounded-[5px] border border-lineStrong bg-canvas px-2.5 text-[12px] font-medium text-inkMuted transition-colors hover:border-[#64748B] hover:text-ink disabled:opacity-35"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{isEn ? 'Back' : 'Trước'}</span>
          </button>

          <button
            type="button"
            onClick={() => (isLast ? onClose() : onChangeStep(stepIdx + 1))}
            className="inline-flex h-8 items-center gap-1.5 rounded-[5px] bg-[#CDECD7] px-3.5 text-[12px] font-semibold text-[#0E1F1A] transition-colors hover:bg-[#D8F1E0]"
          >
            <span>
              {isLast
                ? isEn
                  ? 'Start Using'
                  : 'Bắt đầu dùng'
                : isEn
                ? 'Next'
                : 'Tiếp theo'}
            </span>
            {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
