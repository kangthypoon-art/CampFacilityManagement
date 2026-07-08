'use client';

import { useState, useEffect } from 'react';

interface TargetRow {
  year: number;
  half_year: string;
  chasu: string;
  cover_count: number;
  pillow_count: number;
  duvet_count: number;
  funnel_count: number;
  amount: number;
}

const PALETTE = ['#4472C4', '#ED7D31', '#A9D18E', '#FF6B6B', '#5B9BD5', '#70AD47', '#FFC000', '#9DC3E6'];
const CAT_COLORS = ['#4472C4', '#ED7D31', '#A9D18E', '#FF6B6B'];
const CAT_LABELS = ['침대커버', '배개', '이불', '발판'];

// ─── Rose Chart (Nightingale / Polar Area) ───────────────────────────────────

interface RoseSlice { key: string; label: string; amount: number; color: string }

function RoseChart({ slices, selectedKey, onSelect }: {
  slices: RoseSlice[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const fmt = (n: number) => n.toLocaleString('ko-KR');

  if (slices.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>데이터 없음</div>;
  }

  const SIZE = 240, cx = SIZE / 2, cy = SIZE / 2;
  const MAX_R = 100, MIN_R = 20;
  const n = slices.length;
  // Guard against all-zero amounts — render uniform petals at MIN_R
  const maxAmt = Math.max(...slices.map(s => s.amount), 1);
  const angleStep = (2 * Math.PI) / n;
  // Small angular gap between petals (skip when n===1 to avoid degenerate arc)
  const GAP = n > 1 ? Math.min(0.04, angleStep * 0.08) : 0;

  const gridRs = [0.25, 0.5, 0.75, 1.0].map(f => MIN_R + f * (MAX_R - MIN_R));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <svg width={SIZE} height={SIZE}>
        {/* grid circles */}
        {gridRs.map((r, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke="#e2e8f0" strokeWidth={0.8} strokeDasharray="4 3" />
        ))}
        {/* petals */}
        {slices.map((s, i) => {
          const r = MIN_R + (s.amount / maxAmt) * (MAX_R - MIN_R);
          // n===1: draw a full circle (arc from same point is degenerate in SVG)
          if (n === 1) {
            return (
              <circle key={s.key} cx={cx} cy={cy} r={r}
                fill={s.color}
                stroke="#ffffff" strokeWidth={selectedKey === s.key ? 3 : 1.5}
                opacity={selectedKey && selectedKey !== s.key ? 0.42 : 1}
                onClick={() => onSelect(s.key)}
                style={{ cursor: 'pointer' }}
              />
            );
          }
          const sa = -Math.PI / 2 + i * angleStep + GAP;
          const ea = -Math.PI / 2 + (i + 1) * angleStep - GAP;
          const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
          const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
          const largeArc = (angleStep - GAP * 2) > Math.PI ? 1 : 0;
          const d = `M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
          return (
            <path key={s.key} d={d}
              fill={s.color}
              stroke="#ffffff" strokeWidth={selectedKey === s.key ? 3 : 1.5}
              opacity={selectedKey && selectedKey !== s.key ? 0.42 : 1}
              onClick={() => onSelect(s.key)}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
            />
          );
        })}
        {/* center dot */}
        <circle cx={cx} cy={cy} r={6} fill="#ffffff" stroke="#cbd5e1" strokeWidth={1} />
      </svg>

      {/* legend */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {slices.map(s => (
          <div key={s.key} onClick={() => onSelect(s.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              padding: '4px 8px', borderRadius: 7,
              background: selectedKey === s.key ? 'var(--accent-bg)' : 'transparent',
              opacity: selectedKey && selectedKey !== s.key ? 0.5 : 1,
              transition: 'all 0.15s',
            }}>
            <div style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, flex: 1, color: 'var(--text)' }}>{s.label}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {fmt(s.amount)}원
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Charts ───────────────────────────────────────────────────────────────

interface BarItem { label: string; value: number; color: string }

// ─── Vertical Bar Chart (카테고리 하단용) ────────────────────────────────────

function VBarChart({ bars }: { bars: BarItem[] }) {
  if (bars.length === 0) return null;
  const fmt = (n: number) => n.toLocaleString('ko-KR');
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const chartH = 150, topPad = 24, axisH = 36;
  const barW = Math.min(60, Math.max(36, Math.floor(300 / bars.length) - 10));
  const gap = 36;
  const totalW = bars.length * (barW + gap) + gap;

  return (
    <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
      <svg width={totalW} height={chartH + topPad + axisH}>
        {bars.map((b, i) => {
          const bh = Math.max((b.value / maxVal) * chartH, 2);
          const x = gap + i * (barW + gap);
          const y = topPad + chartH - bh;
          return (
            <g key={b.label}>
              <rect x={x} y={y} width={barW} height={bh} fill={b.color} rx={4} />
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9}
                style={{ fill: 'var(--text-muted)' }}>
                {fmt(b.value)}
              </text>
              <text x={x + barW / 2} y={topPad + chartH + 16} textAnchor="middle" fontSize={10}
                style={{ fill: 'var(--text-muted)' }}>
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Vertical Bar Chart (차수별 금액) ────────────────────────────────────────

interface ComboItem { label: string; bar: number; line: number }

function ComboChart({ items, selectedLabel, onSelect }: {
  items: ComboItem[];
  selectedLabel?: string | null;
  onSelect?: (label: string) => void;
}) {
  if (items.length === 0) return null;

  const fmtCompact = (n: number) =>
    n >= 100_000_000 ? `${(n / 100_000_000).toFixed(1)}억`
    : n >= 10_000_000 ? `${Math.round(n / 10_000_000)}천만`
    : n >= 10_000    ? `${Math.round(n / 10_000)}만`
    : String(n);

  const CHART_H = 200, PAD_T = 32, PAD_B = 44, PAD_L = 52, PAD_R = 16;
  const PLOT_W  = 496;
  const n       = items.length;
  const GROUP_W = PLOT_W / Math.max(n, 1);
  const BAR_W   = Math.min(GROUP_W * 0.55, 52);
  const TOTAL_W = PAD_L + PLOT_W + PAD_R;
  const TOTAL_H = PAD_T + CHART_H + PAD_B;

  const maxVal = Math.max(...items.map(i => i.line), 1);
  const cx  = (i: number) => PAD_L + i * GROUP_W + GROUP_W / 2;
  const bx  = (i: number) => cx(i) - BAR_W / 2;
  const by  = (v: number) => PAD_T + CHART_H - (v / maxVal) * CHART_H;
  const bh  = (v: number) => Math.max((v / maxVal) * CHART_H, 2);

  const GRID = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg
      viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {/* Grid + left Y-axis labels */}
      {GRID.map((f, gi) => {
        const y = PAD_T + CHART_H * (1 - f);
        return (
          <g key={gi}>
            <line x1={PAD_L} y1={y} x2={PAD_L + PLOT_W} y2={y}
              stroke="var(--border)" strokeWidth={0.8} strokeDasharray="4 3"/>
            <text x={PAD_L - 6} y={y} textAnchor="end" fontSize={9}
              fill="var(--text-muted)" dominantBaseline="middle">
              {fmtCompact(Math.round(maxVal * f))}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {items.map((item, i) => {
        const color      = PALETTE[i % PALETTE.length];
        const isSelected = selectedLabel === item.label;
        return (
          <g key={item.label}
            onClick={() => onSelect?.(item.label)}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            <rect
              x={bx(i)} y={by(item.line)} width={BAR_W} height={bh(item.line)}
              fill={color} rx={4}
              opacity={selectedLabel && !isSelected ? 0.35 : 1}
              style={{ transition: 'opacity 0.15s' }}
            />
            {isSelected && (
              <rect x={bx(i)} y={by(item.line)} width={BAR_W} height={bh(item.line)}
                fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} rx={4}/>
            )}
            <text x={cx(i)} y={by(item.line) - 7}
              textAnchor="middle" fontSize={10} fontWeight="700" fill={color}>
              {fmtCompact(item.line)}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {items.map((item, i) => (
        <text key={`xl-${item.label}`}
          x={cx(i)} y={PAD_T + CHART_H + 18}
          textAnchor="middle" fontSize={11} fill="var(--text-muted)">
          {item.label}
        </text>
      ))}

      {/* Axes */}
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CHART_H}
        stroke="var(--border)" strokeWidth={1}/>
      <line x1={PAD_L} y1={PAD_T + CHART_H} x2={PAD_L + PLOT_W} y2={PAD_T + CHART_H}
        stroke="var(--border)" strokeWidth={1}/>
    </svg>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function PageLaundryDashboard() {
  const [data,       setData]       = useState<TargetRow[]>([]);
  const [prices,     setPrices]     = useState<Record<string, number>>({});
  const [loading,    setLoading]    = useState(true);
  const [fetchErr,   setFetchErr]   = useState<string | null>(null);
  const [selYear,    setSelYear]    = useState<number | null>(null);
  const [selHalfKey, setSelHalfKey] = useState<string | null>(null);
  const [selChasu,   setSelChasu]   = useState<string | null>(null);

  const supaUrl = '/api/supabase/rest/v1';
  const hdr = { 'Content-Type': 'application/json' };
  const fmt = (n: number) => n.toLocaleString('ko-KR');

  useEffect(() => {
    setFetchErr(null);
    Promise.all([
      fetch(`${supaUrl}/laundry_target?select=year,half_year,chasu,cover_count,pillow_count,duvet_count,funnel_count,amount`, { headers: hdr }),
      fetch(`${supaUrl}/category_price?select=category_code,unit_price`, { headers: hdr }),
    ])
      .then(async ([tRes, pRes]) => {
        const rows = await tRes.json();
        const priceRows = await pRes.json();
        if (!Array.isArray(rows)) {
          setFetchErr(`laundry_target 오류: ${JSON.stringify(rows)}`);
          return;
        }
        setData(rows);
        // 현재 년도를 기본 선택, 없으면 가장 최근 년도
        const curYear = new Date().getFullYear();
        const availYears = [...new Set((rows as TargetRow[]).map(r => r.year))];
        setSelYear(availYears.includes(curYear) ? curYear : (availYears.length > 0 ? Math.max(...availYears) : null));
        const pm: Record<string, number> = {};
        if (Array.isArray(priceRows)) {
          for (const { category_code, unit_price } of priceRows) pm[category_code] = unit_price;
        }
        setPrices(pm);
      })
      .catch(e => setFetchErr(String(e)))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 년도 목록 (내림차순)
  const years = [...new Set(data.map(r => r.year))].sort((a, b) => b - a);

  // 년도 필터 적용
  const filteredData = selYear ? data.filter(r => r.year === selYear) : data;

  // 년도/반기별 집계
  const halfMap = new Map<string, { label: string; amount: number }>();
  for (const r of filteredData) {
    const k = `${r.year}|${r.half_year}`;
    const cur = halfMap.get(k) ?? { label: `${r.year}년 ${r.half_year}`, amount: 0 };
    cur.amount += r.amount ?? 0;
    halfMap.set(k, cur);
  }
  const halfEntries = [...halfMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const roseSlices: RoseSlice[] = halfEntries.map(([k, v], i) => ({
    key: k, label: v.label, amount: v.amount, color: PALETTE[i % PALETTE.length],
  }));

  // 차수별 집계 (선택 반기) — 금액 + 건수
  const chasuMap      = new Map<string, number>();
  const chasuCountMap = new Map<string, number>();
  if (selHalfKey) {
    const [sy, sh] = selHalfKey.split('|');
    for (const r of filteredData) {
      if (String(r.year) === sy && r.half_year === sh) {
        chasuMap.set(r.chasu, (chasuMap.get(r.chasu) ?? 0) + (r.amount ?? 0));
        const cnt = (r.cover_count ?? 0) + (r.pillow_count ?? 0) + (r.duvet_count ?? 0) + (r.funnel_count ?? 0);
        chasuCountMap.set(r.chasu, (chasuCountMap.get(r.chasu) ?? 0) + cnt);
      }
    }
  }
  const chasuComboItems: ComboItem[] = [...chasuMap.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map(chasu => ({
      label: `${chasu}차수`,
      bar:  chasuCountMap.get(chasu) ?? 0,
      line: chasuMap.get(chasu) ?? 0,
    }));

  // 카테고리별 건수/금액 (선택 차수)
  const catCounts = [0, 0, 0, 0];
  // selChasu is display label e.g. "1차수" — strip suffix for DB comparison
  const rawChasu = selChasu ? selChasu.replace(/차수$/, '').trim() : '';
  if (selHalfKey && rawChasu) {
    const [sy, sh] = selHalfKey.split('|');
    for (const r of filteredData) {
      if (String(r.year) === sy && r.half_year === sh && r.chasu === rawChasu) {
        catCounts[0] += r.cover_count  ?? 0;
        catCounts[1] += r.pillow_count ?? 0;
        catCounts[2] += r.duvet_count  ?? 0;
        catCounts[3] += r.funnel_count ?? 0;
      }
    }
  }
  const catPriceKeys = ['1001', '1002', '1003', '1004'];
  const catAmounts  = catCounts.map((c, i) => c * (prices[catPriceKeys[i]] ?? 0));
  const countBars:  BarItem[] = CAT_LABELS.map((l, i) => ({ label: l, value: catCounts[i],  color: CAT_COLORS[i] }));
  const amountBars: BarItem[] = CAT_LABELS.map((l, i) => ({ label: l, value: catAmounts[i], color: CAT_COLORS[i] }));

  const selHalfLabel = selHalfKey ? (halfMap.get(selHalfKey)?.label ?? '') : '';

  const card: React.CSSProperties = {
    background: 'var(--surface)', borderRadius: 'var(--r)',
    border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '20px 24px',
  };
  const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text)' };
  const sub: React.CSSProperties = { fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 };
  const hint: React.CSSProperties = { textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)', fontSize: 13 };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>로딩 중…</div>;
  }
  if (fetchErr) {
    return <div style={{ padding: 24, color: '#dc2626', fontSize: 13, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
      데이터 로드 실패: {fetchErr}
    </div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>세탁관리</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>년도·반기·차수별 세탁 비용 현황</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>년도</label>
          <select
            value={selYear ?? ''}
            onChange={e => {
              const v = e.target.value;
              setSelYear(v === '' ? null : Number(v));
              setSelHalfKey(null);
              setSelChasu(null);
            }}
            style={{
              fontSize: 13, padding: '5px 10px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text)', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">전체</option>
            {years.map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </div>
      </div>

      {/* 상단: Rose Chart + 차수 수평 막대 */}
      <div style={{ display: 'grid', gridTemplateColumns: '634px 1fr', gap: 20, marginBottom: 20 }}>
        {/* Rose Chart */}
        <div style={card}>
          <div style={cardTitle}>년도/반기별 금액</div>
          <RoseChart
            slices={roseSlices}
            selectedKey={selHalfKey}
            onSelect={key => {
              setSelHalfKey(prev => prev === key ? null : key);
              setSelChasu(null);
            }}
          />
        </div>

        {/* 차수 수평 막대 */}
        <div style={card}>
          <div style={cardTitle}>
            차수별 금액
            {selHalfLabel && <span style={sub}>— {selHalfLabel}</span>}
          </div>
          {!selHalfKey ? (
            <div style={hint}>← 왼쪽 그래프에서 년도/반기를 선택하세요</div>
          ) : chasuComboItems.length === 0 ? (
            <div style={hint}>해당 기간 데이터 없음</div>
          ) : (
            <ComboChart
              items={chasuComboItems}
              selectedLabel={selChasu}
              onSelect={label => setSelChasu(prev => prev === label ? null : label)}
            />
          )}
        </div>
      </div>

      {/* 하단: 항목별 건수/금액 수직 막대 */}
      {selChasu && (() => {
        const totalCount  = catCounts.reduce((a, b) => a + b, 0);
        const totalAmount = catAmounts.reduce((a, b) => a + b, 0);
        const totalSt: React.CSSProperties = {
          fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--accent)',
        };
        const totalLabelSt: React.CSSProperties = {
          fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2,
        };
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={cardTitle} >
                  항목별 건수
                  <span style={sub}>— {selHalfLabel} · {selChasu}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={totalLabelSt}>총 건수</div>
                  <div style={totalSt}>{fmt(totalCount)}<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 3 }}>건</span></div>
                </div>
              </div>
              <VBarChart bars={countBars} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: 12, justifyContent: 'center' }}>
                {CAT_LABELS.map((l, i) => (
                  <span key={l} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ color: CAT_COLORS[i], fontWeight: 700 }}>{l}</span>&nbsp;{fmt(catCounts[i])}건
                  </span>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={cardTitle}>
                  항목별 금액
                  <span style={sub}>— {selHalfLabel} · {selChasu}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={totalLabelSt}>총 금액</div>
                  <div style={totalSt}>{fmt(totalAmount)}<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 3 }}>원</span></div>
                </div>
              </div>
              <VBarChart bars={amountBars} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: 12, justifyContent: 'center' }}>
                {CAT_LABELS.map((l, i) => (
                  <span key={l} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ color: CAT_COLORS[i], fontWeight: 700 }}>{l}</span>&nbsp;{fmt(catAmounts[i])}원
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
