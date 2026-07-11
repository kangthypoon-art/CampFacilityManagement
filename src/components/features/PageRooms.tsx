'use client';

import { useState, useEffect, useRef } from 'react';
import { Floor2SVG } from './Floor2SVG';
import { Floor3SVG } from './Floor3SVG';
import { generateWordReport, type RoomReportData, type LaundryReportData, type SettlementRow as ReportSettlementRow } from '@/lib/wordReport';

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface OccFloor { floor: string; total: number; occupied: number; rate: string; }
interface OccupancyData { total: number; occupied: number; rate: string; floors: OccFloor[]; }

interface AssignmentRow {
  year: number; half_year: string; room_no: string; chasu: string; seq: number;
  name?: string; school?: string; grade?: number; gender?: string;
  check_in_ymd?: string; check_out_ymd?: string;
}

interface StatItem {
  label: string; value: string | number; color: string; icon: string;
  change?: string; changeType?: 'up' | 'down'; period?: string;
  floors?: { floor: string; count: number }[];
  occupancy?: OccupancyData; noClick?: boolean;
}

// ── 순수 계산 헬퍼 ────────────────────────────────────────────────────────────

function groupByFloor(rows: { room_no: string }[]) {
  const map: Record<string, number> = {};
  for (const { room_no } of rows) { const f = room_no[0]; map[f] = (map[f] ?? 0) + 1; }
  const floors = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    .map(([f, count]) => ({ floor: `${f}층`, count }));
  return { total: rows.length, floors };
}

function groupGuestCount(masters: { room_no: string; guest_count: number }[]) {
  const map: Record<string, number> = {};
  let total = 0;
  for (const { room_no, guest_count } of masters) {
    const f = room_no[0];
    const g = guest_count ?? 0;
    map[f] = (map[f] ?? 0) + g;
    total += g;
  }
  const floors = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    .map(([f, count]) => ({ floor: `${f}층`, count }));
  return { total, floors };
}

function computeOccupancy(
  masters1: { room_no: string }[],
  curAssignments: AssignmentRow[],
): OccupancyData {
  const occupiedSet = new Set(curAssignments.map(a => a.room_no));
  const floorMap: Record<string, { total: number; occupied: number }> = {};
  for (const { room_no } of masters1) {
    const f = room_no[0];
    if (!floorMap[f]) floorMap[f] = { total: 0, occupied: 0 };
    floorMap[f].total++;
    if (occupiedSet.has(room_no)) floorMap[f].occupied++;
  }
  const total = masters1.length;
  const occupied = masters1.filter(m => occupiedSet.has(m.room_no)).length;
  return {
    total, occupied,
    rate: total > 0 ? (occupied / total * 100).toFixed(1) + '%' : '0%',
    floors: Object.entries(floorMap).sort(([a], [b]) => a.localeCompare(b))
      .map(([f, { total: t, occupied: o }]) => ({
        floor: `${f}층`, total: t, occupied: o,
        rate: t > 0 ? (o / t * 100).toFixed(1) + '%' : '0%',
      })),
  };
}

function computeCheckInRate(
  masters1: { room_no: string; guest_count: number }[],
  curAssignments: AssignmentRow[],
): OccupancyData {
  const capFloor: Record<string, number> = {};
  for (const { room_no, guest_count } of masters1) {
    const f = room_no[0];
    capFloor[f] = (capFloor[f] ?? 0) + (guest_count ?? 0);
  }
  const asgFloor: Record<string, number> = {};
  for (const { room_no } of curAssignments) { const f = room_no[0]; asgFloor[f] = (asgFloor[f] ?? 0) + 1; }
  const total    = masters1.reduce((s, m) => s + (m.guest_count ?? 0), 0);
  const occupied = curAssignments.length;
  return {
    total, occupied,
    rate: total > 0 ? (occupied / total * 100).toFixed(1) + '%' : '0%',
    floors: Object.keys(capFloor).sort().map(f => ({
      floor: `${f}층`, total: capFloor[f], occupied: asgFloor[f] ?? 0,
      rate: capFloor[f] > 0 ? ((asgFloor[f] ?? 0) / capFloor[f] * 100).toFixed(1) + '%' : '0%',
    })),
  };
}

// ── 스타일 ────────────────────────────────────────────────────────────────────

const STAT_COLORS = ['var(--accent)', 'var(--green)', 'var(--blue)', 'var(--orange)'];

const selSt: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', borderRadius: 7,
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  cursor: 'pointer',
};

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export function PageRooms() {


  // ── 원시 데이터 ──
  const [masters1Raw,    setMasters1Raw]    = useState<{ room_no: string; seq: number; category_code: string; guest_count: number }[]>([]);
  const [mastersAllRaw,  setMastersAllRaw]  = useState<{ room_no: string; seq: number }[]>([]);
  const [assignmentsRaw, setAssignmentsRaw] = useState<AssignmentRow[]>([]);
  const [dataVersion,    setDataVersion]    = useState(0);

  // ── 선택 상태 ──
  const [selYear,  setSelYear]  = useState<number | null>(null);
  const [selHalf,  setSelHalf]  = useState<string | null>(null);
  const [selChasu, setSelChasu] = useState<string | null>(null);
  const initialized = useRef(false);

  // ── UI 상태 ──
  const [selectedStat,  setSelectedStat]  = useState<string | null>(null);
  const [editingKey,    setEditingKey]    = useState<string | null>(null);
  // ── 층별 배치도 인터랙션 상태 ──
  const [floorSelectedRoom, setFloorSelectedRoom] = useState<string | null>(null);
  const [floorHoveredRoom,  setFloorHoveredRoom]  = useState<string | null>(null);
  const [nameSearch,        setNameSearch]        = useState('');
  const [editForm,      setEditForm]      = useState<Partial<AssignmentRow>>({});
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [addForm,       setAddForm]       = useState<Partial<AssignmentRow>>({});
  const [formError,     setFormError]     = useState<string | null>(null);
  const [saving,           setSaving]           = useState(false);
  const [confirmDelete,    setConfirmDelete]    = useState<string | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);

  // ── 데이터 로드 ──
  useEffect(() => {
    fetch('/api/rooms')
      .then(r => r.json())
      .then((data: { masters1?: { room_no: string; seq: number; category_code: string; guest_count: number }[]; mastersAll?: { room_no: string; seq: number }[]; assignments?: AssignmentRow[] }) => {
        const masters1 = data.masters1 ?? [];
        const mastersAll = data.mastersAll ?? [];
        const assignments = data.assignments ?? [];

        setMasters1Raw([...masters1].sort((a, b) => a.room_no.localeCompare(b.room_no)));
        setMastersAllRaw([...mastersAll].sort((a, b) => a.room_no.localeCompare(b.room_no) || a.seq - b.seq));
        setAssignmentsRaw([...assignments].sort((a, b) =>
          a.year - b.year || a.half_year.localeCompare(b.half_year) ||
          a.chasu.localeCompare(b.chasu) || a.room_no.localeCompare(b.room_no) || a.seq - b.seq
        ));

        // 최초 1회만 기본 선택값 초기화 (최신 년도·반기·차수)
        if (!initialized.current && assignments.length > 0) {
          initialized.current = true;
          let latestYear = 0, latestHalf = '';
          for (const a of assignments) {
            if (a.year > latestYear || (a.year === latestYear && a.half_year > latestHalf)) {
              latestYear = a.year; latestHalf = a.half_year;
            }
          }
          const chasus = [...new Set(
            assignments.filter(a => a.year === latestYear && a.half_year === latestHalf).map(a => a.chasu)
          )].sort();
          setSelYear(latestYear);
          setSelHalf(latestHalf);
          setSelChasu(chasus[chasus.length - 1] ?? null);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);

  // ── 선택 변경 핸들러 (cascade) ──
  const handleYearChange = (year: number | null) => {
    setSelYear(year);
    if (year) {
      const halfs = [...new Set(assignmentsRaw.filter(r => r.year === year).map(r => r.half_year))].sort();
      const h = halfs[halfs.length - 1] ?? null;
      setSelHalf(h);
      if (h) {
        const cs = [...new Set(assignmentsRaw.filter(r => r.year === year && r.half_year === h).map(r => r.chasu))].sort();
        setSelChasu(cs[cs.length - 1] ?? null);
      } else { setSelChasu(null); }
    } else { setSelHalf(null); setSelChasu(null); }
  };

  const handleHalfChange = (half: string | null) => {
    setSelHalf(half);
    if (selYear && half) {
      const cs = [...new Set(assignmentsRaw.filter(r => r.year === selYear && r.half_year === half).map(r => r.chasu))].sort();
      setSelChasu(cs[cs.length - 1] ?? null);
    } else { setSelChasu(null); }
  };

  // ── 선택지 목록 ──
  const availYears  = [...new Set(assignmentsRaw.map(r => r.year))].sort((a, b) => a - b);
  const availHalfs  = selYear
    ? [...new Set(assignmentsRaw.filter(r => r.year === selYear).map(r => r.half_year))].sort()
    : [];
  const availChasus = (selYear && selHalf)
    ? [...new Set(assignmentsRaw.filter(r => r.year === selYear && r.half_year === selHalf).map(r => r.chasu))].sort()
    : [];

  // ── 필터된 배정 데이터 ──
  const filteredAssignments = assignmentsRaw.filter(r =>
    (!selYear  || r.year      === selYear) &&
    (!selHalf  || r.half_year === selHalf) &&
    (!selChasu || r.chasu     === selChasu)
  );

  // ── 파생 통계 ──
  const floorData    = groupByFloor(masters1Raw) as { total: number; floors: { floor: string; count: number }[] };
  const guestData    = groupGuestCount(masters1Raw);
  const occupancy    = computeOccupancy(masters1Raw, filteredAssignments);
  const checkInRate  = computeCheckInRate(masters1Raw, filteredAssignments);
  const occupiedRoomNos = new Set(filteredAssignments.map(a => a.room_no));

  // ── 보고서 다운로드 ──
  const handleReportDownload = async () => {
    if (!selYear || !selHalf || !selChasu) {
      alert('년도, 반기, 차수를 모두 선택한 후 보고서를 생성하세요.');
      return;
    }
    setReportGenerating(true);
    try {
      const halfEnc  = encodeURIComponent(selHalf);
      const chasuEnc = encodeURIComponent(selChasu);

      const [tRes, pRes] = await Promise.all([
        fetch(`/api/supabase/rest/v1/laundry_target?select=room_no,cover_count,pillow_count,duvet_count,funnel_count,amount&year=eq.${selYear}&half_year=eq.${halfEnc}&chasu=eq.${chasuEnc}&order=room_no`, { headers: { 'Content-Type': 'application/json' } }),
        fetch('/api/supabase/rest/v1/category_price?select=category_code,unit_price', { headers: { 'Content-Type': 'application/json' } }),
      ]);

      type LTarget = { room_no: string; cover_count: number; pillow_count: number; duvet_count: number; funnel_count: number; amount: number };
      const targets: LTarget[] = tRes.ok ? await tRes.json() : [];
      const priceRows: { category_code: string; unit_price: number }[] = pRes.ok ? await pRes.json() : [];
      const priceMap: Record<string, number> = {};
      for (const { category_code, unit_price } of priceRows) priceMap[category_code] = Number(unit_price) || 0;

      const catCounts  = [0, 0, 0, 0];
      const catAmounts = [0, 0, 0, 0];
      const prices = ['1001', '1002', '1003', '1004'].map(k => priceMap[k] ?? 0);

      for (const t of Array.isArray(targets) ? targets : []) {
        catCounts[0] += t.cover_count  ?? 0;
        catCounts[1] += t.pillow_count ?? 0;
        catCounts[2] += t.duvet_count  ?? 0;
        catCounts[3] += t.funnel_count ?? 0;
      }
      catAmounts[0] = catCounts[0] * prices[0];
      catAmounts[1] = catCounts[1] * prices[1];
      catAmounts[2] = catCounts[2] * prices[2];
      catAmounts[3] = catCounts[3] * prices[3];

      const roomData: RoomReportData = {
        year: selYear, half_year: selHalf, chasu: selChasu,
        totalRooms: floorData.total,
        roomFloors: floorData.floors,
        occupancyRate: occupancy.rate,
        occupancyOccupied: occupancy.occupied,
        occupancyTotal: occupancy.total,
        occupancyFloors: occupancy.floors,
        totalGuests: guestData.total,
        guestFloors: guestData.floors,
        checkInRate: checkInRate.rate,
        checkInOccupied: checkInRate.occupied,
        checkInTotal: checkInRate.total,
        checkInFloors: checkInRate.floors,
      };

      const laundryData: LaundryReportData = {
        catCounts, catAmounts,
        totalCount:  catCounts.reduce((a, b) => a + b, 0),
        totalAmount: catAmounts.reduce((a, b) => a + b, 0),
      };

      const settlementRows: ReportSettlementRow[] = Array.isArray(targets)
        ? targets.map(t => ({
            chasu: selChasu,
            room_no: t.room_no,
            cover_count:  t.cover_count  ?? 0,
            pillow_count: t.pillow_count ?? 0,
            duvet_count:  t.duvet_count  ?? 0,
            funnel_count: t.funnel_count ?? 0,
            amount:       t.amount       ?? 0,
          }))
        : [];

      await generateWordReport(roomData, laundryData, settlementRows);
    } catch (e) {
      alert(`보고서 생성 중 오류: ${(e as Error).message}`);
    } finally {
      setReportGenerating(false);
    }
  };

  // ── CRUD ──
  const supaFetch = (path: string, opts: RequestInit = {}) =>
    fetch(`/api/rooms${path.startsWith('/') ? path : `/${path}`}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
    });

  const getRoomCapacity = (room_no: string) => mastersAllRaw.filter(r => r.room_no === room_no).length;
  const getRoomOccupied = (room_no: string, year?: number, halfYear?: string, chasu?: string, excludeSeq?: number) =>
    assignmentsRaw.filter(r =>
      r.room_no === room_no &&
      (year     !== undefined ? r.year      === year     : true) &&
      (halfYear !== undefined ? r.half_year === halfYear : true) &&
      (chasu    !== undefined ? r.chasu     === chasu    : true) &&
      r.seq !== excludeSeq
    ).length;
  const getNextSeq = (room_no: string, year: number, halfYear: string, chasu: string) => {
    const allSeqs  = mastersAllRaw.filter(r => r.room_no === room_no).map(r => r.seq).sort((a, b) => a - b);
    const usedSeqs = new Set(assignmentsRaw.filter(r => r.room_no === room_no && r.year === year && r.half_year === halfYear && r.chasu === chasu).map(r => r.seq));
    return allSeqs.find(s => !usedSeqs.has(s)) ?? null;
  };

  const handleDelete = async (row: AssignmentRow) => {
    setSaving(true);
    try {
      await supaFetch('', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', row }),
      });
      setConfirmDelete(null); setDataVersion(v => v + 1);
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editingKey) return;
    const [yearStr, halfYear, room_no, chasu, seqStr] = editingKey.split('::');
    const pkRow = { year: Number(yearStr), half_year: halfYear, room_no, chasu, seq: Number(seqStr) } as AssignmentRow;
    setSaving(true); setFormError(null);
    try {
      const res = await supaFetch('', {
        method: 'POST',
        body: JSON.stringify({
          action: 'patch',
          pk: pkRow,
          updates: {
            name: editForm.name || null, school: editForm.school || null,
            grade: editForm.grade != null ? Number(editForm.grade) : null,
            gender: editForm.gender || null,
            check_in_ymd: editForm.check_in_ymd || null, check_out_ymd: editForm.check_out_ymd || null,
          },
        }),
      });
      if (!res.ok) throw new Error('patch_failed');
      setEditingKey(null); setDataVersion(v => v + 1);
    } catch { setFormError('저장 중 오류가 발생했습니다.'); }
    finally { setSaving(false); }
  };

  const handleInsert = async () => {
    const { room_no, year, half_year, chasu } = addForm;
    if (!room_no || !year || !half_year || !chasu) { setFormError('년도·반기·차수·객실번호는 필수입니다.'); return; }
    const cap = getRoomCapacity(room_no);
    const occ = getRoomOccupied(room_no, year, half_year, chasu);
    if (occ >= cap) { setFormError(`${room_no}호 수용인원(${cap}명)이 초과되었습니다.`); return; }
    const seq = getNextSeq(room_no, year, half_year, chasu);
    if (seq === null) { setFormError('배정 가능한 침대가 없습니다.'); return; }
    setSaving(true); setFormError(null);
    try {
      const res = await supaFetch('', {
        method: 'POST',
        body: JSON.stringify({
          action: 'insert',
          row: {
            year, half_year, room_no, chasu, seq,
            name: addForm.name || null, school: addForm.school || null,
            grade: addForm.grade != null ? Number(addForm.grade) : null,
            gender: addForm.gender || null,
            check_in_ymd: addForm.check_in_ymd || null, check_out_ymd: addForm.check_out_ymd || null,
          },
        }),
      });
      if (!res.ok) throw new Error('insert_failed');
      setShowAddForm(false); setAddForm({}); setDataVersion(v => v + 1);
    } catch { setFormError('저장 중 오류가 발생했습니다.'); }
    finally { setSaving(false); }
  };

  // ── STATS 배열 ──
  const STATS: StatItem[] = [
    { label: '총 객실수',     value: floorData?.total != null ? `${floorData.total}개` : '…', color: 'var(--accent)', icon: '🛏', floors: floorData?.floors, noClick: true },
    { label: '객실 가동율',   value: occupancy?.rate   ?? '…', color: 'var(--green)',  icon: '📊', occupancy: occupancy ?? undefined, noClick: true },
    { label: '총 입실인원수', value: `${guestData.total}명`,                                color: 'var(--blue)',   icon: '📦', floors: guestData.floors,  noClick: true },
    { label: '입실율',        value: checkInRate?.rate ?? '…', color: 'var(--orange)', icon: '📈', occupancy: checkInRate ?? undefined },
  ];

  const detailMain  = selectedStat?.split('::')[0] ?? '';
  const detailFloor = selectedStat?.split('::')[1] ?? null;

  // 층 바뀌면 호실 선택/검색 초기화
  const prevDetailFloor = useRef<string | null>(null);
  if (prevDetailFloor.current !== detailFloor) {
    prevDetailFloor.current = detailFloor;
    if (floorSelectedRoom) setFloorSelectedRoom(null);
    if (nameSearch) setNameSearch('');
  }

  // 이름 검색 → 해당 입실자가 있는 호실 집합
  const nameSearchTrim = nameSearch.trim();
  const searchHighlightRooms = nameSearchTrim && detailFloor
    ? new Set(filteredAssignments
        .filter(a => a.room_no[0] === detailFloor && (a.name ?? '').includes(nameSearchTrim))
        .map(a => a.room_no))
    : undefined;

  // 선택 호실의 입실 명단
  const selectedRoomOccupants = floorSelectedRoom
    ? filteredAssignments.filter(a => a.room_no === floorSelectedRoom)
    : [];

  const thSt = { textAlign: 'left' as const, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-xs)', padding: '10px 14px', borderBottom: '2px solid var(--border)', background: 'var(--surface)' };
  const tdSt = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid var(--border)', color: 'var(--text)' };
  const inpSt: React.CSSProperties = { padding: '3px 6px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' };

  const availableRooms = [...new Set(mastersAllRaw.map(r => r.room_no))]
    .filter(rn => getRoomOccupied(rn, addForm.year, addForm.half_year, addForm.chasu) < getRoomCapacity(rn))
    .sort();

  // 선택 라벨 (헤더 표시용)
  const periodLabel = [
    selYear  ? `${selYear}년`  : null,
    selHalf  ? selHalf         : null,
    selChasu ? `${selChasu}차수` : '전체 차수',
  ].filter(Boolean).join(' · ');

  return (
    <div>
      {/* ── 페이지 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10, color: 'var(--text)' }}>
            객실관리
          </h1>
          {/* ── 년도 / 반기 / 차수 선택기 ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>년도</label>
              <select value={selYear ?? ''} onChange={e => handleYearChange(e.target.value ? Number(e.target.value) : null)} style={selSt}>
                {availYears.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>반기</label>
              <select value={selHalf ?? ''} onChange={e => handleHalfChange(e.target.value || null)} style={selSt}>
                <option value="">전체</option>
                {availHalfs.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>차수</label>
              <select value={selChasu ?? ''} onChange={e => setSelChasu(e.target.value || null)} style={selSt}>
                <option value="">전체</option>
                {availChasus.map(c => <option key={c} value={c}>{c}차수</option>)}
              </select>
            </div>
            {periodLabel && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--accent-bg)', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
                {periodLabel}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleReportDownload}
          disabled={reportGenerating}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: reportGenerating ? '#6b7280' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9,
            padding: '10px 20px', fontSize: 13, fontWeight: 600,
            cursor: reportGenerating ? 'default' : 'pointer',
            transition: 'all var(--t)', boxShadow: '0 2px 10px rgba(13,148,136,0.28)',
            whiteSpace: 'nowrap', letterSpacing: '-0.01em', opacity: reportGenerating ? 0.75 : 1,
          }}
        >
          {reportGenerating ? '⏳ 생성 중…' : '↓ 보고서 다운로드'}
        </button>
      </div>

      {/* ── 통계 카드 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {STATS.map((stat, idx) => (
          <div
            key={stat.label}
            onClick={stat.noClick ? undefined : () => {
              const active = selectedStat === stat.label || selectedStat?.startsWith(stat.label + '::');
              setSelectedStat(active ? null : stat.label);
            }}
            style={{
              background: (!stat.noClick && (selectedStat === stat.label || selectedStat?.startsWith(stat.label + '::'))) ? 'var(--accent-bg)' : 'var(--surface)',
              borderRadius: 'var(--r)', padding: '20px 22px',
              border: `1px solid ${(!stat.noClick && (selectedStat === stat.label || selectedStat?.startsWith(stat.label + '::'))) ? stat.color : 'var(--border)'}`,
              boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: 12,
              transition: 'all var(--t)', cursor: stat.noClick ? 'default' : 'pointer',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '12px 12px 0 0', background: STAT_COLORS[idx] }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {stat.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: stat.color }}>
                  {stat.value}
                </span>
                <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: 'rgba(13,148,136,0.10)' }}>
                  {stat.icon}
                </div>
              </div>
            </div>
            {stat.floors && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {stat.floors.map(({ floor, count }) => (
                  <span
                    key={floor}
                    style={{
                      fontSize: 13, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                      background: 'var(--accent-bg)', color: 'var(--accent)',
                      cursor: 'default',
                    }}
                  >
                    {floor} {count}{stat.label === '총 입실인원수' ? '명' : '개'}
                  </span>
                ))}
              </div>
            )}
            {stat.occupancy && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {stat.occupancy.floors.map(({ floor, total, occupied, rate }) => {
                  const floorKey = `${stat.label}::${floor[0]}`;
                  const active = selectedStat === floorKey;
                  return (
                    <span
                      key={floor}
                      onClick={(e) => { e.stopPropagation(); setSelectedStat(active ? null : floorKey); }}
                      style={{
                        fontSize: 14, fontWeight: 600, padding: '4px 11px', borderRadius: 6,
                        background: active ? stat.color : `color-mix(in srgb, ${stat.color} 12%, transparent)`,
                        color: active ? '#fff' : stat.color,
                        display: 'flex', alignItems: 'center', gap: 5,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{floor}({occupied}/{total}개) {rate}</span>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, opacity: active ? 0.9 : 0.65 }}>
                        <rect x="1"   y="1"   width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.1"/>
                        <rect x="7.5" y="1"   width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.1"/>
                        <rect x="1"   y="7.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.1"/>
                        <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.1"/>
                      </svg>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── 상세 리스트 ── */}
      {selectedStat && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  {detailFloor ? `${detailFloor}층-숙소` : `${detailMain} 목록`}
                </span>
                {/* 객실 가동율 / 입실율: 조회 기간 배지 */}
                {(detailMain === '객실 가동율' || detailMain === '입실율') && periodLabel && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 5, background: 'var(--accent-bg)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                    {periodLabel}
                  </span>
                )}
                {detailMain === '객실 가동율' && detailFloor && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>총 {masters1Raw.filter(r => r.room_no[0] === detailFloor).length}개 · 사용중 {masters1Raw.filter(r => r.room_no[0] === detailFloor && occupiedRoomNos.has(r.room_no)).length}개</span>
                )}
                {detailMain === '객실 가동율' && !detailFloor && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>총 {masters1Raw.length}개 · 사용중 {masters1Raw.filter(r => occupiedRoomNos.has(r.room_no)).length}개</span>
                )}
                {detailMain === '입실율' && detailFloor && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>총 {filteredAssignments.filter(r => r.room_no[0] === detailFloor).length}명</span>
                )}
                {detailMain === '입실율' && !detailFloor && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>총 {filteredAssignments.length}명</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {detailMain === '입실율' && !detailFloor && (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setAddForm({ year: selYear ?? undefined, half_year: selHalf ?? undefined, chasu: selChasu ?? undefined });
                    setFormError(null); setEditingKey(null);
                  }}
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  ＋ 추가
                </button>
              )}
              <button
                onClick={() => { setSelectedStat(null); setEditingKey(null); setShowAddForm(false); setFormError(null); }}
                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕ 닫기
              </button>
            </div>
          </div>

          <div style={{
            overflowX: 'auto',
            maxHeight: (detailMain === '입실율' || detailMain === '객실 가동율') && detailFloor ? 'none' : 400,
            overflowY: (detailMain === '입실율' || detailMain === '객실 가동율') && detailFloor ? 'visible' : 'auto' as const,
          }}>
            {/* 객실 가동율 - 층별 배치도 */}
            {detailMain === '객실 가동율' && detailFloor && (
              <div style={{ padding: '16px 24px' }}>
                {detailFloor === '2' && <Floor2SVG singleDot occupiedRooms={[...new Set(filteredAssignments.filter(r => r.room_no[0] === '2').map(r => r.room_no))]} />}
                {detailFloor === '3' && <Floor3SVG singleDot occupiedRooms={[...new Set(filteredAssignments.filter(r => r.room_no[0] === '3').map(r => r.room_no))]} />}
              </div>
            )}
            {/* 객실 가동율 - 전체 테이블 */}
            {detailMain === '객실 가동율' && !detailFloor && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thSt}>번호</th><th style={thSt}>객실번호</th><th style={thSt}>층</th><th style={thSt}>상태</th></tr></thead>
                <tbody>
                  {masters1Raw.map((row, i) => {
                    const occ = occupiedRoomNos.has(row.room_no);
                    return (
                      <tr key={row.room_no} style={{ background: i % 2 === 1 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                        <td style={{ ...tdSt, color: 'var(--text-xs)', width: 50 }}>{i + 1}</td>
                        <td style={{ ...tdSt, fontWeight: 600 }}>{row.room_no}</td>
                        <td style={tdSt}>{row.room_no[0]}층</td>
                        <td style={tdSt}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: occ ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)', color: occ ? '#059669' : '#DC2626' }}>
                            {occ ? '사용중' : '공실'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* 입실율 - 층별 SVG + 호실 명단 */}
            {detailMain === '입실율' && detailFloor && (() => {
              const floorAsg = filteredAssignments.filter(r => r.room_no[0] === detailFloor);
              const roomCounts = floorAsg.reduce<Record<string, number>>((acc, r) => {
                acc[r.room_no] = (acc[r.room_no] ?? 0) + 1; return acc;
              }, {});
              return (
                <div style={{ padding: '16px 20px' }}>
                  {/* 이름 검색 */}
                  <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>이름 검색</span>
                    <input
                      value={nameSearch}
                      onChange={e => { setNameSearch(e.target.value); setFloorSelectedRoom(null); }}
                      placeholder="이름 입력 시 해당 호실이 강조됩니다"
                      style={{ flex: 1, maxWidth: 280, padding: '5px 10px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg)', color: 'var(--text)' }}
                    />
                    {nameSearch && (
                      <button onClick={() => setNameSearch('')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>지우기</button>
                    )}
                    {searchHighlightRooms && searchHighlightRooms.size > 0 && (
                      <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', color: '#d97706', fontWeight: 700 }}>
                        {searchHighlightRooms.size}개 호실 강조
                      </span>
                    )}
                    {searchHighlightRooms && searchHighlightRooms.size === 0 && nameSearchTrim && (
                      <span style={{ fontSize: 11, color: 'var(--text-xs)' }}>검색 결과 없음</span>
                    )}
                  </div>
                  {/* SVG + 명단 패널 */}
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <div style={{ minWidth: 420 }}>
                        {detailFloor === '2' && (
                          <Floor2SVG
                            roomCounts={roomCounts}
                            onRoomClick={room => setFloorSelectedRoom(prev => prev === room ? null : room)}
                            onRoomHover={setFloorHoveredRoom}
                            hoveredRoom={floorHoveredRoom}
                            selectedRoom={floorSelectedRoom}
                            highlightedRooms={searchHighlightRooms}
                          />
                        )}
                        {detailFloor === '3' && (
                          <Floor3SVG
                            roomCounts={roomCounts}
                            onRoomClick={room => setFloorSelectedRoom(prev => prev === room ? null : room)}
                            onRoomHover={setFloorHoveredRoom}
                            hoveredRoom={floorHoveredRoom}
                            selectedRoom={floorSelectedRoom}
                            highlightedRooms={searchHighlightRooms}
                          />
                        )}
                        <p style={{ fontSize: 11, color: 'var(--text-xs)', marginTop: 6, textAlign: 'center' }}>
                          호실을 클릭하면 오른쪽에 입실 명단이 표시됩니다
                        </p>
                      </div>
                    </div>
                    {/* 호실 명단 패널 */}
                    <div style={{
                      width: 260, flexShrink: 0,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 10, overflow: 'hidden',
                      transition: 'opacity 0.2s',
                      opacity: floorSelectedRoom ? 1 : 0.4,
                    }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: floorSelectedRoom ? 'var(--accent-bg)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: floorSelectedRoom ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {floorSelectedRoom ? `${floorSelectedRoom}호 입실 명단` : '호실을 클릭하세요'}
                        </span>
                        {floorSelectedRoom && (
                          <button onClick={() => setFloorSelectedRoom(null)} style={{ fontSize: 11, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-xs)', padding: '2px 4px' }}>✕</button>
                        )}
                      </div>
                      {floorSelectedRoom && (
                        <div style={{ padding: '8px 0' }}>
                          {selectedRoomOccupants.length === 0 ? (
                            <div style={{ padding: '16px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>입실자 없음 (공실)</div>
                          ) : (
                            selectedRoomOccupants.map((p, i) => (
                              <div key={`${p.seq}-${i}`} style={{
                                padding: '8px 14px',
                                borderBottom: i < selectedRoomOccupants.length - 1 ? '1px solid var(--border)' : 'none',
                                background: nameSearchTrim && (p.name ?? '').includes(nameSearchTrim) ? 'rgba(245,158,11,0.10)' : 'transparent',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                                    {p.name ?? '(이름 없음)'}
                                  </span>
                                  {p.gender && (
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: p.gender === '남' ? 'rgba(59,130,246,0.12)' : 'rgba(236,72,153,0.12)', color: p.gender === '남' ? '#3b82f6' : '#ec4899' }}>
                                      {p.gender}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 10, color: 'var(--text-xs)', marginLeft: 'auto' }}>침대 {p.seq}</span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {[p.school, p.grade ? `${p.grade}학년` : null].filter(Boolean).join(' · ') || '학교 정보 없음'}
                                </div>
                                {(p.check_in_ymd || p.check_out_ymd) && (
                                  <div style={{ fontSize: 10, color: 'var(--text-xs)', marginTop: 2 }}>
                                    {p.check_in_ymd} ~ {p.check_out_ymd}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                          <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                            {selectedRoomOccupants.length}명 / {roomCounts[floorSelectedRoom] ?? 0}명
                          </div>
                        </div>
                      )}
                      {!floorSelectedRoom && (
                        <div style={{ padding: '24px 14px', fontSize: 12, color: 'var(--text-xs)', textAlign: 'center' }}>
                          배치도에서 호실을<br/>클릭하세요
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 입실율 - 전체 목록 */}
            {detailMain === '입실율' && !detailFloor && (
              <>
                {formError && (
                  <div style={{ margin: '8px 24px 0', padding: '8px 14px', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                    ⚠ {formError}
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thSt, width: 40 }}>번호</th>
                      <th style={{ ...thSt, width: 52 }}>년도</th>
                      <th style={{ ...thSt, width: 72 }}>반기</th>
                      <th style={{ ...thSt, width: 52 }}>차수</th>
                      <th style={thSt}>객실번호</th>
                      <th style={{ ...thSt, width: 46 }}>침대</th>
                      <th style={thSt}>이름</th>
                      <th style={thSt}>학교</th>
                      <th style={{ ...thSt, width: 52 }}>학년</th>
                      <th style={{ ...thSt, width: 52 }}>성별</th>
                      <th style={thSt}>체크인</th>
                      <th style={thSt}>체크아웃</th>
                      <th style={{ ...thSt, width: 140, whiteSpace: 'nowrap' }}>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showAddForm && (
                      <tr style={{ background: 'rgba(13,148,136,0.05)' }}>
                        <td style={{ ...tdSt, color: 'var(--text-xs)' }}>신규</td>
                        <td style={tdSt}><input type="number" value={addForm.year ?? ''} onChange={e => setAddForm(f => ({ ...f, year: e.target.value ? Number(e.target.value) : undefined }))} style={inpSt} placeholder="년도"/></td>
                        <td style={tdSt}><input value={addForm.half_year ?? ''} onChange={e => setAddForm(f => ({ ...f, half_year: e.target.value }))} style={inpSt} placeholder="반기"/></td>
                        <td style={tdSt}><input value={addForm.chasu ?? ''} onChange={e => setAddForm(f => ({ ...f, chasu: e.target.value }))} style={{ ...inpSt, maxWidth: 40 }} placeholder="차수"/></td>
                        <td style={tdSt}>
                          <select value={addForm.room_no ?? ''} onChange={e => setAddForm(f => ({ ...f, room_no: e.target.value }))} style={inpSt}>
                            <option value="">선택</option>
                            {availableRooms.map(rn => <option key={rn} value={rn}>{rn}호 ({getRoomOccupied(rn, addForm.year, addForm.half_year, addForm.chasu)}/{getRoomCapacity(rn)})</option>)}
                          </select>
                        </td>
                        <td style={{ ...tdSt, color: 'var(--text-muted)', fontSize: 11 }}>자동</td>
                        <td style={tdSt}><input value={addForm.name ?? ''} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} style={inpSt} placeholder="이름"/></td>
                        <td style={tdSt}><input value={addForm.school ?? ''} onChange={e => setAddForm(f => ({ ...f, school: e.target.value }))} style={inpSt} placeholder="학교"/></td>
                        <td style={tdSt}><input type="number" value={addForm.grade ?? ''} onChange={e => setAddForm(f => ({ ...f, grade: e.target.value ? Number(e.target.value) : undefined }))} style={inpSt} placeholder="학년"/></td>
                        <td style={tdSt}>
                          <select value={addForm.gender ?? ''} onChange={e => setAddForm(f => ({ ...f, gender: e.target.value }))} style={inpSt}>
                            <option value="">-</option>
                            <option value="남">남</option>
                            <option value="여">여</option>
                          </select>
                        </td>
                        <td style={tdSt}><input type="date" value={addForm.check_in_ymd ?? ''} onChange={e => setAddForm(f => ({ ...f, check_in_ymd: e.target.value }))} style={inpSt}/></td>
                        <td style={tdSt}><input type="date" value={addForm.check_out_ymd ?? ''} onChange={e => setAddForm(f => ({ ...f, check_out_ymd: e.target.value }))} style={inpSt}/></td>
                        <td style={tdSt}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button disabled={saving} onClick={handleInsert} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>저장</button>
                            <button onClick={() => { setShowAddForm(false); setAddForm({}); setFormError(null); }} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>취소</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {filteredAssignments.map((row, i) => {
                      const rowKey = `${row.year}::${row.half_year}::${row.room_no}::${row.chasu}::${row.seq}`;
                      const isEditing    = editingKey    === rowKey;
                      const isConfirming = confirmDelete === rowKey;
                      if (isEditing) {
                        return (
                          <tr key={rowKey} style={{ background: 'rgba(59,130,246,0.05)' }}>
                            <td style={{ ...tdSt, color: 'var(--text-xs)' }}>{i + 1}</td>
                            <td style={tdSt}>{row.year}</td>
                            <td style={tdSt}>{row.half_year}</td>
                            <td style={tdSt}>{row.chasu}</td>
                            <td style={{ ...tdSt, fontWeight: 600 }}>{row.room_no}</td>
                            <td style={tdSt}>{row.seq}</td>
                            <td style={tdSt}><input value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inpSt} placeholder="이름"/></td>
                            <td style={tdSt}><input value={editForm.school ?? ''} onChange={e => setEditForm(f => ({ ...f, school: e.target.value }))} style={inpSt} placeholder="학교"/></td>
                            <td style={tdSt}><input type="number" value={editForm.grade ?? ''} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value ? Number(e.target.value) : undefined }))} style={inpSt} placeholder="학년"/></td>
                            <td style={tdSt}>
                              <select value={editForm.gender ?? ''} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))} style={inpSt}>
                                <option value="">-</option><option value="남">남</option><option value="여">여</option>
                              </select>
                            </td>
                            <td style={tdSt}><input type="date" value={editForm.check_in_ymd ?? ''} onChange={e => setEditForm(f => ({ ...f, check_in_ymd: e.target.value }))} style={inpSt}/></td>
                            <td style={tdSt}><input type="date" value={editForm.check_out_ymd ?? ''} onChange={e => setEditForm(f => ({ ...f, check_out_ymd: e.target.value }))} style={inpSt}/></td>
                            <td style={tdSt}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button disabled={saving} onClick={handleUpdate} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>저장</button>
                                <button onClick={() => { setEditingKey(null); setFormError(null); }} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>취소</button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={rowKey} style={{ background: i % 2 === 1 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                          <td style={{ ...tdSt, color: 'var(--text-xs)', width: 40 }}>{i + 1}</td>
                          <td style={tdSt}>{row.year}</td>
                          <td style={tdSt}>{row.half_year}</td>
                          <td style={tdSt}>{row.chasu}</td>
                          <td style={{ ...tdSt, fontWeight: 600 }}>{row.room_no}</td>
                          <td style={tdSt}>{row.seq}</td>
                          <td style={{ ...tdSt, fontWeight: 600 }}>{row.name ?? '-'}</td>
                          <td style={tdSt}>{row.school ?? '-'}</td>
                          <td style={tdSt}>{row.grade ?? '-'}</td>
                          <td style={tdSt}>{row.gender ?? '-'}</td>
                          <td style={tdSt}>{row.check_in_ymd ?? '-'}</td>
                          <td style={tdSt}>{row.check_out_ymd ?? '-'}</td>
                          <td style={tdSt}>
                            {isConfirming ? (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: 10, color: '#DC2626', fontWeight: 600 }}>삭제?</span>
                                <button disabled={saving} onClick={() => handleDelete(row)} style={{ fontSize: 11, fontWeight: 700, padding: '3px 7px', borderRadius: 5, border: 'none', background: '#DC2626', color: '#fff', cursor: 'pointer' }}>확인</button>
                                <button onClick={() => setConfirmDelete(null)} style={{ fontSize: 11, fontWeight: 700, padding: '3px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>취소</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 4, whiteSpace: 'nowrap' }}>
                                <button onClick={() => { setEditingKey(rowKey); setEditForm({ name: row.name, school: row.school, grade: row.grade, gender: row.gender, check_in_ymd: row.check_in_ymd, check_out_ymd: row.check_out_ymd }); setFormError(null); setShowAddForm(false); }} style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap' }}>수정</button>
                                <button onClick={() => setConfirmDelete(rowKey)} style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 5, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#DC2626', cursor: 'pointer', whiteSpace: 'nowrap' }}>삭제</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 하단 차트 그리드 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 객실 가동율 원그래프 */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', padding: '22px 24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.01em' }}>객실 가동율</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <svg width="190" height="190" viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
              <circle cx="80" cy="80" r="54" fill="none" stroke="var(--border)" strokeWidth="18"/>
              {occupancy && occupancy.total > 0 && (() => {
                const circ = 2 * Math.PI * 54;
                const frac = occupancy.occupied / occupancy.total;
                return <circle cx="80" cy="80" r={54} fill="none" stroke="#0d9488" strokeWidth="18" strokeDasharray={`${frac * circ} ${circ}`} style={{ transform: 'rotate(-90deg)', transformOrigin: '80px 80px' }} />;
              })()}
              <text x="80" y="74" textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="800" fill="#0d9488">{occupancy?.rate ?? '…'}</text>
              <text x="80" y="96" textAnchor="middle" fontSize="11" fill="#6b7280">가동율</text>
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>전체</span>
                <span style={{ fontWeight: 700 }}>{occupancy?.occupied ?? 0} / {occupancy?.total ?? 0}개</span>
              </div>
              {occupancy?.floors.map((f, i) => {
                const colors = ['#0d9488', '#3b82f6'];
                const pct = f.total > 0 ? f.occupied / f.total * 100 : 0;
                return (
                  <div key={f.floor}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i], display: 'inline-block' }}/>
                        <span style={{ fontWeight: 600 }}>{f.floor}</span>
                      </span>
                      <span style={{ fontWeight: 600 }}>{f.rate} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({f.occupied}/{f.total}개)</span></span>
                    </div>
                    <div style={{ height: 10, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: colors[i], borderRadius: 99 }}/>
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, background: 'var(--border)', borderRadius: '50%', display: 'inline-block' }}/>
                공실 {(occupancy?.total ?? 0) - (occupancy?.occupied ?? 0)}개
              </div>
            </div>
          </div>
        </div>

        {/* 입실율 막대그래프 */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', padding: '22px 24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.01em' }}>입실율</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>전체</span>
                <span style={{ fontWeight: 700, color: 'var(--orange)' }}>{checkInRate?.rate ?? '…'}</span>
              </div>
              <div style={{ height: 10, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: checkInRate?.rate ?? '0%', background: 'var(--orange)', borderRadius: 99 }}/>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{checkInRate?.occupied ?? 0} / {checkInRate?.total ?? 0}명</div>
            </div>
            {checkInRate?.floors.map((f, i) => {
              const colors = ['#0d9488', '#3b82f6'];
              return (
                <div key={f.floor}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{f.floor}</span>
                    <span style={{ fontWeight: 700, color: colors[i] }}>{f.rate}</span>
                  </div>
                  <div style={{ height: 10, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: f.rate, background: colors[i], borderRadius: 99 }}/>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{f.occupied} / {f.total}명</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
