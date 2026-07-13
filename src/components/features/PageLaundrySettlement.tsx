'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';

interface SettlementRow {
  year: number;
  half_year: string;
  chasu: string;
  cover_count: number;
  pillow_count: number;
  duvet_count: number;
  funnel_count: number;
  amount: number;
  settled: boolean;
}

const CREATE_TABLE_SQL = `CREATE TABLE laundry_settlement (
  year        SMALLINT     NOT NULL,
  half_year   VARCHAR      NOT NULL,
  chasu       VARCHAR      NOT NULL,
  cover_count INTEGER      DEFAULT 0,
  pillow_count INTEGER     DEFAULT 0,
  duvet_count INTEGER      DEFAULT 0,
  funnel_count INTEGER     DEFAULT 0,
  amount      INTEGER      DEFAULT 0,
  settled_at  TIMESTAMPTZ  DEFAULT now(),
  PRIMARY KEY (year, half_year, chasu)
);`;

export function PageLaundrySettlement() {
  const [years,        setYears]        = useState<number[]>([]);
  const [yearHalfMap,  setYearHalfMap]  = useState<Record<number, string[]>>({});
  const [selYear,      setSelYear]      = useState<number | null>(null);
  const [halves,       setHalves]       = useState<string[]>([]);
  const [selHalf,      setSelHalf]      = useState<string>('');
  const [rows,         setRows]         = useState<SettlementRow[]>([]);
  const [checked,      setChecked]      = useState<Set<string>>(new Set());
  const [loading,       setLoading]       = useState(false);
  const [settling,      setSettling]      = useState(false);
  const [cancellingKey, setCancellingKey] = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [noTable,       setNoTable]       = useState(false);

  const supaUrl = '/api/supabase/rest/v1';
  const hdr = { 'Content-Type': 'application/json' };

  const rowKey = (r: Pick<SettlementRow, 'year' | 'half_year' | 'chasu'>) =>
    `${r.year}|${r.half_year}|${r.chasu}`;

  // 초기: 필터 옵션 로드 (laundry_target 기준)
  useEffect(() => {
    fetch(`${supaUrl}/room_assignment?select=year,half_year`, { headers: hdr })
      .then(r => r.json())
      .then((data: { year: number; half_year: string }[]) => {
        const map: Record<number, Set<string>> = {};
        for (const { year, half_year } of data) {
          if (!year || !half_year || year <= 2000) continue;
          if (!map[year]) map[year] = new Set();
          map[year].add(half_year);
        }
        const halfMap: Record<number, string[]> = {};
        for (const [y, s] of Object.entries(map)) halfMap[Number(y)] = [...s].sort();
        setYearHalfMap(halfMap);
        const sorted = Object.keys(halfMap).map(Number).sort((a, b) => b - a);
        setYears(sorted);
        if (sorted.length > 0) {
          const fy = sorted[0];
          setSelYear(fy);
          setHalves(halfMap[fy] ?? []);
          setSelHalf(halfMap[fy]?.[0] ?? '');
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 년도 변경 시 반기 갱신
  useEffect(() => {
    if (selYear === null) return;
    const newHalves = yearHalfMap[selYear] ?? [];
    setHalves(newHalves);
    setSelHalf(newHalves[0] ?? '');
    setRows([]); setChecked(new Set());
  }, [selYear, yearHalfMap]);

  const load = useCallback(async () => {
    if (!selYear || !selHalf) return;
    setLoading(true); setError(null); setNoTable(false);
    try {
      const halfEnc = encodeURIComponent(selHalf);

      // laundry_target + room_assignment(입실인원) + laundry_settlement 병렬 조회
      const [tRes, aRes, sRes] = await Promise.all([
        fetch(
          `${supaUrl}/laundry_target?select=year,half_year,chasu,cover_count,duvet_count,funnel_count,amount&year=eq.${selYear}&half_year=eq.${halfEnc}`,
          { headers: hdr }
        ),
        fetch(
          `${supaUrl}/room_assignment?select=chasu&year=eq.${selYear}&half_year=eq.${halfEnc}`,
          { headers: hdr }
        ),
        fetch(
          `${supaUrl}/laundry_settlement?select=year,half_year,chasu&year=eq.${selYear}&half_year=eq.${halfEnc}`,
          { headers: hdr }
        ),
      ]);

      if (!tRes.ok) {
        const body = await tRes.json().catch(() => ({}));
        throw new Error(body?.message ?? `laundry_target 조회 실패 (${tRes.status})`);
      }
      const targets: { year: number; half_year: string; chasu: string; cover_count: number; duvet_count: number; funnel_count: number; amount: number }[] = await tRes.json();

      // 차수별 입실인원 집계 (배개수 = room_assignment 레코드 수)
      const chasuPillowMap: Record<string, number> = {};
      if (aRes.ok) {
        const assignments: { chasu: string }[] = await aRes.json();
        for (const { chasu } of assignments) {
          if (chasu) chasuPillowMap[chasu] = (chasuPillowMap[chasu] ?? 0) + 1;
        }
      }

      // laundry_settlement 조회 (테이블 없으면 noTable)
      let settledSet = new Set<string>();
      if (sRes.ok) {
        const settlements: { year: number; half_year: string; chasu: string }[] = await sRes.json();
        settledSet = new Set(settlements.map(s => rowKey(s)));
      } else {
        const body = await sRes.json().catch(() => ({}));
        if (body?.code === '42P01') {
          setNoTable(true);
        } else {
          throw new Error(body?.message ?? `laundry_settlement 조회 실패 (${sRes.status})`);
        }
      }

      // year, half_year, chasu 단위로 집계 (배개수는 입실인원으로 산정)
      const grouped: Record<string, SettlementRow> = {};
      for (const t of targets) {
        const k = rowKey(t);
        if (!grouped[k]) {
          grouped[k] = {
            year: t.year, half_year: t.half_year, chasu: t.chasu,
            cover_count: 0, pillow_count: chasuPillowMap[t.chasu] ?? 0,
            duvet_count: 0, funnel_count: 0, amount: 0,
            settled: settledSet.has(k),
          };
        }
        grouped[k].cover_count  += t.cover_count  ?? 0;
        grouped[k].duvet_count  += t.duvet_count  ?? 0;
        grouped[k].funnel_count += t.funnel_count ?? 0;
        grouped[k].amount       += t.amount       ?? 0;
      }

      const sorted = Object.values(grouped).sort((a, b) =>
        a.chasu.localeCompare(b.chasu)
      );
      setRows(sorted);
      setChecked(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selYear, selHalf]);

  const allUnsettledKeys = rows.filter(r => !r.settled).map(rowKey);
  const allChecked = allUnsettledKeys.length > 0 && allUnsettledKeys.every(k => checked.has(k));

  const toggleAll = () => {
    setChecked(allChecked ? new Set() : new Set(allUnsettledKeys));
  };

  const toggleRow = (k: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const handleCancelSettle = async (row: SettlementRow) => {
    setError(null);
    setCancellingKey(rowKey(row));
    try {
      const res = await fetch(
        `${supaUrl}/laundry_settlement?year=eq.${row.year}&half_year=eq.${encodeURIComponent(row.half_year)}&chasu=eq.${encodeURIComponent(row.chasu)}`,
        { method: 'DELETE', headers: hdr }
      );
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.message ?? `정산취소 실패 (${res.status})`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '정산취소 중 오류가 발생했습니다.');
    } finally {
      setCancellingKey(null);
    }
  };

  const handleExcel = async (row: SettlementRow) => {
    setError(null);
    try {
      const enc = encodeURIComponent;
      const cond = `year=eq.${row.year}&half_year=eq.${enc(row.half_year)}&chasu=eq.${enc(row.chasu)}`;

      // laundry_target + category_price + category_price_history 병렬 조회
      const [tRes, pRes, phRes] = await Promise.all([
        fetch(
          `${supaUrl}/laundry_target?select=year,half_year,chasu,room_no,cover_count,pillow_count,duvet_count,funnel_count,amount&${cond}&order=room_no`,
          { headers: hdr }
        ),
        fetch(`${supaUrl}/category_price?select=category_code,unit_price`, { headers: hdr }),
        fetch(`${supaUrl}/category_price_history?select=category_code,unit_price&${cond}`, { headers: hdr }),
      ]);
      if (!tRes.ok) throw new Error('laundry_target 조회 실패');
      const data: { year: number; half_year: string; chasu: string; room_no: string; cover_count: number; pillow_count: number; duvet_count: number; funnel_count: number; amount: number }[] = await tRes.json();

      // 현재 단가로 기본 맵 구성, 이력 단가가 있으면 덮어씀
      const priceMap: Record<string, number> = {};
      const priceData: { category_code: string; unit_price: number }[] = pRes.ok ? await pRes.json() : [];
      for (const { category_code, unit_price } of priceData) priceMap[String(category_code)] = unit_price;
      const phData: { category_code: number; unit_price: number }[] = phRes.ok ? await phRes.json() : [];
      if (Array.isArray(phData) && phData.length > 0) {
        for (const { category_code, unit_price } of phData) priceMap[String(category_code)] = unit_price;
      }

      const p1 = priceMap['1001'] ?? 0;
      const p2 = priceMap['1002'] ?? 0;
      const p3 = priceMap['1003'] ?? 0;
      const p4 = priceMap['1004'] ?? 0;

      const now = new Date();
      const dateStr = `출력일: ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const NUM_COLS = 10;
      const TEXT_COLS = 5; // 번호~객실호수

      // 수량 셀: "count\ncount × price원 = total원" 형식
      const fmtN = (n: number) => n.toLocaleString('ko-KR');
      const calcCell = (count: number, price: number) =>
        `${fmtN(count)}\n${fmtN(count)} × ${fmtN(price)}원 = ${fmtN(count * price)}원`;

      // 행 구성: [0] 출력일행, [1] 헤더, [2..N+1] 데이터, [N+2] 합계
      const printRow  = [...Array(NUM_COLS - 1).fill(''), dateStr];
      const headerRow = ['번호', '년도', '반기구분', '차수', '객실호수', '침대커버수', '배개수', '이불수', '발판수', '금액'];
      const dataRows  = data.map((r, i) => [
        i + 1, r.year, r.half_year, r.chasu, r.room_no + '호',
        calcCell(r.cover_count  ?? 0, p1),
        calcCell(r.pillow_count ?? 0, p2),
        calcCell(r.duvet_count  ?? 0, p3),
        calcCell(r.funnel_count ?? 0, p4),
        r.amount ?? 0,
      ]);
      const totalRow = [
        '합계', '', '', '', '',
        data.reduce((s, r) => s + (r.cover_count  ?? 0), 0),
        data.reduce((s, r) => s + (r.pillow_count ?? 0), 0),
        data.reduce((s, r) => s + (r.duvet_count  ?? 0), 0),
        data.reduce((s, r) => s + (r.funnel_count ?? 0), 0),
        data.reduce((s, r) => s + (r.amount       ?? 0), 0),
      ];
      const aoa = [printRow, headerRow, ...dataRows, totalRow];

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // 열 너비 (수량 컬럼은 계산식 길이 고려해 넓게)
      ws['!cols'] = [{ wch: 6 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 16 }];
      // 행 높이: 데이터 행은 2줄 표시를 위해 40pt, 나머지 25pt
      ws['!rows'] = aoa.map((_, i) => ({
        hpt: (i >= 2 && i < aoa.length - 1) ? 40 : 25,
      }));

      // 스타일
      const border = {
        top:    { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left:   { style: 'thin', color: { rgb: '000000' } },
        right:  { style: 'thin', color: { rgb: '000000' } },
      };
      const blueStyle     = { fill: { patternType: 'solid', fgColor: { rgb: '4472C4' } }, font: { bold: true, color: { rgb: 'FFFFFF' } }, border, alignment: { horizontal: 'center', vertical: 'center' } };
      const blueNumStyle  = { ...blueStyle, alignment: { horizontal: 'right',  vertical: 'center' } };
      const dataTextStyle = { border, alignment: { horizontal: 'center', vertical: 'center' } };
      const dataNumStyle  = { border, alignment: { horizontal: 'right',  vertical: 'center' } };
      const dataCalcStyle = { border, alignment: { horizontal: 'right',  vertical: 'center', wrapText: true } };
      const dateStyle     = { alignment: { horizontal: 'right', vertical: 'center' } };

      const range  = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
      const lastRow = range.e.r;

      for (let R = range.s.r; R <= lastRow; R++) {
        for (let C = 0; C < NUM_COLS; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) ws[addr] = { t: 'z', v: '' };

          if (R === 0) {
            ws[addr].s = C === NUM_COLS - 1 ? dateStyle : {};
          } else if (R === 1) {
            ws[addr].s = blueStyle;
          } else if (R === lastRow) {
            ws[addr].s = C >= TEXT_COLS ? blueNumStyle : blueStyle;
          } else {
            // 수량 4컬럼(5~8)은 계산식 포함 줄바꿈, 금액(9)은 숫자, 텍스트(0~4)는 가운데
            if (C >= TEXT_COLS && C < NUM_COLS - 1) ws[addr].s = dataCalcStyle;
            else if (C === NUM_COLS - 1)             ws[addr].s = dataNumStyle;
            else                                      ws[addr].s = dataTextStyle;
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '세탁대상');
      XLSX.writeFile(wb, `세탁대상_${row.year}_${row.half_year}_${row.chasu}.xlsx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '엑셀 저장 중 오류가 발생했습니다.');
    }
  };

  const handleSettle = async () => {
    const toSettle = rows.filter(r => checked.has(rowKey(r)) && !r.settled);
    if (toSettle.length === 0) return;
    setSettling(true); setError(null);
    try {
      const body = toSettle.map(r => ({
        year: r.year, half_year: r.half_year, chasu: r.chasu,
        cover_count: r.cover_count, pillow_count: r.pillow_count,
        duvet_count: r.duvet_count, funnel_count: r.funnel_count,
        amount: r.amount,
      }));
      const res = await fetch(`${supaUrl}/laundry_settlement`, {
        method: 'POST',
        headers: { ...hdr, Prefer: 'return=minimal,resolution=merge-duplicates' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.message ?? `정산 저장 실패 (${res.status})`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '정산 중 오류가 발생했습니다.');
    } finally {
      setSettling(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('ko-KR');

  const selectedRows  = rows.filter(r => checked.has(rowKey(r)));
  const selCover  = selectedRows.reduce((s, r) => s + r.cover_count,  0);
  const selPillow = selectedRows.reduce((s, r) => s + r.pillow_count, 0);
  const selDuvet  = selectedRows.reduce((s, r) => s + r.duvet_count,  0);
  const selFunnel = selectedRows.reduce((s, r) => s + r.funnel_count, 0);
  const selAmount = selectedRows.reduce((s, r) => s + r.amount,        0);

  const thSt: React.CSSProperties = {
    textAlign: 'left', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    color: 'var(--text-xs)', padding: '10px 14px',
    borderBottom: '2px solid var(--border)', background: 'var(--surface)',
    whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1,
  };
  const tdSt:  React.CSSProperties = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid var(--border)', color: 'var(--text)' };
  const tdNum: React.CSSProperties = { ...tdSt, textAlign: 'right', fontVariantNumeric: 'tabular-nums' as const };
  const selStyle: React.CSSProperties = {
    padding: '6px 12px', fontSize: 13,
    border: '1px solid var(--border)', borderRadius: 7,
    background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer',
  };

  return (
    <div>
      {/* 페이지 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>
            세탁비 정산
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            대상추출 및 확정 데이터를 차수별로 집계하여 정산합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-muted)', cursor: loading ? 'default' : 'pointer',
            }}
          >
            🔄 새로고침
          </button>
          <button
            onClick={handleSettle}
            disabled={settling || checked.size === 0}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 700, borderRadius: 8,
              border: 'none', cursor: (settling || checked.size === 0) ? 'default' : 'pointer',
              background: (settling || checked.size === 0) ? 'var(--border)' : 'var(--accent)',
              color: '#fff', boxShadow: checked.size > 0 ? '0 2px 10px rgba(13,148,136,0.28)' : 'none',
              transition: 'all var(--t)',
            }}
          >
            {settling ? '정산 중…' : `💳 정산 (${checked.size}건)`}
          </button>
        </div>
      </div>

      {/* 조회 조건 */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r)',
        border: '1px solid var(--border)', padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        {/* 년도 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>년도</label>
          <select
            value={selYear ?? ''}
            onChange={e => { setSelYear(Number(e.target.value)); setRows([]); setChecked(new Set()); }}
            style={selStyle}
          >
            {years.map(y => <option key={y} value={y}>{y}년</option>)}
            {years.length === 0 && <option value="">-</option>}
          </select>
        </div>

        {/* 반기구분 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>반기구분</label>
          <select
            value={selHalf}
            onChange={e => { setSelHalf(e.target.value); setRows([]); setChecked(new Set()); }}
            disabled={halves.length === 0}
            style={{ ...selStyle, minWidth: 100 }}
          >
            {halves.length === 0
              ? <option value="">-</option>
              : halves.map(h => <option key={h} value={h}>{h}</option>)
            }
          </select>
        </div>

        <button
          onClick={load}
          disabled={loading || !selYear || !selHalf}
          style={{
            marginLeft: 'auto', padding: '8px 24px', fontSize: 13, fontWeight: 700,
            borderRadius: 8, border: 'none',
            cursor: (loading || !selYear || !selHalf) ? 'default' : 'pointer',
            background: (loading || !selYear || !selHalf) ? 'var(--border)' : 'var(--accent)',
            color: '#fff',
            boxShadow: (loading || !selYear || !selHalf) ? 'none' : '0 2px 10px rgba(13,148,136,0.28)',
            transition: 'all var(--t)',
          }}
        >
          {loading ? '조회 중…' : '조회'}
        </button>
      </div>

      {/* laundry_settlement 테이블 없음 안내 */}
      {noTable && (
        <div style={{
          marginBottom: 20, padding: '16px 20px', borderRadius: 10,
          background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#EA580C', marginBottom: 10 }}>
            ⚠️ laundry_settlement 테이블이 없습니다. Supabase SQL Editor에서 아래 쿼리를 실행해 주세요.
          </div>
          <pre style={{
            background: 'rgba(0,0,0,0.05)', borderRadius: 7, padding: '12px 16px',
            fontSize: 12, color: 'var(--text)', overflowX: 'auto', margin: 0,
            fontFamily: 'monospace', lineHeight: 1.6,
          }}>
            {CREATE_TABLE_SQL}
          </pre>
        </div>
      )}

      {/* 오류 메시지 */}
      {error && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* 선택 합계 바 */}
      {checked.size > 0 && (
        <div style={{
          marginBottom: 16, padding: '12px 20px', borderRadius: 9,
          background: 'var(--accent-bg)', border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
          fontSize: 13, fontWeight: 600, color: 'var(--accent)',
        }}>
          <span>선택 {checked.size}건</span>
          <span>침대커버 {fmt(selCover)}</span>
          <span>배개 {fmt(selPillow)}</span>
          <span>이불 {fmt(selDuvet)}</span>
          <span>발판 {fmt(selFunnel)}</span>
          <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 800 }}>
            합계 {fmt(selAmount)}원
          </span>
        </div>
      )}

      {/* 테이블 */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r)',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow)', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)', fontSize: 14 }}>
            데이터를 불러오는 중…
          </div>
        ) : rows.length === 0 && selYear ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)', fontSize: 14 }}>
            {selYear}년 {selHalf}에 해당하는 정산 데이터가 없습니다.
            먼저 <strong>대상추출 및 확정</strong>에서 데이터를 저장하세요.
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)', fontSize: 14 }}>
            년도와 반기를 선택하세요.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, width: 44, textAlign: 'center', padding: '10px 12px' }}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', width: 15, height: 15 }}
                    />
                  </th>
                  <th style={thSt}>년도</th>
                  <th style={thSt}>반기구분</th>
                  <th style={thSt}>차수</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>침대커버</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>배개</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>이불</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>발판</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>금액</th>
                  <th style={{ ...thSt, textAlign: 'center' }}>정산여부</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const k = rowKey(row);
                  const isChecked = checked.has(k);
                  const isSettled = row.settled;
                  return (
                    <tr
                      key={k}
                      style={{
                        background: isChecked
                          ? 'var(--accent-bg)'
                          : i % 2 === 1 ? 'rgba(0,0,0,0.02)' : 'transparent',
                        opacity: isSettled ? 0.6 : 1,
                        transition: 'background var(--t)',
                      }}
                    >
                      <td style={{ ...tdSt, textAlign: 'center', padding: '10px 12px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isSettled}
                          onChange={() => !isSettled && toggleRow(k)}
                          style={{ cursor: isSettled ? 'default' : 'pointer', width: 15, height: 15 }}
                        />
                      </td>
                      <td style={tdSt}>{row.year}년</td>
                      <td style={tdSt}>{row.half_year}</td>
                      <td style={{ ...tdSt, fontWeight: 600 }}>{row.chasu}</td>
                      <td style={tdNum}>{fmt(row.cover_count)}</td>
                      <td style={tdNum}>{fmt(row.pillow_count)}</td>
                      <td style={tdNum}>{fmt(row.duvet_count)}</td>
                      <td style={tdNum}>{fmt(row.funnel_count)}</td>
                      <td style={{ ...tdNum, fontWeight: 700, color: 'var(--accent)' }}>{fmt(row.amount)}원</td>
                      <td style={{ ...tdSt, textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {isSettled ? (
                            <>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(5,150,105,0.12)', color: '#059669' }}>정산완료</span>
                              <button
                                onClick={() => handleCancelSettle(row)}
                                style={{
                                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                                  border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.07)',
                                  color: '#DC2626', cursor: 'pointer', whiteSpace: 'nowrap',
                                }}
                              >
                                취소
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(107,114,128,0.1)', color: 'var(--text-muted)' }}>미정산</span>
                          )}
                          <button
                            onClick={() => handleExcel(row)}
                            disabled={!isSettled || cancellingKey === k}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                              border: '1px solid rgba(13,148,136,0.35)',
                              background: (!isSettled || cancellingKey === k) ? 'rgba(0,0,0,0.04)' : 'rgba(13,148,136,0.07)',
                              color: (!isSettled || cancellingKey === k) ? 'var(--text-xs)' : 'var(--accent)',
                              cursor: (!isSettled || cancellingKey === k) ? 'default' : 'pointer',
                              whiteSpace: 'nowrap',
                              opacity: (!isSettled || cancellingKey === k) ? 0.45 : 1,
                            }}
                          >
                            엑셀
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--accent-bg)' }}>
                  <td colSpan={4} style={{ ...tdSt, fontWeight: 700, fontSize: 12, color: 'var(--text-muted)' }}>
                    합계 ({rows.length}건)
                  </td>
                  <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(rows.reduce((s, r) => s + r.cover_count,  0))}</td>
                  <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(rows.reduce((s, r) => s + r.pillow_count, 0))}</td>
                  <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(rows.reduce((s, r) => s + r.duvet_count,  0))}</td>
                  <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(rows.reduce((s, r) => s + r.funnel_count, 0))}</td>
                  <td style={{ ...tdNum, fontWeight: 700, color: 'var(--accent)' }}>
                    {fmt(rows.reduce((s, r) => s + r.amount, 0))}원
                  </td>
                  <td style={tdSt} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
