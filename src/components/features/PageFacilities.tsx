'use client';

import { useState, useEffect, useMemo } from 'react';

interface MasterRow {
  room_no: string;
  category_code: string;
  seq: number;
  floor: number;
  guest_count: number;
}

interface PriceRow {
  category_code: string;
  category_name: string;
  unit_price: number;
  is_active: string;
}

interface JoinedRow extends MasterRow {
  category_name: string;
  unit_price: number;
}

interface CatStat {
  code: string;
  name: string;
  count: number;
  color: string;
  unit: string;
}

const PALETTE = ['#0D9488','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#10B981','#EC4899','#6366F1','#F97316','#14B8A6'];

const UNIT_MAP: Record<string, string> = {
  '입실인원': '명',
  '침대커버': '개',
  '배개':    '개',
  '이불':    '개',
  '발판':    '개',
  '소화기':  '개',
  'CCTV':    '개',
};
const unitOf = (name: string) => UNIT_MAP[name] ?? '개';

// ── Doughnut ──────────────────────────────────────────────────────────────────

function pXY(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function donutPath(cx: number, cy: number, rO: number, rI: number, a1: number, a2: number) {
  const o1 = pXY(cx, cy, rO, a1), o2 = pXY(cx, cy, rO, a2);
  const i1 = pXY(cx, cy, rI, a1), i2 = pXY(cx, cy, rI, a2);
  const lg = a2 - a1 > Math.PI ? 1 : 0;
  return `M ${o1.x} ${o1.y} A ${rO} ${rO} 0 ${lg} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${rI} ${rI} 0 ${lg} 0 ${i1.x} ${i1.y} Z`;
}

function DoughnutChart({ stats, selCode, onSelect }: {
  stats: CatStat[]; selCode: string; onSelect: (c: string) => void;
}) {
  const SZ = 200, CX = 100, CY = 100, RO = 84, RI = 50;
  const total = stats.reduce((s, c) => s + c.count, 0);

  if (total === 0) {
    return (
      <div style={{ width: SZ, height: SZ, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        데이터 없음
      </div>
    );
  }

  let a = -Math.PI / 2;
  const segs = stats.map(s => {
    const start = a;
    a += (s.count / total) * 2 * Math.PI;
    return { ...s, start, end: a };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <svg width={SZ} height={SZ} style={{ overflow: 'visible', flexShrink: 0 }}>
        {segs.map(seg => {
          const isSel = selCode === seg.code;
          const mid = (seg.start + seg.end) / 2;
          const ox = (isSel ? 7 : 0) * Math.cos(mid);
          const oy = (isSel ? 7 : 0) * Math.sin(mid);
          return (
            <path key={seg.code}
              d={donutPath(CX + ox, CY + oy, RO, RI, seg.start, seg.end)}
              fill={seg.color}
              opacity={selCode && selCode !== seg.code ? 0.4 : 1}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => onSelect(selCode === seg.code ? '' : seg.code)}
            />
          );
        })}
        <text x={CX} y={CY - 10} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 22, fontWeight: 700, fill: 'var(--text)', pointerEvents: 'none' }}>
          {total}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px', width: '100%' }}>
        {stats.map(s => (
          <div key={s.code}
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: selCode && selCode !== s.code ? 0.4 : 1, transition: 'opacity 0.2s' }}
            onClick={() => onSelect(selCode === s.code ? '' : s.code)}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.name} ({s.count}{s.unit})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal Bar Chart (CSS div) ───────────────────────────────────────────

function HBarChart({ stats, selCode, onSelect }: {
  stats: CatStat[]; selCode: string; onSelect: (c: string) => void;
}) {
  const max = Math.max(...stats.map(s => s.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {stats.map(s => {
        const pct = (s.count / max) * 100;
        const isSel = selCode === s.code;
        return (
          <div key={s.code}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => onSelect(isSel ? '' : s.code)}>
            {/* label */}
            <div style={{ width: 100, fontSize: 12, color: isSel ? s.color : 'var(--text-muted)', fontWeight: isSel ? 700 : 400, textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.2s' }}>
              {s.name}
            </div>
            {/* track */}
            <div style={{ flex: 1, position: 'relative', height: 28, borderRadius: 6, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`, background: s.color, opacity: selCode && !isSel ? 0.3 : 1, borderRadius: 6, transition: 'width 0.45s ease, opacity 0.2s' }} />
              {/* selection stripe */}
              {isSel && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: s.color, filter: 'brightness(0.7)' }} />}
            </div>
            {/* count */}
            <div style={{ width: 52, fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'right', flexShrink: 0 }}>
              {s.count}{s.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function PageFacilities() {
  const [masters,  setMasters]  = useState<MasterRow[]>([]);
  const [prices,   setPrices]   = useState<PriceRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selFloor, setSelFloor] = useState('');
  const [selCode,  setSelCode]  = useState('');

  const supaUrl = '/api/supabase/rest/v1';
  const hdr = { 'Content-Type': 'application/json' };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${supaUrl}/room_master?select=room_no,category_code,seq,floor,guest_count&order=room_no,category_code,seq`, { headers: hdr }).then(r => r.json()),
      fetch(`${supaUrl}/category_price?select=category_code,category_name,unit_price,is_active&order=category_code`, { headers: hdr }).then(r => r.json()),
    ]).then(([m, p]: [MasterRow[], PriceRow[]]) => {
      setMasters(Array.isArray(m) ? m : []);
      setPrices(Array.isArray(p) ? p : []);
    }).catch(console.error).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceMap = useMemo(() => {
    const m: Record<string, PriceRow> = {};
    for (const p of prices) m[String(p.category_code)] = p;
    return m;
  }, [prices]);

  const joined = useMemo<JoinedRow[]>(() => masters.map(m => {
    const p = priceMap[String(m.category_code)];
    return { ...m, category_name: p?.category_name ?? String(m.category_code), unit_price: p?.unit_price ?? 0 };
  }), [masters, priceMap]);

  const filtered = useMemo(() =>
    selFloor ? joined.filter(r => String(r.floor) === selFloor) : joined,
  [joined, selFloor]);

  const stats = useMemo<CatStat[]>(() => {
    const map: Record<string, { name: string; count: number }> = {};
    for (const r of filtered) {
      const k = String(r.category_code);
      if (!map[k]) map[k] = { name: r.category_name, count: 0 };
      map[k].count += (r.guest_count ?? 0);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, v], i) => ({ code, name: v.name, count: v.count, color: PALETTE[i % PALETTE.length], unit: unitOf(v.name) }));
  }, [filtered]);

  const detailRows = useMemo<JoinedRow[]>(() =>
    selCode ? filtered.filter(r => String(r.category_code) === selCode) : [],
  [filtered, selCode]);

  const selStat = stats.find(s => s.code === selCode);
  const floors  = useMemo(() => [...new Set(masters.map(m => String(m.floor)))].sort(), [masters]);
  const fmt     = (n: number) => n.toLocaleString('ko-KR');

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>로딩 중…</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: 'calc(100vh - var(--header-h) - 56px)', overflow: 'hidden' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', margin: 0 }}>설비현황</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>room_master × category_price — 항목별·층별 현황</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 2 }}>층 필터</span>
          {['', ...floors].map(f => (
            <button key={f} onClick={() => { setSelFloor(f); setSelCode(''); }}
              style={{ padding: '5px 14px', borderRadius: 7, border: `1px solid ${selFloor === f ? 'var(--accent)' : 'var(--border)'}`, background: selFloor === f ? 'var(--accent)' : 'var(--surface)', color: selFloor === f ? '#fff' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
              {f ? `${f}층` : '전체'}
            </button>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'flex', gap: 18, flexShrink: 0 }}>

        {/* Doughnut card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 20px', width: 280, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>항목 구성 비율</div>
          <DoughnutChart stats={stats} selCode={selCode} onSelect={setSelCode} />
        </div>

        {/* HBar card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 20px', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            항목별 건수
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              클릭 시 상세 목록 표시
            </span>
          </div>
          <div style={{ marginTop: 12 }}>
            <HBarChart stats={stats} selCode={selCode} onSelect={setSelCode} />
          </div>
        </div>
      </div>

      {/* Detail area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selCode ? (
          <div style={{ background: 'var(--surface)', border: `1px solid ${selStat?.color ?? 'var(--border)'}`, borderRadius: 'var(--r)', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Detail header */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: selStat?.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{selStat?.name ?? selCode}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {detailRows.length}개 항목</span>
              <button onClick={() => setSelCode('')}
                style={{ marginLeft: 'auto', padding: '3px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
                닫기
              </button>
            </div>
            {/* Detail table */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['번호','객실호수','층','SEQ','정원(명)','단가'].map((h, i) => (
                      <th key={h} style={{ padding: '8px 16px', textAlign: i === 5 ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-xs)', background: 'var(--bg)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', position: 'sticky', top: 0 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((r, i) => (
                    <tr key={`${r.room_no}-${r.category_code}-${r.seq}`}
                      style={{ background: i % 2 === 1 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                      <td style={{ padding: '7px 16px', color: 'var(--text-xs)' }}>{i + 1}</td>
                      <td style={{ padding: '7px 16px', fontWeight: 600 }}>{r.room_no}호</td>
                      <td style={{ padding: '7px 16px' }}>{r.floor}층</td>
                      <td style={{ padding: '7px 16px' }}>{r.seq}</td>
                      <td style={{ padding: '7px 16px' }}>{r.guest_count}</td>
                      <td style={{ padding: '7px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.unit_price)}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--r)', color: 'var(--text-muted)', fontSize: 13 }}>
            차트에서 항목을 클릭하면 상세 목록이 표시됩니다
          </div>
        )}
      </div>
    </div>
  );
}
