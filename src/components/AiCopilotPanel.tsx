import { useEffect, useState, type ReactNode } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Send,
} from 'lucide-react';
import type { CommuneYagiStatus, Lang, RiverStationR2 } from '../types/yagi';
import { formatNum, formatVndBillions } from '../utils/yagiLogic';
import {
  runHybridCopilotQuery,
  verifyGeminiApiKey,
  type AiWorkspaceAction,
  type CommuneAiAssessment,
  type CopilotResponse,
  type WhatIfSummary,
} from '../utils/aiRiskEngine';

interface AiCopilotPanelProps {
  lang: Lang;
  communes: CommuneYagiStatus[];
  stations: RiverStationR2[];
  selectedCommune: CommuneYagiStatus | null;
  assessments: Map<string, CommuneAiAssessment>;
  whatIf: WhatIfSummary;
  dateStr: string;
  aiHighlightedCount?: number;
  onSelectCommune: (gid: string | null) => void;
  onApplyAiAction?: (action: AiWorkspaceAction) => void;
  onClearAiHighlights?: () => void;
  onOpenExceptionsTab?: () => void;
}

interface ChatTurn {
  question: string;
  response: CopilotResponse;
}

const SESSION_KEY_STORAGE = 'resilend_gemini_api_key';

function formatInlineTokens(line: string): ReactNode[] {
  const tokens = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return tokens.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={j} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={j} className="italic text-inkDim">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={j} className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10.5px] text-[#CBD5E1]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={j}>{part}</span>;
  });
}

function formatRichLines(text: string): ReactNode[] {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={i} className="h-1.5" />;
    }
    if (trimmed.startsWith('- ')) {
      return (
        <div key={i} className="mt-1 flex items-start gap-1.5 pl-1">
          <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-inkDim" />
          <span>{formatInlineTokens(trimmed.slice(2))}</span>
        </div>
      );
    }
    return (
      <p key={i} className={i > 0 ? 'mt-1' : ''}>
        {formatInlineTokens(line)}
      </p>
    );
  });
}

/** Focused Gemini Chat & Exception Memo Drafting panel inside OperationalDrawer. */
export function AiCopilotPanel({
  lang,
  communes,
  stations,
  selectedCommune,
  assessments,
  whatIf,
  dateStr,
  aiHighlightedCount = 0,
  onSelectCommune,
  onApplyAiAction,
  onClearAiHighlights,
  onOpenExceptionsTab,
}: AiCopilotPanelProps) {
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return (
        import.meta.env.VITE_GEMINI_API_KEY ||
        window.sessionStorage.getItem(SESSION_KEY_STORAGE) ||
        ''
      );
    } catch {
      return '';
    }
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleVerifyKey = async (rawKey = apiKey) => {
    const trimmed = rawKey.trim();
    if (!trimmed) {
      setKeyStatus('idle');
      setKeyMessage(null);
      return;
    }
    setKeyStatus('checking');
    setKeyMessage(null);
    const result = await verifyGeminiApiKey(trimmed);
    if (result.ok) {
      setKeyStatus('valid');
      setKeyMessage(
        lang === 'en'
          ? `Connected to ${result.model} — live Q&A & memos will use your key.`
          : `Đã kết nối ${result.model} — mọi câu hỏi & tờ trình sẽ gọi trực tiếp Gemini.`
      );
    } else {
      setKeyStatus('invalid');
      setKeyMessage(
        lang === 'en'
          ? `Key check failed: ${result.error}`
          : `Kiểm tra key thất bại: ${result.error}`
      );
    }
  };

  useEffect(() => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setKeyStatus('idle');
      setKeyMessage(null);
      return;
    }
    if (trimmed.length < 25) return;
    const t = window.setTimeout(() => {
      void handleVerifyKey(trimmed);
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const presets =
    lang === 'en'
      ? [
          'Find outside-UNOSAT communes in Bac Giang and highlight on map',
          'Schedule 3 officers in 48h in Thai Binh to maximize 5% savings',
          'Which flooded communes did the rain rule miss?',
          selectedCommune
            ? `Draft memo for ${selectedCommune.name}`
            : 'Draft exception approval memo',
        ]
      : [
          'Tìm xã ngoài UNOSAT ở Bắc Giang rồi tô sáng lên bản đồ',
          '3 cán bộ xử lý trong 48h ở Thái Bình, xếp lịch ưu tiên giữ DP 5%',
          'Xã nào ngập nặng nhưng đo mưa bị sót?',
          selectedCommune
            ? `Viết nháp tờ trình Xã ${selectedCommune.name}`
            : 'Viết nháp tờ trình duyệt ngoại lệ',
        ];

  const handleSaveKey = (val: string) => {
    setApiKey(val);
    try {
      if (val.trim()) {
        window.sessionStorage.setItem(SESSION_KEY_STORAGE, val.trim());
      } else {
        window.sessionStorage.removeItem(SESSION_KEY_STORAGE);
      }
    } catch {
      // Ignore storage failures in locked browsers
    }
  };

  const handleAsk = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || loading) return;
    setLoading(true);
    setInput('');
    try {
      const response = await runHybridCopilotQuery(question, {
        communes,
        stations,
        selectedCommune,
        assessments,
        whatIf,
        dateStr,
        lang,
        apiKey,
      });
      if (response.uiAction) {
        onApplyAiAction?.(response.uiAction);
      }
      setTurns((prev) => [{ question, response }, ...prev.slice(0, 4)]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMemo = async (memo: string, key: string) => {
    try {
      const plain = memo.replace(/\*\*|\*|`/g, '');
      await navigator.clipboard.writeText(plain);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const selectedAi = selectedCommune ? assessments.get(selectedCommune.gid_3) : null;

  return (
    <div className="space-y-3.5 text-[12.5px]">
      {/* Compact Header & Optional Gemini Connection Bar */}
      <div className="rounded-[4px] border border-lineStrong bg-canvas px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink">
              {lang === 'en' ? 'Gemini Tool Agent' : 'Trợ lý Điều phối Gemini'}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-inkDim">
              {lang === 'en'
                ? 'Live map & schedule tools · Zero PII'
                : 'Gọi công cụ bản đồ & xếp lịch · Không PII'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowKeyInput((v) => !v)}
            title={
              lang === 'en'
                ? 'Optional: connect your Google Gemini API key'
                : 'Tùy chọn: gắn Gemini API Key để hỏi đáp trực tuyến'
            }
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] border border-lineStrong bg-panelAlt px-2.5 text-[11px] font-medium text-inkMuted transition-colors hover:border-inkDim hover:text-ink"
          >
            {keyStatus === 'valid' ? (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            ) : keyStatus === 'invalid' ? (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            ) : apiKey.trim() ? (
              <span className="h-1.5 w-1.5 rounded-full bg-inkDim" />
            ) : (
              <KeyRound className="h-3 w-3 text-inkDim" />
            )}
            <span>
              {keyStatus === 'checking'
                ? lang === 'en'
                  ? 'Checking...'
                  : 'Đang kiểm...'
                : keyStatus === 'valid'
                ? 'Gemini ON'
                : apiKey.trim()
                ? 'API Key'
                : lang === 'en'
                ? 'API Key'
                : 'Gắn Key'}
            </span>
          </button>
        </div>

        {showKeyInput && (
          <div className="mt-2.5 space-y-2 border-t border-line pt-2.5">
            <div className="flex items-center gap-1.5">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleSaveKey(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'Paste Gemini API key (optional)...'
                    : 'Dán Gemini API Key (tùy chọn)...'
                }
                className="h-7 min-w-0 flex-1 rounded-[4px] border border-lineStrong bg-panel px-2.5 font-mono text-[11.5px] text-ink placeholder:text-inkDim focus:border-inkDim focus:outline-none"
              />
              {apiKey.trim() && (
                <button
                  type="button"
                  onClick={() => void handleVerifyKey(apiKey)}
                  disabled={keyStatus === 'checking'}
                  className="h-7 shrink-0 rounded-[4px] bg-ink px-2.5 text-[11px] font-semibold text-canvas hover:bg-white disabled:opacity-50"
                >
                  {keyStatus === 'checking'
                    ? '...'
                    : lang === 'en'
                    ? 'Test'
                    : 'Kết nối'}
                </button>
              )}
              {apiKey && (
                <button
                  type="button"
                  onClick={() => handleSaveKey('')}
                  className="h-7 shrink-0 rounded-[4px] border border-lineStrong px-2 text-[11px] text-inkMuted hover:text-ink"
                >
                  {lang === 'en' ? 'Clear' : 'Xóa'}
                </button>
              )}
            </div>
            {keyStatus === 'checking' && (
              <div className="text-[11px] text-inkMuted">
                {lang === 'en' ? 'Verifying with Google Gemini...' : 'Đang xác thực key...'}
              </div>
            )}
            {keyMessage && (
              <div
                className={`rounded-[4px] border px-2.5 py-1.5 text-[11px] ${
                  keyStatus === 'valid'
                    ? 'border-lineStrong bg-panelAlt text-[#CDECD7]'
                    : 'border-amber-500/50 bg-amber-950/25 text-amber-200'
                }`}
              >
                {keyMessage}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-inkDim">
              <span>
                {lang === 'en' ? 'Session-only · ' : 'Lưu tạm phiên này · '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-inkMuted underline-offset-2 hover:text-ink hover:underline"
                >
                  <span>
                    {lang === 'en'
                      ? 'Get key in Google AI Studio'
                      : 'Lấy key tại Google AI Studio'}
                  </span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Natural Language Tool Agent + Memo Draft Assistant */}
      <div className="rounded-[4px] border border-lineStrong bg-canvas p-3">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="text-[12px] font-semibold text-ink">
            {lang === 'en'
              ? 'Agent Commands, Planning & Memos'
              : 'Lệnh bản đồ, xếp lịch & tờ trình'}
          </div>
          <div className="flex items-center gap-1.5">
            {aiHighlightedCount > 0 && (
              <button
                type="button"
                onClick={() => onClearAiHighlights?.()}
                className="inline-flex items-center gap-1 rounded-[3px] border border-[#8ACBB5]/50 bg-[#14221F] px-2 py-0.5 font-mono text-[10.5px] text-[#CDECD7] hover:border-[#CDECD7]"
              >
                <span>
                  {lang === 'en'
                    ? `${aiHighlightedCount} lit ×`
                    : `Tô sáng ${aiHighlightedCount} xã ×`}
                </span>
              </button>
            )}
            {selectedCommune && selectedAi && (
              <span className="rounded-[3px] border border-lineStrong bg-panelAlt px-2 py-0.5 font-mono text-[10.5px] text-inkMuted">
                {lang === 'en'
                  ? `${selectedCommune.name} · ${selectedAi.score}/100`
                  : `Xã ${selectedCommune.name} · ${selectedAi.score}/100đ`}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleAsk(p)}
              className="rounded-[4px] border border-lineStrong bg-panelAlt px-2 py-1 text-left text-[11px] text-inkMuted transition-colors hover:border-inkDim hover:text-ink"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          className="mt-2.5 flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(input);
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              lang === 'en'
                ? 'e.g. "Highlight outside-UNOSAT in Bac Giang" or "3 officers 48h"...'
                : 'VD: "3 cán bộ 48h ở Thái Bình", "Tô sáng xã ngoài UNOSAT..."'
            }
            className="h-8 flex-1 rounded-[4px] border border-lineStrong bg-panel px-2.5 text-[12px] text-ink placeholder:text-inkDim focus:border-inkDim focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[4px] bg-[#CDECD7] px-3 text-[12px] font-semibold text-[#0E1F1A] transition-colors hover:bg-[#D8F1E0] disabled:opacity-45"
          >
            <Send className="h-3 w-3" />
            <span>{loading ? '...' : lang === 'en' ? 'Ask' : 'Hỏi'}</span>
          </button>
        </form>

        {turns.length > 0 && (
          <div className="mt-3 space-y-2.5">
            {turns.map((turn, idx) => {
              const activeMemo = turn.response.batchMemo || turn.response.draftMemo;
              const memoCopyId = `${turn.response.batchMemo ? 'batch' : 'draft'}-${idx}`;
              return (
                <div
                  key={`${turn.question}-${idx}`}
                  className="rounded-[4px] border border-lineStrong bg-panel p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-line pb-1.5">
                    <span className="text-[11.5px] font-medium text-ink">
                      {turn.question}
                    </span>
                    <span className="font-mono text-[10px] text-inkDim">
                      {turn.response.modelLabel}
                    </span>
                  </div>

                  {turn.response.fallbackNote && (
                    <div className="mt-1.5 rounded-[4px] border border-line bg-canvas px-2 py-1 text-[10.5px] text-inkDim">
                      {turn.response.fallbackNote}
                    </div>
                  )}

                  {turn.response.toolTraces && turn.response.toolTraces.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {turn.response.toolTraces.map((tr, tIdx) => (
                        <span
                          key={`${tr.tool}-${tIdx}`}
                          className="rounded-[3px] border border-line bg-[#10151E] px-1.5 py-0.5 font-mono text-[10px] text-[#9CA6B4]"
                        >
                          {tr.tool}: <span className="text-[#CDECD7]">{tr.summary}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {turn.response.workspaceActionsApplied &&
                    turn.response.workspaceActionsApplied.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-[#8ACBB5]/35 bg-[#121E1B] px-2.5 py-1.5 text-[11px] text-[#CDECD7]">
                        <span>{turn.response.workspaceActionsApplied.join(' · ')}</span>
                        {onOpenExceptionsTab && (
                          <button
                            type="button"
                            onClick={onOpenExceptionsTab}
                            className="shrink-0 font-mono text-[10.5px] font-semibold text-[#8ACBB5] underline-offset-2 hover:underline"
                          >
                            {lang === 'en' ? 'Open Queue →' : 'Mở Ngoại lệ →'}
                          </button>
                        )}
                      </div>
                    )}

                  {turn.response.badges && turn.response.badges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {turn.response.badges.map((b) => (
                        <span
                          key={b.label}
                          className="rounded-[4px] border border-line bg-canvas px-2 py-0.5 font-mono text-[10.5px] text-inkMuted"
                        >
                          {b.label}: <b className="text-ink">{b.value}</b>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 text-[12px] leading-relaxed text-inkMuted">
                    {formatRichLines(turn.response.answer)}
                  </div>

                  {turn.response.actionPlan && (
                    <div
                      data-plan-card="true"
                      className="mt-2.5 rounded-[5px] border border-lineStrong bg-[#10151E] p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-line pb-1.5">
                        <span className="font-mono text-[10.5px] font-semibold tracking-wide text-[#8ACBB5]">
                          {lang === 'en'
                            ? `DISPATCH PLAN · ${turn.response.actionPlan.officers} OFFICERS × ${turn.response.actionPlan.hoursWindow}H`
                            : `LỊCH PHÂN TUYẾN · ${turn.response.actionPlan.officers} CÁN BỘ × ${turn.response.actionPlan.hoursWindow}H`}
                        </span>
                        <span className="font-mono text-[10px] text-inkDim">
                          {lang === 'en'
                            ? `Assumption: ${turn.response.actionPlan.casesPerOfficerDay} communes/officer/day`
                            : `Giả định: ${turn.response.actionPlan.casesPerOfficerDay} xã/CB/ngày`}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-3 divide-x divide-line rounded-[4px] border border-line bg-canvas text-center">
                        <div className="px-2 py-1.5">
                          <div className="text-[10px] text-inkDim">
                            {lang === 'en' ? 'Selected' : 'Đã chọn'}
                          </div>
                          <div className="font-mono text-[12.5px] font-semibold text-ink tabular-nums">
                            {turn.response.actionPlan.selectedCount}/
                            {turn.response.actionPlan.eligibleCount}
                          </div>
                        </div>
                        <div className="px-2 py-1.5">
                          <div className="text-[10px] text-inkDim">
                            {lang === 'en' ? 'Kept Group 1' : 'Hộ giữ N1'}
                          </div>
                          <div className="font-mono text-[12.5px] font-semibold text-[#8ACBB5] tabular-nums">
                            {formatNum(turn.response.actionPlan.totalLoansProtected, lang)}
                          </div>
                        </div>
                        <div className="px-2 py-1.5">
                          <div className="text-[10px] text-inkDim">
                            {lang === 'en' ? '5% Prov. Saved' : 'Tránh DP 5%'}
                          </div>
                          <div className="font-mono text-[12.5px] font-semibold text-ink tabular-nums">
                            {formatVndBillions(
                              turn.response.actionPlan.totalProvision5PctM,
                              lang
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        {turn.response.actionPlan.clusters.slice(0, 6).map((cl) => (
                          <div
                            key={`${cl.province}-${cl.district}`}
                            className="rounded-[4px] border border-line bg-canvas px-2.5 py-1.5"
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-semibold text-ink">
                                {cl.district} ({cl.province})
                              </span>
                              <span className="font-mono text-[10.5px] text-inkMuted tabular-nums">
                                {formatNum(cl.totalLoans, lang)}{' '}
                                {lang === 'en' ? 'loans' : 'hộ'} ·{' '}
                                {formatVndBillions(cl.totalProvisionM, lang)}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {cl.communes.map((cm) => (
                                <button
                                  key={cm.gid_3}
                                  type="button"
                                  onClick={() => onSelectCommune(cm.gid_3)}
                                  className="inline-flex items-center gap-1 rounded-[3px] border border-lineStrong bg-panel px-1.5 py-0.5 font-mono text-[10.5px] text-[#CBD5E1] transition-colors hover:border-[#8ACBB5] hover:text-white"
                                >
                                  <span>{cm.name}</span>
                                  <span className="text-inkDim">
                                    {cm.missingUnosat
                                      ? lang === 'en'
                                        ? 'No scan'
                                        : 'Ngoài ảnh'
                                      : `${cm.unosat_flood_pct?.toFixed(0)}%`}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeMemo && (
                    <div
                      data-memo-card="true"
                      className="mt-2.5 rounded-[5px] border border-lineStrong border-l-2 border-l-[#8ACBB5] bg-[#10151E] p-3"
                    >
                      <div className="mb-2 flex items-center justify-between border-b border-line pb-1.5">
                        <span className="font-mono text-[10.5px] font-semibold tracking-wide text-[#8ACBB5]">
                          {turn.response.batchMemo
                            ? lang === 'en'
                              ? 'BATCH TRIAGE MEMO (REQUIRES OFFICER APPROVAL)'
                              : 'TỜ TRÌNH CỤM XÃ (CHỜ CÁN BỘ DUYỆT)'
                            : lang === 'en'
                            ? 'DRAFT MEMO (REQUIRES OFFICER APPROVAL)'
                            : 'BẢN NHÁP TỜ TRÌNH (CHỜ CÁN BỘ DUYỆT)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyMemo(activeMemo, memoCopyId)}
                          className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-lineStrong bg-panel px-2 text-[10.5px] text-inkMuted hover:text-ink"
                        >
                          {copiedKey === memoCopyId ? (
                            <Check className="h-3 w-3 text-[#8ACBB5]" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>
                            {copiedKey === memoCopyId
                              ? lang === 'en'
                                ? 'Copied'
                                : 'Đã chép'
                              : lang === 'en'
                              ? 'Copy'
                              : 'Chép'}
                          </span>
                        </button>
                      </div>
                      <div className="text-[11.5px] leading-relaxed text-[#CBD5E1]">
                        {formatRichLines(activeMemo)}
                      </div>
                    </div>
                  )}

                  {turn.response.targetGid && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onSelectCommune(turn.response.targetGid!)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#CDECD7] hover:text-white"
                      >
                        <span>
                          {lang === 'en'
                            ? 'Inspect commune on map →'
                            : 'Phóng tới xã trên bản đồ →'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

