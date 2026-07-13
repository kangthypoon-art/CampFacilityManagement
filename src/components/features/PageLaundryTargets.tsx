'use client';

import { useState, useEffect, useCallback } from 'react';

interface LaundryRow {
  room_no: string;
  year: number;
  half_year: string;
  chasu: string;
  cover_count: number;
  pillow_count: number;
  duvet_count: number;
  funnel_count: number;
  amount: number;
}

interface AddDraft {
  year: string; half_year: string; chasu: string; room_no: string;
  cover_count: string; pillow_count: string; duvet_count: string; funnel_count: string;
}

export function PageLaundryTargets() {
  const [years,            setYears]            = useState<number[]>([]);
  const [yearHalfMap,      setYearHalfMap]      = useState<Record<number, string[]>>({});
  const [yearHalfChasuMap, setYearHalfChasuMap] = useState<Record<number, Record<string, string[]>>>({});
  const [selYear,          setSelYear]          = useState<number | null>(null);
  const [halves,           setHalves]           = useState<string[]>([]);
  const [selHalf,          setSelHalf]          = useState('');
  const [chasues,          setChasues]          = useState<string[]>([]);
  const [selChasu,         setSelChasu]         = useState('');
  const [rows,             setRows]             = useState<LaundryRow[]>([]);
  const [prices,           setPrices]           = useState<Record<string, number>>({});
  const [categoryRows,     setCategoryRows]     = useState<{ category_code: number; category_name: string; unit_price: number; is_active: string }[]>([]);
  const [activePrices,     setActivePrices]     = useState<Record<string, number>>({});
  const [roomOptions,      setRoomOptions]      = useState<string[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [saved,            setSaved]            = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [editingIdx,       setEditingIdx]       = useState<number | null>(null);
  const [editDraft,        setEditDraft]        = useState({ cover_count: 0, pillow_count: 0, duvet_count: 0, funnel_count: 0 });
  const [addMode,          setAddMode]          = useState(false);
  const [addDraft,         setAddDraft]         = useState<AddDraft>({ year: '', half_year: '', chasu: '', room_no: '', cover_count: '', pillow_count: '', duvet_count: '', funnel_count: '' });
  const [addCommit,        setAddCommit]        = useState<Set<string>>(new Set());
  const [historyExists,    setHistoryExists]    = useState(false);
  const [fromHistory,      setFromHistory]      = useState(false);

  const supaUrl = '/api/supabase/rest/v1';
  const hdr = { 'Content-Type': 'application/json' };

  useEffect(() => {
    Promise.all([
      fetch(`${supaUrl}/room_assignment?select=year,half_year,chasu`, { headers: hdr }).then(r => r.json()),
      fetch(`${supaUrl}/category_price?select=category_code,category_name,unit_price,is_active&order=category_code`, { headers: hdr }).then(r => r.json()),
      fetch(`${supaUrl}/room_master?category_code=eq.1000&seq=eq.1&select=room_no&order=room_no`, { headers: hdr }).then(r => r.json()),
    ]).then(([assignments, priceRows, roomRows]: [
      { year: number; half_year: string; chasu: string }[],
      { category_code: number; category_name: string; unit_price: number; is_active: string }[],
      { room_no: string }[],
    ]) => {
      const halfSet:  Record<number, Set<string>> = {};
      const chasuSet: Record<number, Record<string, Set<string>>> = {};
      for (const { year, half_year, chasu } of assignments) {
        if (!year || !half_year || year <= 2000) continue;
        if (!halfSet[year]) halfSet[year] = new Set();
        halfSet[year].add(half_year);
        if (!chasuSet[year]) chasuSet[year] = {};
        if (!chasuSet[year][half_year]) chasuSet[year][half_year] = new Set();
        if (chasu) chasuSet[year][half_year].add(chasu);
      }
      const halfMap: Record<number, string[]> = {};
      for (const [y, s] of Object.entries(halfSet)) halfMap[Number(y)] = [...s].sort();
      const chasuMap: Record<number, Record<string, string[]>> = {};
      for (const [y, hmap] of Object.entries(chasuSet)) {
        chasuMap[Number(y)] = {};
        for (const [h, cs] of Object.entries(hmap)) chasuMap[Number(y)][h] = [...cs].sort();
      }
      setYearHalfMap(halfMap);
      setYearHalfChasuMap(chasuMap);
      const sorted = Object.keys(halfMap).map(Number).sort((a, b) => b - a);
      setYears(sorted);
      if (sorted.length > 0) {
        const fy = sorted[0]; const fh = halfMap[fy]?.[0] ?? ''; const fc = chasuMap[fy]?.[fh]?.[0] ?? '';
        setSelYear(fy); setHalves(halfMap[fy] ?? []); setSelHalf(fh); setChasues(chasuMap[fy]?.[fh] ?? []); setSelChasu(fc);
      }
      const pm: Record<string, number> = {};
      for (const { category_code, unit_price } of priceRows) pm[String(category_code)] = unit_price;
      setPrices(pm);
      setActivePrices(pm);
      setCategoryRows(Array.isArray(priceRows) ? priceRows : []);
      setRoomOptions(roomRows.map(r => r.room_no));
    }).catch(() => setError('기초 데이터 조회 중 오류가 발생했습니다.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selYear === null) return;
    const h = yearHalfMap[selYear] ?? [];
    setHalves(h); setSelHalf(h[0] ?? '');
    setRows([]); setSaved(false); setHistoryExists(false); setFromHistory(false);
  }, [selYear, yearHalfMap]);

  useEffect(() => {
    if (selYear === null) return;
    const c = yearHalfChasuMap[selYear]?.[selHalf] ?? [];
    setChasues(c); setSelChasu(c[0] ?? '');
  }, [selHalf, selYear, yearHalfChasuMap]);

  // 공통 추출 로직 (room_master + room_assignment 기반)
  // priceMap: category_price_history 이력 단가가 있으면 전달, 없으면 현재 prices 사용
  const runExtract = useCallback(async (year: number, half: string, chasu: string, priceMap?: Record<string, number>): Promise<LaundryRow[]> => {
    const [masters, assignments] = await Promise.all([
      fetch(`${supaUrl}/room_master?category_code=eq.1000&seq=eq.1&select=room_no,guest_count&order=room_no`, { headers: hdr }).then(r => r.json()),
      fetch(`${supaUrl}/room_assignment?year=eq.${year}&half_year=eq.${encodeURIComponent(half)}&chasu=eq.${encodeURIComponent(chasu)}&select=room_no`, { headers: hdr }).then(r => r.json()),
    ]) as [{ room_no: string; guest_count: number }[], { room_no: string }[]];

    const roomList = masters.map((m: { room_no: string }) => m.room_no).sort();
    const guestCountMap: Record<string, number> = {};
    for (const { room_no, guest_count } of masters) guestCountMap[room_no] = guest_count ?? 0;

    const assignedRooms = new Set(assignments.map((a: { room_no: string }) => a.room_no));
    const duvetMap: Record<string, number> = {};
    const pillowMap: Record<string, number> = {};
    for (const { room_no } of assignments) {
      duvetMap[room_no]  = (duvetMap[room_no]  ?? 0) + 1;
      pillowMap[room_no] = (pillowMap[room_no] ?? 0) + 1;
    }
    const pm = priceMap ?? prices;
    const p1 = pm['1001'] ?? 0, p2 = pm['1002'] ?? 0, p3 = pm['1003'] ?? 0, p4 = pm['1004'] ?? 0;
    return roomList.filter((room_no: string) => assignedRooms.has(room_no)).map((room_no: string) => {
      const cover  = guestCountMap[room_no] ?? 0;
      const pillow = pillowMap[room_no] ?? 0;
      const duvet  = duvetMap[room_no]  ?? 0;
      return { room_no, year, half_year: half, chasu, cover_count: cover, pillow_count: pillow, duvet_count: duvet, funnel_count: 1, amount: cover * p1 + pillow * p2 + duvet * p3 + 1 * p4 };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices]);

  // category_price_history 조회 → 단가 맵 반환 (없으면 null)
  const fetchHistPrices = async (year: number, half: string, chasu: string): Promise<Record<string, number> | null> => {
    const res = await fetch(
      `${supaUrl}/category_price_history?year=eq.${year}&half_year=eq.${encodeURIComponent(half)}&chasu=eq.${encodeURIComponent(chasu)}&select=category_code,unit_price`,
      { headers: hdr }
    );
    if (!res.ok) return null;
    const rows: { category_code: number; unit_price: number }[] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const pm: Record<string, number> = {};
    for (const { category_code, unit_price } of rows) pm[String(category_code)] = unit_price;
    return pm;
  };

  // 대상 추출: laundry_history 먼저 확인 → 있으면 표시, 없으면 추출
  // 어느 경우든 category_price_history 단가가 있으면 그 값을 activePrices에 반영
  const generate = async () => {
    if (!selYear) return;
    setLoading(true); setError(null); setSaved(false); setEditingIdx(null); setAddMode(false);
    try {
      // 가격 이력 조회 (있으면 우선 사용, 없으면 현재 단가 사용)
      const histPm = await fetchHistPrices(selYear, selHalf, selChasu);
      const ap = histPm ?? prices;
      setActivePrices(ap);

      const histRes = await fetch(
        `${supaUrl}/laundry_history?year=eq.${selYear}&half_year=eq.${encodeURIComponent(selHalf)}&chasu=eq.${encodeURIComponent(selChasu)}&select=*&order=room_no`,
        { headers: hdr }
      );
      if (histRes.ok) {
        const rawHist = await histRes.json();
        if (Array.isArray(rawHist) && rawHist.length > 0) {
          const histData: LaundryRow[] = rawHist.map((r: Record<string, unknown>) => ({
            year:          Number(r.year),
            half_year:     String(r.half_year ?? ''),
            chasu:         String(r.chasu ?? ''),
            room_no:       String(r.room_no ?? ''),
            cover_count:   Number(r.cover_count  ?? 0),
            pillow_count:  Number(r.pillow_count ?? 0),
            duvet_count:   Number(r.duvet_count  ?? 0),
            funnel_count:  Number(r.funnel_count ?? 0),
            amount:        Number(r.amount       ?? 0),
          }));
          setRows(histData);
          setHistoryExists(true);
          setFromHistory(true);
          return;
        }
      }
      // history 없음 → 신규 추출 (이력 단가 적용)
      setHistoryExists(false);
      setFromHistory(false);
      const extracted = await runExtract(selYear, selHalf, selChasu, ap);
      setRows(extracted);
    } catch { setError('데이터 조회 중 오류가 발생했습니다.'); }
    finally { setLoading(false); }
  };

  // 초기화: laundry_history + category_price_history 삭제 → 재추출
  const resetHistory = async () => {
    if (!selYear) return;
    setLoading(true); setError(null); setSaved(false); setEditingIdx(null); setAddMode(false);
    try {
      const enc = encodeURIComponent;
      const condition = `year=eq.${selYear}&half_year=eq.${enc(selHalf)}&chasu=eq.${enc(selChasu)}`;
      const [delH, delPH] = await Promise.all([
        fetch(`${supaUrl}/laundry_history?${condition}`,        { method: 'DELETE', headers: hdr }),
        fetch(`${supaUrl}/category_price_history?${condition}`, { method: 'DELETE', headers: hdr }),
      ]);
      if (!delH.ok)  throw new Error(`초기화 실패 (laundry_history ${delH.status})`);
      if (!delPH.ok) throw new Error(`초기화 실패 (category_price_history ${delPH.status})`);
      setHistoryExists(false);
      setFromHistory(false);
      // 가격 이력이 삭제됐으므로 현재 단가로 재추출
      setActivePrices(prices);
      const extracted = await runExtract(selYear, selHalf, selChasu, prices);
      setRows(extracted);
    } catch (e) { setError(e instanceof Error ? e.message : '초기화 중 오류가 발생했습니다.'); }
    finally { setLoading(false); }
  };

  // 확정: laundry_target + laundry_history 저장
  const save = async () => {
    if (!selYear || rows.length === 0) return;
    setSaving(true); setError(null);
    try {
      const chkRes = await fetch(
        `${supaUrl}/laundry_settlement?year=eq.${selYear}&half_year=eq.${encodeURIComponent(selHalf)}&chasu=eq.${encodeURIComponent(selChasu)}&select=year`,
        { headers: hdr }
      );
      if (chkRes.ok) {
        const settled: unknown[] = await chkRes.json();
        if (settled.length > 0) {
          setError(`⚠ ${selYear}년 ${selHalf} ${selChasu}은(는) 이미 정산 완료된 항목입니다. 정산을 취소한 후 다시 저장하세요.`);
          return;
        }
      }

      const body = rows.map(({ room_no, cover_count, pillow_count, duvet_count, funnel_count, amount }) =>
        ({ year: selYear!, half_year: selHalf, chasu: selChasu, room_no, cover_count, pillow_count, duvet_count, funnel_count, amount }));

      // laundry_target 저장
      const delT = await fetch(
        `${supaUrl}/laundry_target?year=eq.${selYear}&half_year=eq.${encodeURIComponent(selHalf)}&chasu=eq.${encodeURIComponent(selChasu)}`,
        { method: 'DELETE', headers: hdr }
      );
      if (!delT.ok) throw new Error(`저장 실패 (laundry_target 삭제 ${delT.status})`);
      const insT = await fetch(`${supaUrl}/laundry_target`, { method: 'POST', headers: { ...hdr, Prefer: 'return=minimal' }, body: JSON.stringify(body) });
      if (!insT.ok) throw new Error(`저장 실패 (laundry_target 삽입 ${insT.status})`);

      // laundry_history 저장
      const delH = await fetch(
        `${supaUrl}/laundry_history?year=eq.${selYear}&half_year=eq.${encodeURIComponent(selHalf)}&chasu=eq.${encodeURIComponent(selChasu)}`,
        { method: 'DELETE', headers: hdr }
      );
      if (!delH.ok) throw new Error(`저장 실패 (laundry_history 삭제 ${delH.status})`);
      const insH = await fetch(`${supaUrl}/laundry_history`, { method: 'POST', headers: { ...hdr, Prefer: 'return=minimal' }, body: JSON.stringify(body) });
      if (!insH.ok) throw new Error(`저장 실패 (laundry_history 삽입 ${insH.status})`);

      // category_price_history 저장 (확정 시점 단가 스냅샷)
      if (categoryRows.length > 0) {
        const priceHistBody = categoryRows.map(r => ({
          year: selYear!, half_year: selHalf, chasu: selChasu,
          category_code: r.category_code,
          category_name: r.category_name,
          unit_price: r.unit_price,
          is_active: r.is_active,
        }));
        const delPH = await fetch(
          `${supaUrl}/category_price_history?year=eq.${selYear}&half_year=eq.${encodeURIComponent(selHalf)}&chasu=eq.${encodeURIComponent(selChasu)}`,
          { method: 'DELETE', headers: hdr }
        );
        if (!delPH.ok) throw new Error(`저장 실패 (category_price_history 삭제 ${delPH.status})`);
        const insPH = await fetch(`${supaUrl}/category_price_history`, { method: 'POST', headers: { ...hdr, Prefer: 'return=minimal' }, body: JSON.stringify(priceHistBody) });
        if (!insPH.ok) throw new Error(`저장 실패 (category_price_history 삽입 ${insPH.status})`);
      }

      setHistoryExists(true);
      setFromHistory(true);
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.'); }
    finally { setSaving(false); }
  };

  const calcAmt = (d: { cover_count: number; pillow_count: number; duvet_count: number; funnel_count: number }) =>
    d.cover_count * (activePrices['1001'] ?? 0) + d.pillow_count * (activePrices['1002'] ?? 0) + d.duvet_count * (activePrices['1003'] ?? 0) + d.funnel_count * (activePrices['1004'] ?? 0);

  const startEdit = (idx: number) => {
    const r = rows[idx];
    setEditDraft({ cover_count: r.cover_count, pillow_count: r.pillow_count, duvet_count: r.duvet_count, funnel_count: r.funnel_count });
    setEditingIdx(idx); setAddMode(false); setSaved(false);
  };
  const confirmEdit = (idx: number) => {
    setRows(rows.map((r, i) => i === idx ? { ...r, ...editDraft, amount: calcAmt(editDraft) } : r));
    setEditingIdx(null);
  };
  const deleteRow = (idx: number) => { setRows(rows.filter((_, i) => i !== idx)); setSaved(false); };

  const openAdd = () => {
    setEditingIdx(null);
    setAddDraft({ year: String(selYear ?? ''), half_year: selHalf, chasu: selChasu, room_no: '', cover_count: '', pillow_count: '', duvet_count: '', funnel_count: '' });
    setAddCommit(new Set());
    setAddMode(true); setSaved(false);
  };
  const commitAddFld = (f: string) => setAddCommit(s => { const n = new Set(s); n.add(f); return n; });
  const confirmAdd = () => {
    if (!addDraft.room_no.trim()) { setError('객실호수를 입력하세요.'); return; }
    const d = { cover_count: Number(addDraft.cover_count) || 0, pillow_count: Number(addDraft.pillow_count) || 0, duvet_count: Number(addDraft.duvet_count) || 0, funnel_count: Number(addDraft.funnel_count) || 0 };
    setRows([...rows, { room_no: addDraft.room_no.trim(), year: Number(addDraft.year) || selYear!, half_year: addDraft.half_year || selHalf, chasu: addDraft.chasu || selChasu, ...d, amount: calcAmt(d) }]);
    setAddMode(false);
  };

  const fmt = (n: number) => n.toLocaleString('ko-KR');
  const totalCover  = rows.reduce((s, r) => s + r.cover_count,  0);
  const totalPillow = rows.reduce((s, r) => s + r.pillow_count, 0);
  const totalDuvet  = rows.reduce((s, r) => s + r.duvet_count,  0);
  const totalFunnel = rows.reduce((s, r) => s + r.funnel_count, 0);
  const totalAmount = rows.reduce((s, r) => s + r.amount,       0);

  const thSt: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-xs)', padding: '10px 14px', borderBottom: '2px solid var(--border)', background: 'var(--surface)', whiteSpace: 'nowrap' };
  const tdSt: React.CSSProperties = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid var(--border)', color: 'var(--text)' };
  const tdNum: React.CSSProperties = { ...tdSt, textAlign: 'right', fontVariantNumeric: 'tabular-nums' as const };
  const selStyle: React.CSSProperties = { padding: '6px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' };
  const inputSt: React.CSSProperties = { width: 70, padding: '3px 6px', fontSize: 12, border: '1px solid var(--accent)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)', textAlign: 'right' };
  const textInSt: React.CSSProperties = { width: '100%', padding: '3px 6px', fontSize: 12, border: '1px solid var(--accent)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)' };
  const btnBase: React.CSSProperties = { padding: '3px 9px', fontSize: 11, fontWeight: 600, borderRadius: 5, border: 'none', cursor: 'pointer' };
  const btnEdit_:   React.CSSProperties = { ...btnBase, background: '#3B82F6', color: '#fff' };
  const btnDel_:    React.CSSProperties = { ...btnBase, background: '#EF4444', color: '#fff', marginLeft: 4 };
  const btnSave_:   React.CSSProperties = { ...btnBase, background: '#0d9488', color: '#fff' };
  const btnCancel_: React.CSSProperties = { ...btnBase, background: '#6B7280', color: '#fff', marginLeft: 4 };

  const fmlDiv = (count: number, price: number) => (
    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>
      {fmt(count)} × {fmt(price)}원 = {fmt(count * price)}원
    </div>
  );

  const allHalves  = [...new Set(Object.values(yearHalfMap).flat())].sort();
  const allChasues = [...new Set(Object.values(yearHalfChasuMap).flatMap(hm => Object.values(hm).flat()))].sort();
  const showTable  = rows.length > 0 || addMode;
  const canGenerate = !loading && !!selYear && !!selChasu;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>세탁 대상 추출 및 확정</h1>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>년도</label>
          <select value={selYear ?? ''} onChange={e => { setSelYear(Number(e.target.value)); setRows([]); setSaved(false); setHistoryExists(false); setFromHistory(false); }} style={selStyle}>
            {years.map(y => <option key={y} value={y}>{y}년</option>)}
            {years.length === 0 && <option value="">-</option>}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>반기구분</label>
          <select value={selHalf} onChange={e => { setSelHalf(e.target.value); setRows([]); setSaved(false); setHistoryExists(false); setFromHistory(false); }} disabled={halves.length === 0} style={{ ...selStyle, minWidth: 100 }}>
            {halves.length === 0 ? <option value="">-</option> : halves.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>차수</label>
          <select value={selChasu} onChange={e => { setSelChasu(e.target.value); setRows([]); setSaved(false); setHistoryExists(false); setFromHistory(false); }} disabled={chasues.length === 0} style={{ ...selStyle, minWidth: 80 }}>
            {chasues.length === 0 ? <option value="">-</option> : chasues.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {/* 초기화 버튼 */}
          <button
            onClick={resetHistory}
            disabled={!canGenerate || !historyExists}
            title="laundry_history · category_price_history 삭제 후 재추출"
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none',
              cursor: (!canGenerate || !historyExists) ? 'default' : 'pointer',
              background: (!canGenerate || !historyExists) ? 'var(--border)' : '#F97316',
              color: '#fff', transition: 'all var(--t)',
            }}
          >
            🔄 초기화
          </button>
          {/* 대상 추출 버튼 */}
          <button
            onClick={generate}
            disabled={!canGenerate}
            style={{
              padding: '8px 24px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none',
              cursor: canGenerate ? 'pointer' : 'default',
              background: canGenerate ? 'var(--accent)' : 'var(--border)',
              color: '#fff', boxShadow: canGenerate ? '0 2px 10px rgba(13,148,136,0.28)' : 'none', transition: 'all var(--t)',
            }}
          >
            {loading ? '조회 중…' : '대상 추출'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
          ⚠ {error}
        </div>
      )}

      {showTable && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{selYear}년 {selHalf} {selChasu} 세탁 대상 목록</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>총 {rows.length}개 객실 · {fmt(totalAmount)}원</span>
              {fromHistory && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0d9488', background: 'rgba(13,148,136,0.10)', padding: '2px 10px', borderRadius: 20, border: '1px solid rgba(13,148,136,0.25)' }}>
                  ✓ 확정 이력
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {saved && <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>✓ 저장완료</span>}
              <button onClick={openAdd} disabled={addMode}
                style={{ padding: '7px 16px', fontSize: 13, fontWeight: 700, borderRadius: 7, border: 'none', cursor: addMode ? 'default' : 'pointer', background: addMode ? 'var(--border)' : '#8B5CF6', color: '#fff' }}>
                ＋ 추가
              </button>
              <button
                onClick={save}
                disabled={saving || historyExists}
                title={historyExists ? '이미 확정된 항목입니다. 초기화 후 다시 확정하세요.' : ''}
                style={{
                  padding: '7px 20px', fontSize: 13, fontWeight: 700, borderRadius: 7, border: 'none',
                  cursor: (saving || historyExists) ? 'default' : 'pointer',
                  background: historyExists ? '#059669' : saving ? 'var(--border)' : '#0d9488',
                  color: '#fff', opacity: (saving || historyExists) ? 0.75 : 1,
                }}
              >
                {saving ? '저장 중…' : historyExists ? '✓ 확정됨' : '확정'}
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, width: 44 }}>번호</th>
                  <th style={thSt}>년도</th>
                  <th style={thSt}>반기구분</th>
                  <th style={thSt}>차수</th>
                  <th style={thSt}>객실호수</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>침대커버수</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>이불수</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>배개수</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>발판수</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>금액</th>
                  <th style={{ ...thSt, textAlign: 'center', width: 130 }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const p1 = activePrices['1001'] ?? 0, p2 = activePrices['1002'] ?? 0, p3 = activePrices['1003'] ?? 0, p4 = activePrices['1004'] ?? 0;
                  const isEditing = editingIdx === i;
                  return (
                    <tr key={row.room_no + '|' + row.year + '|' + row.chasu + '|' + i} style={{ background: i % 2 === 1 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                      <td style={{ ...tdSt, color: 'var(--text-xs)' }}>{i + 1}</td>
                      <td style={tdSt}>{row.year}년</td>
                      <td style={tdSt}>{row.half_year}</td>
                      <td style={tdSt}>{row.chasu}</td>
                      <td style={{ ...tdSt, fontWeight: 600 }}>{row.room_no}호</td>
                      <td style={tdNum}>
                        {isEditing ? (
                          <><input type="number" min={0} value={editDraft.cover_count} onChange={e => setEditDraft(d => ({ ...d, cover_count: Math.max(0, Number(e.target.value)) }))} style={inputSt} />
                          {editDraft.cover_count > 0 && fmlDiv(editDraft.cover_count, p1)}</>
                        ) : (<>{fmt(row.cover_count)}{fmlDiv(row.cover_count, p1)}</>)}
                      </td>
                      <td style={tdNum}>
                        {isEditing ? (
                          <><input type="number" min={0} value={editDraft.duvet_count} onChange={e => setEditDraft(d => ({ ...d, duvet_count: Math.max(0, Number(e.target.value)) }))} style={inputSt} />
                          {editDraft.duvet_count > 0 && fmlDiv(editDraft.duvet_count, p3)}</>
                        ) : (<>{fmt(row.duvet_count)}{fmlDiv(row.duvet_count, p3)}</>)}
                      </td>
                      <td style={tdNum}>
                        {isEditing ? (
                          <><input type="number" min={0} value={editDraft.pillow_count} onChange={e => setEditDraft(d => ({ ...d, pillow_count: Math.max(0, Number(e.target.value)) }))} style={inputSt} />
                          {editDraft.pillow_count > 0 && fmlDiv(editDraft.pillow_count, p2)}</>
                        ) : (<>{fmt(row.pillow_count)}{fmlDiv(row.pillow_count, p2)}</>)}
                      </td>
                      <td style={tdNum}>
                        {isEditing ? (
                          <><input type="number" min={0} value={editDraft.funnel_count} onChange={e => setEditDraft(d => ({ ...d, funnel_count: Math.max(0, Number(e.target.value)) }))} style={inputSt} />
                          {editDraft.funnel_count > 0 && fmlDiv(editDraft.funnel_count, p4)}</>
                        ) : (<>{row.funnel_count}{fmlDiv(row.funnel_count, p4)}</>)}
                      </td>
                      <td style={{ ...tdNum, fontWeight: 700, color: 'var(--accent)' }}>
                        {isEditing ? fmt(calcAmt(editDraft)) + '원' : fmt(row.amount) + '원'}
                      </td>
                      <td style={{ ...tdSt, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {isEditing ? (
                          <>
                            <button onClick={() => confirmEdit(i)} style={btnSave_}>저장</button>
                            <button onClick={() => setEditingIdx(null)} style={btnCancel_}>취소</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(i)} style={btnEdit_}>변경</button>
                            <button onClick={() => deleteRow(i)} style={btnDel_}>삭제</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {addMode && (
                  <tr style={{ background: 'rgba(139,92,246,0.06)' }}>
                    <td style={{ ...tdSt, color: 'var(--text-xs)', textAlign: 'center', fontWeight: 700 }}>+</td>
                    <td style={tdSt}>
                      <input list="dl-year" value={addDraft.year} onChange={e => setAddDraft(d => ({ ...d, year: e.target.value }))} style={textInSt} />
                      <datalist id="dl-year">{years.map(y => <option key={y} value={y} />)}</datalist>
                    </td>
                    <td style={tdSt}>
                      <input list="dl-half" value={addDraft.half_year} onChange={e => setAddDraft(d => ({ ...d, half_year: e.target.value }))} style={textInSt} />
                      <datalist id="dl-half">{allHalves.map(h => <option key={h} value={h} />)}</datalist>
                    </td>
                    <td style={tdSt}>
                      <input list="dl-chasu" value={addDraft.chasu} onChange={e => setAddDraft(d => ({ ...d, chasu: e.target.value }))} style={textInSt} />
                      <datalist id="dl-chasu">{allChasues.map(c => <option key={c} value={c} />)}</datalist>
                    </td>
                    <td style={tdSt}>
                      <input list="dl-room" value={addDraft.room_no} onChange={e => setAddDraft(d => ({ ...d, room_no: e.target.value }))} style={textInSt} placeholder="객실호수" />
                      <datalist id="dl-room">{roomOptions.map(r => <option key={r} value={r} />)}</datalist>
                    </td>
                    {(['cover_count', 'duvet_count', 'pillow_count', 'funnel_count'] as const).map((field, fi) => {
                      const priceKey = ['1001','1003','1002','1004'][fi];
                      const val = Number(addDraft[field]) || 0;
                      const price = activePrices[priceKey] ?? 0;
                      const committed = addCommit.has(field);
                      return (
                        <td key={field} style={tdNum}>
                          <input type="number" min={0} value={addDraft[field]}
                            onChange={e => setAddDraft(d => ({ ...d, [field]: e.target.value }))}
                            onBlur={() => commitAddFld(field)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') commitAddFld(field); }}
                            style={inputSt} />
                          {committed && val > 0 && fmlDiv(val, price)}
                        </td>
                      );
                    })}
                    <td style={{ ...tdNum, fontWeight: 700, color: 'var(--accent)' }}>
                      {fmt(calcAmt({ cover_count: Number(addDraft.cover_count)||0, pillow_count: Number(addDraft.pillow_count)||0, duvet_count: Number(addDraft.duvet_count)||0, funnel_count: Number(addDraft.funnel_count)||0 }))}원
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button onClick={confirmAdd} style={btnSave_}>저장</button>
                      <button onClick={() => setAddMode(false)} style={btnCancel_}>취소</button>
                    </td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--accent-bg)' }}>
                    <td colSpan={5} style={{ ...tdSt, fontWeight: 700, fontSize: 12, color: 'var(--text-muted)' }}>합계</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(totalCover)}</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(totalDuvet)}</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(totalPillow)}</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(totalFunnel)}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: 'var(--accent)' }}>{fmt(totalAmount)}원</td>
                    <td style={tdSt} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {!showTable && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)', fontSize: 14 }}>
          년도·반기·차수를 선택한 후 <strong>대상 추출</strong> 버튼을 클릭하세요.
        </div>
      )}
    </div>
  );
}
