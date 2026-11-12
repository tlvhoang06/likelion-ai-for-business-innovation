import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, HelpCircle, Info, Search, X } from 'lucide-react';
import type { CommuneYagiStatus, Lang } from '../types/yagi';
import { formatNum, SHOWCASE_COMMUNES } from '../utils/yagiLogic';

interface TopBarProps {
  lang: Lang;
  communes: CommuneYagiStatus[];
  selectedGid: string | null;
  auditOpen?: boolean;
  glossaryOpen?: boolean;
  tourOpen?: boolean;
  onChangeLang: (lang: Lang) => void;
  onSelectCommune: (gid: string | null) => void;
  onOpenAudit: () => void;
  onOpenGlossary: () => void;
  onOpenTour: () => void;
}

export function TopBar({
  lang,
  communes,
  selectedGid,
  auditOpen = false,
  glossaryOpen = false,
  tourOpen = false,
  onChangeLang,
  onSelectCommune,
  onOpenAudit,
  onOpenGlossary,
  onOpenTour,
}: TopBarProps) {
  const [query, setQuery] = useState('');
  const [openSearch, setOpenSearch] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpenSearch(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return SHOWCASE_COMMUNES.map((s) => {
        const c = communes.find((x) => x.gid_3 === s.gid);
        return c ? { commune: c, note: lang === 'en' ? s.tagEn : s.tag } : null;
      }).filter(Boolean) as Array<{ commune: CommuneYagiStatus; note: string }>;
    }
    const found: Array<{ commune: CommuneYagiStatus; note: string }> = [];
    for (const c of communes) {
      const hay = `${c.name} ${c.district} ${c.province} ${c.gid_3}`.toLowerCase();
      if (hay.includes(q)) {
        found.push({
          commune: c,
          note:
            c.unosat_flood_pct !== null
              ? `UNOSAT ${c.unosat_flood_pct.toFixed(1)}%`
              : lang === 'en'
              ? 'Out of UNOSAT'
              : 'Ngoài vùng UNOSAT',
        });
        if (found.length >= 12) break;
      }
    }
    return found;
  }, [communes, query, lang]);

  const currentCommune = useMemo(
    () => (selectedGid ? communes.find((c) => c.gid_3 === selectedGid) : undefined),
    [communes, selectedGid]
  );

  return (
    <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-b border-lineStrong bg-panel px-4 py-2">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="font-mono text-[15px] font-semibold tracking-tight text-ink">
          ResiLend
        </span>
        <span className="hidden text-lineStrong sm:inline">|</span>
        <span className="text-[12.5px] text-inkMuted">
          {lang === 'en'
            ? `Disaster Credit Relief · ${formatNum(communes.length || 2895, 'en')} communes`
            : 'Hạ tầng giãn nợ & chỉ số thiên tai · 2.895 xã'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Commune Quick Search */}
        <div ref={boxRef} className="relative">
          <div
            className={`flex h-8 items-center gap-1.5 rounded-[4px] border bg-canvas px-2.5 transition-colors ${
              openSearch
                ? 'border-inkDim'
                : 'border-lineStrong hover:border-inkDim'
            }`}
          >
            <Search className="h-3.5 w-3.5 text-inkDim" strokeWidth={1.75} />
            <input
              type="text"
              value={query}
              onFocus={() => setOpenSearch(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpenSearch(true);
              }}
              placeholder={
                currentCommune
                  ? `${lang === 'en' ? 'Viewing' : 'Đang xem'}: ${currentCommune.name} (${currentCommune.province})`
                  : lang === 'en'
                  ? 'Search commune, district, province (2,895)...'
                  : 'Tìm xã, huyện, tỉnh (2.895 xã)...'
              }
              className="w-[210px] bg-transparent text-[12.5px] text-ink placeholder:text-inkDim focus:outline-none sm:w-[245px]"
            />
            {(query || selectedGid) && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  if (!query && selectedGid) {
                    onSelectCommune(null);
                  }
                }}
                className="text-inkDim hover:text-ink"
                aria-label={
                  query
                    ? lang === 'en'
                      ? 'Clear search'
                      : 'Xóa tìm kiếm'
                    : lang === 'en'
                    ? 'Exit to regional overview'
                    : 'Thoát chọn xã về tổng quan'
                }
                title={
                  query
                    ? lang === 'en'
                      ? 'Clear search text'
                      : 'Xóa chữ tìm kiếm'
                    : lang === 'en'
                    ? 'Exit to regional overview'
                    : 'Thoát chọn xã về tổng quan'
                }
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {openSearch && (
            <div className="absolute right-0 top-9 z-[1200] w-[320px] rounded-[4px] border border-lineStrong bg-panel shadow-2xl">
              <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-[11px] font-medium text-inkDim">
                <span>
                  {query.trim()
                    ? lang === 'en'
                      ? `Filtered (${matches.length} communes)`
                      : `Kết quả lọc (${matches.length} xã)`
                    : lang === 'en'
                    ? 'Typhoon Yagi Benchmark Communes'
                    : 'Xã trọng điểm đối chứng Bão Yagi'}
                </span>
                {selectedGid && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCommune(null);
                      setOpenSearch(false);
                    }}
                    className="text-inkMuted hover:text-ink"
                  >
                    {lang === 'en' ? 'Overview' : 'Về tổng quan'}
                  </button>
                )}
              </div>
              <div className="max-h-[280px] overflow-y-auto py-1">
                {matches.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-inkMuted">
                    {lang === 'en'
                      ? 'No matching commune found across 2,895 communes.'
                      : 'Không tìm thấy xã phù hợp trong 2.895 xã Bắc Bộ.'}
                  </div>
                ) : (
                  matches.map(({ commune, note }) => {
                    const active = commune.gid_3 === selectedGid;
                    return (
                      <button
                        key={commune.gid_3}
                        type="button"
                        onClick={() => {
                          onSelectCommune(commune.gid_3);
                          setQuery('');
                          setOpenSearch(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[12.5px] transition-colors ${
                          active
                            ? 'bg-[#8ACBB5] text-[#0E1F1A]'
                            : 'text-inkMuted hover:bg-[#1C222D] hover:text-ink'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div
                            className={`truncate ${
                              active ? 'font-semibold text-[#0E1F1A]' : 'font-medium text-ink'
                            }`}
                          >
                            {commune.name}
                          </div>
                          <div
                            className={`truncate text-[11px] ${
                              active ? 'font-medium text-[#0E1F1A]/80' : 'text-inkDim'
                            }`}
                          >
                            {commune.district}, {commune.province}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 font-mono text-[11px] ${
                            active ? 'font-semibold text-[#0E1F1A]' : 'text-inkMuted'
                          }`}
                        >
                          {note}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <span className="hidden h-8 items-center rounded-[4px] border border-lineStrong bg-canvas px-2.5 font-mono text-[11px] font-medium text-inkMuted xl:inline-flex">
          {lang === 'en' ? 'Circ. 29/2025 · 10 days' : 'TT 29/2025 · 10 ngày'}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bilingual VI / EN Switcher */}
          <div
            role="group"
            aria-label={lang === 'en' ? 'Interface language' : 'Ngôn ngữ giao diện'}
            className="inline-flex h-8 items-center rounded-[4px] border border-lineStrong bg-canvas p-0.5 font-mono text-[11px]"
          >
            {(['vi', 'en'] as const).map((code) => {
              const active = lang === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChangeLang(code)}
                  className={`inline-flex h-full items-center rounded-[3px] px-2 font-semibold uppercase transition-colors ${
                    active
                      ? 'bg-[#263042] text-ink'
                      : 'text-inkDim hover:text-inkMuted'
                  }`}
                >
                  {code}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onOpenGlossary}
            title={
              lang === 'en'
                ? 'Explain R1, R2, R3, UNOSAT, Sentinel-1 and Group 1 terms'
                : 'Giải thích ý nghĩa R1, R2, R3, UNOSAT, Sentinel-1 và Nhóm nợ 1'
            }
            className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] border px-2.5 text-[12px] font-medium transition-colors ${
              glossaryOpen
                ? 'border-[#8ACBB5] bg-[#162723] text-[#CDECD7]'
                : 'border-lineStrong bg-canvas text-inkMuted hover:border-inkDim hover:text-ink'
            }`}
          >
            <Info className="h-3.5 w-3.5" strokeWidth={1.85} />
            <span>{lang === 'en' ? 'Signal Guide' : 'Giải thích chỉ số'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAudit}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] px-2.5 text-[12px] font-semibold transition-colors ${
              auditOpen
                ? 'bg-[#8ACBB5] text-[#0E1F1A]'
                : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" strokeWidth={1.9} />
            <span>{lang === 'en' ? 'Validation & Legal' : 'Kiểm chứng & Pháp lý'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenTour}
            title={
              lang === 'en'
                ? 'Start interactive guided tour'
                : 'Mở hướng dẫn từng bước sử dụng hệ thống'
            }
            className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] border px-2.5 text-[12px] font-medium transition-colors ${
              tourOpen
                ? 'border-inkDim bg-[#263042] text-ink'
                : 'border-lineStrong bg-canvas text-inkMuted hover:border-inkDim hover:text-ink'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.85} />
            <span>{lang === 'en' ? 'Tour' : 'Hướng dẫn'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

