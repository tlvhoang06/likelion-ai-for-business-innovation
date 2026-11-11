import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import type { CommuneYagiStatus } from '../types/yagi';
import { SHOWCASE_COMMUNES } from '../utils/yagiLogic';

interface TopBarProps {
  communes: CommuneYagiStatus[];
  selectedGid: string | null;
  onSelectCommune: (gid: string | null) => void;
  onOpenAudit: () => void;
}

export function TopBar({
  communes,
  selectedGid,
  onSelectCommune,
  onOpenAudit,
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
        return c ? { commune: c, note: s.tag } : null;
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
              : 'Ngoài vùng UNOSAT',
        });
        if (found.length >= 12) break;
      }
    }
    return found;
  }, [communes, query]);

  const currentCommune = useMemo(
    () => (selectedGid ? communes.find((c) => c.gid_3 === selectedGid) : undefined),
    [communes, selectedGid]
  );

  return (
    <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-2">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="font-mono text-[15px] font-semibold tracking-tight text-ink">
          KỊP THỜI
        </span>
        <span className="text-[12.5px] font-medium text-inkMuted">ResiLend</span>
        <span className="hidden text-lineStrong sm:inline">|</span>
        <span className="text-[12.5px] text-inkMuted">
          Hạ tầng kích hoạt giãn nợ &amp; chi trả chỉ số thiên tai · 2.895 xã GADM v4.1
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Commune Quick Search */}
        <div ref={boxRef} className="relative">
          <div className="flex h-8 items-center gap-1.5 rounded-[4px] border border-line bg-canvas px-2.5 focus-within:border-lineStrong">
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
                  ? `Đang xem: ${currentCommune.name} (${currentCommune.province})`
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
                aria-label={query ? 'Xóa tìm kiếm' : 'Thoát chọn xã về tổng quan'}
                title={query ? 'Xóa chữ tìm kiếm' : 'Thoát chọn xã về tổng quan'}
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
                    ? `Kết quả lọc (${matches.length} xã)`
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
                    Về tổng quan
                  </button>
                )}
              </div>
              <div className="max-h-[280px] overflow-y-auto py-1">
                {matches.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-inkMuted">
                    Không tìm thấy xã phù hợp trong 2.895 xã Bắc Bộ.
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
                            ? 'bg-[#212936] text-ink'
                            : 'text-inkMuted hover:bg-[#1C222D] hover:text-ink'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="truncate font-medium text-ink">{commune.name}</div>
                          <div className="truncate text-[11px] text-inkDim">
                            {commune.district}, {commune.province}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-inkMuted">
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

        <span className="hidden rounded-[4px] border border-line bg-canvas px-2.5 py-1 font-mono text-[11.5px] text-inkMuted xl:inline-flex">
          TT 29/2025 · 10 ngày
        </span>

        <button
          type="button"
          onClick={onOpenAudit}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-line bg-transparent px-2.5 text-[12px] font-medium text-inkMuted transition-colors hover:border-lineStrong hover:bg-panelAlt hover:text-ink"
        >
          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Kiểm chứng &amp; Pháp lý</span>
        </button>
      </div>
    </header>
  );
}

