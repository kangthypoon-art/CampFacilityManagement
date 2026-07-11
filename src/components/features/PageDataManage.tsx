'use client';

import { useState, useEffect, useCallback } from 'react';

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface RoomMasterRow {
  category_code: string;
  room_no:       string;
  seq:           number;
  floor:         number;
  guest_count:   number;
}

interface CategoryPriceRow {
  category_code: number;
  category_name: string;
  unit_price:    number;
  is_active:     string;
}

interface RoomAssignmentRow {
  year:          number;
  half_year:     string;
  room_no:       string;
  chasu:         string;
  seq:           number;
  school:        string;
  name:          string;
  grade:         number;
  gender:        string;
  check_in_ymd:  string;
  check_out_ymd: string;
}

type Tab = 'room_master' | 'room_assignment' | 'category_price';

// ── 공통 스타일 ───────────────────────────────────────────────────────────────

const thSt: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-xs)',
  background: 'var(--bg)', borderBottom: '2px solid var(--border)',
  whiteSpace: 'nowrap', position: 'sticky', top: 0,
};
const tdSt: React.CSSProperties = {
  padding: '7px 12px', borderBottom: '1px solid var(--border)',
  color: 'var(--text)', whiteSpace: 'nowrap', fontSize: 13,
};
const inputSt: React.CSSProperties = {
  width: '100%', padding: '4px 8px', fontSize: 12, borderRadius: 5,
  border: '1px solid var(--accent)', background: 'var(--surface)',
  color: 'var(--text)', outline: 'none',
};
const selSt: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', borderRadius: 7,
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
};
const btn = (color: string, light = false): React.CSSProperties => ({
  padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap',
  background: light ? 'transparent' : color,
  color: light ? color : '#fff',
  border: light ? `1px solid ${color}` : 'none',
} as React.CSSProperties);

// ── CSV 내보내기 유틸 ─────────────────────────────────────────────────────────

function downloadCsv(filename: string, headers: string[], rows: (string | number)[]) {
  const lines = [headers.join(','), ...rows as string[]].join('\n');
  const blob = new Blob(['﻿' + lines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── room_master 탭 ────────────────────────────────────────────────────────────

const RM_EMPTY: RoomMasterRow = { category_code: '', room_no: '', seq: 1, floor: 1, guest_count: 1 };

function RoomMasterTab() {
  const [rows,       setRows]       = useState<RoomMasterRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editIdx,    setEditIdx]    = useState<number | null>(null);
  const [draft,      setDraft]      = useState<RoomMasterRow | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [errMsg,     setErrMsg]     = useState('');
  const [filterCat,  setFilterCat]  = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [newRow,     setNewRow]     = useState<RoomMasterRow | null>(null);
  const [savingNew,  setSavingNew]  = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [cpItems,    setCpItems]    = useState<{ category_code: string; category_name: string }[]>([]);

  const supaUrl = '/api/supabase/rest/v1';
  const hdr = { 'Content-Type': 'application/json' };

  const pkKey = (r: RoomMasterRow) => `${r.category_code}|${r.room_no}|${r.seq}`;
  const pkUrl = (r: RoomMasterRow) =>
    `${supaUrl}/room_master`
    + `?category_code=eq.${encodeURIComponent(r.category_code)}`
    + `&room_no=eq.${encodeURIComponent(r.room_no)}`
    + `&seq=eq.${r.seq}`;

  const load = useCallback(async () => {
    setLoading(true); setErrMsg('');
    try {
      const res = await fetch(
        `${supaUrl}/room_master?select=*&order=room_no,seq,category_code`,
        { headers: hdr }
      );
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setSelected(new Set());
    } catch { setErrMsg('데이터 로드 실패'); }
    finally { setLoading(false); }
  }, [supaUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(`${supaUrl}/category_price?select=category_code,category_name&order=category_code`, { headers: hdr })
      .then(r => r.json())
      .then((data: { category_code: string; category_name: string }[]) => {
        if (Array.isArray(data)) setCpItems(data);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 행 편집 ──
  const startEdit = (i: number) => { setEditIdx(i); setDraft({ ...rows[i] }); setErrMsg(''); setNewRow(null); };
  const cancelEdit = () => { setEditIdx(null); setDraft(null); };

  const saveEdit = async () => {
    if (!draft) return;
    const orig = rows[editIdx!];
    setSaving(true); setErrMsg('');
    try {
      const del = await fetch(pkUrl(orig), { method: 'DELETE', headers: hdr });
      if (!del.ok) throw new Error(`삭제 실패: HTTP ${del.status}`);
      const ins = await fetch(`${supaUrl}/room_master`, {
        method: 'POST', headers: { ...hdr, Prefer: 'return=minimal' },
        body: JSON.stringify(draft),
      });
      if (!ins.ok) {
        const b = await ins.json().catch(() => ({}));
        throw new Error((b as { message?: string })?.message ?? `저장 실패: HTTP ${ins.status}`);
      }
      setEditIdx(null); setDraft(null);
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
    finally { setSaving(false); }
  };

  // ── 단일 행 삭제 ──
  const deleteRow = async (i: number) => {
    const r = rows[i];
    if (!confirm(`[${r.room_no} / seq:${r.seq} / cat:${r.category_code}] 행을 삭제하시겠습니까?`)) return;
    setErrMsg('');
    try {
      const res = await fetch(pkUrl(r), { method: 'DELETE', headers: hdr });
      if (!res.ok) throw new Error(`삭제 실패: HTTP ${res.status}`);
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
  };

  // ── 선택 삭제 ──
  const deleteSelected = async () => {
    if (!confirm(`선택한 ${selected.size}개 행을 삭제하시겠습니까?`)) return;
    setDeleting(true); setErrMsg('');
    try {
      for (const key of selected) {
        const [cat, room, seq] = key.split('|');
        await fetch(
          `${supaUrl}/room_master`
          + `?category_code=eq.${encodeURIComponent(cat)}`
          + `&room_no=eq.${encodeURIComponent(room)}`
          + `&seq=eq.${seq}`,
          { method: 'DELETE', headers: hdr }
        );
      }
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
    finally { setDeleting(false); }
  };

  // ── 신규 행 저장 ──
  const saveNewRow = async () => {
    if (!newRow) return;
    setSavingNew(true); setErrMsg('');
    try {
      const res = await fetch(`${supaUrl}/room_master`, {
        method: 'POST', headers: { ...hdr, Prefer: 'return=minimal' },
        body: JSON.stringify(newRow),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error((b as { message?: string })?.message ?? `저장 실패: HTTP ${res.status}`);
      }
      setNewRow(null);
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
    finally { setSavingNew(false); }
  };

  // ── CSV 내보내기 ──
  const exportCsv = () => {
    const cols: (keyof RoomMasterRow)[] = ['room_no', 'seq', 'floor', 'category_code', 'guest_count'];
    const dataRows = visible.map(r => cols.map(c => String(r[c])).join(','));
    downloadCsv('room_master.csv', cols, dataRows);
  };

  // ── 신규 행: room_no 변경 시 floor 자동완성, seq 자동제안 ──
  const handleNewRoomChange = (room_no: string) => {
    const existing = rows.find(r => r.room_no === room_no);
    const floor = existing?.floor ?? 1;
    const nextSeq = newRow
      ? nextSeqFor(room_no, newRow.category_code)
      : 1;
    setNewRow(r => ({ ...r!, room_no, floor, seq: nextSeq }));
  };
  const handleNewCatChange = (category_code: string) => {
    const nextSeq = newRow ? nextSeqFor(newRow.room_no, category_code) : 1;
    setNewRow(r => ({ ...r!, category_code, seq: nextSeq }));
  };

  // ── 필터·선택 ──
  const cats        = [...new Set(rows.map(r => r.category_code))].sort();
  const rooms       = [...new Set(rows.map(r => r.room_no))].sort((a, b) => Number(a) - Number(b));
  const guestCounts = [...new Set(rows.map(r => r.guest_count))].sort((a, b) => a - b);
  const maxSeq      = Math.max(...rows.map(r => r.seq), 0);
  const nextSeqFor  = (room_no: string, category_code: string) => {
    const seqs = rows
      .filter(r => r.room_no === room_no && r.category_code === category_code)
      .map(r => r.seq);
    return seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
  };
  const visible = rows.filter(r =>
    (!filterCat  || r.category_code === filterCat) &&
    (!filterRoom || r.room_no === filterRoom)
  );
  const allVisibleSelected = visible.length > 0 && visible.every(r => selected.has(pkKey(r)));
  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(visible.map(pkKey)));
  };
  const toggleSelect = (r: RoomMasterRow) => {
    const key = pkKey(r);
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 필터 + 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>객실번호</label>
          <select value={filterRoom} onChange={e => { setFilterRoom(e.target.value); setEditIdx(null); setSelected(new Set()); }} style={selSt}>
            <option value="">전체</option>
            {rooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>카테고리</label>
          <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setEditIdx(null); setSelected(new Set()); }} style={selSt}>
            <option value="">전체</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {visible.length}건 / 전체 {rows.length}건
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {selected.size > 0 && (
            <button style={btn('#ef4444')} onClick={deleteSelected} disabled={deleting}>
              {deleting ? '삭제 중…' : `선택 삭제 (${selected.size})`}
            </button>
          )}
          <button style={btn('#3b82f6', true)} onClick={() => { setNewRow({ ...RM_EMPTY }); setEditIdx(null); }}>+ 행 추가</button>
          <button style={btn('#6b7280', true)} onClick={exportCsv}>CSV 내보내기</button>
        </div>
      </div>

      {errMsg && (
        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, fontSize: 12, color: '#DC2626' }}>
          {errMsg}
        </div>
      )}

      {/* 테이블 */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thSt, width: 36, textAlign: 'center', padding: '10px 8px' }}>
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }} />
                </th>
                <th style={thSt}>room_no</th>
                <th style={{ ...thSt, textAlign: 'center' }}>seq</th>
                <th style={{ ...thSt, textAlign: 'center' }}>floor</th>
                <th style={thSt}>category_code</th>
                <th style={{ ...thSt, textAlign: 'center' }}>guest_count</th>
                <th style={{ ...thSt, textAlign: 'center' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => {
                const origIdx = rows.indexOf(row);
                const isEdit = editIdx === origIdx;
                const isSelected = selected.has(pkKey(row));
                return (
                  <tr key={pkKey(row)}
                    style={{ background: isSelected ? 'rgba(59,130,246,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)' }}>
                    <td style={{ ...tdSt, textAlign: 'center', padding: '7px 8px' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(row)}
                        style={{ cursor: 'pointer' }} />
                    </td>
                    {isEdit ? (
                      <>
                        <td style={tdSt}><input style={{ ...inputSt, width: 70 }} value={draft!.room_no} onChange={e => setDraft(d => ({ ...d!, room_no: e.target.value }))} /></td>
                        <td style={{ ...tdSt, textAlign: 'center' }}><input style={{ ...inputSt, width: 60, textAlign: 'center' }} type="number" value={draft!.seq} onChange={e => setDraft(d => ({ ...d!, seq: Number(e.target.value) }))} /></td>
                        <td style={{ ...tdSt, textAlign: 'center' }}><input style={{ ...inputSt, width: 60, textAlign: 'center' }} type="number" value={draft!.floor} onChange={e => setDraft(d => ({ ...d!, floor: Number(e.target.value) }))} /></td>
                        <td style={tdSt}><input style={{ ...inputSt, width: 80 }} value={draft!.category_code} onChange={e => setDraft(d => ({ ...d!, category_code: e.target.value }))} /></td>
                        <td style={{ ...tdSt, textAlign: 'center' }}><input style={{ ...inputSt, width: 60, textAlign: 'center' }} type="number" value={draft!.guest_count} onChange={e => setDraft(d => ({ ...d!, guest_count: Number(e.target.value) }))} /></td>
                      </>
                    ) : (
                      <>
                        <td style={tdSt}>{row.room_no}</td>
                        <td style={{ ...tdSt, textAlign: 'center' }}>{row.seq}</td>
                        <td style={{ ...tdSt, textAlign: 'center' }}>{row.floor}층</td>
                        <td style={tdSt}>{row.category_code}</td>
                        <td style={{ ...tdSt, textAlign: 'center' }}>{row.guest_count}</td>
                      </>
                    )}
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      {isEdit ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button style={btn('#0D9488')} onClick={saveEdit} disabled={saving}>{saving ? '…' : '저장'}</button>
                          <button style={btn('#6b7280', true)} onClick={cancelEdit}>취소</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button style={btn('#3b82f6')} onClick={() => startEdit(origIdx)}>변경</button>
                          <button style={btn('#ef4444')} onClick={() => deleteRow(origIdx)}>삭제</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* 신규 행 — datalist로 선택+직접입력 모두 가능 */}
              {newRow && (
                <>
                  <datalist id="rm-rooms">{rooms.map(r => <option key={r} value={r} />)}</datalist>
                  <datalist id="rm-guests">{guestCounts.map(g => <option key={g} value={g} />)}</datalist>
                  <datalist id="rm-seqs">{Array.from({ length: maxSeq + 2 }, (_, i) => i + 1).map(s => <option key={s} value={s} />)}</datalist>
                  <tr style={{ background: 'rgba(13,148,136,0.06)', outline: '2px solid var(--accent)', outlineOffset: -1 }}>
                    <td style={{ ...tdSt, textAlign: 'center', padding: '7px 8px' }}>
                      <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>NEW</span>
                    </td>
                    {/* room_no */}
                    <td style={tdSt}>
                      <input list="rm-rooms" style={{ ...inputSt, width: 80 }} placeholder="객실번호"
                        value={newRow.room_no}
                        onChange={e => handleNewRoomChange(e.target.value)} />
                    </td>
                    {/* seq: 자동제안값 pre-fill, 직접입력 가능 */}
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <input list="rm-seqs" style={{ ...inputSt, width: 60, textAlign: 'center' }} placeholder="seq"
                        value={newRow.seq}
                        onChange={e => setNewRow(r => ({ ...r!, seq: Number(e.target.value) || 1 }))} />
                    </td>
                    {/* floor: room_no 선택 시 자동완성, 직접 수정 가능 */}
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <input style={{ ...inputSt, width: 60, textAlign: 'center' }} placeholder="층"
                        type="number"
                        value={newRow.floor || ''}
                        onChange={e => setNewRow(r => ({ ...r!, floor: Number(e.target.value) || 0 }))} />
                    </td>
                    {/* category_code — category_price 테이블 값으로 select */}
                    <td style={tdSt}>
                      <select style={{ ...inputSt, width: 'auto', minWidth: 130 }}
                        value={newRow.category_code}
                        onChange={e => handleNewCatChange(e.target.value)}>
                        <option value="">선택</option>
                        {cpItems.map(cp => (
                          <option key={cp.category_code} value={cp.category_code}>
                            {cp.category_code} - {cp.category_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* guest_count */}
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <input list="rm-guests" style={{ ...inputSt, width: 60, textAlign: 'center' }} placeholder="인원"
                        type="number"
                        value={newRow.guest_count}
                        onChange={e => setNewRow(r => ({ ...r!, guest_count: Number(e.target.value) || 0 }))} />
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button style={btn('#0D9488')} onClick={saveNewRow} disabled={savingNew}>{savingNew ? '…' : '저장'}</button>
                        <button style={btn('#6b7280', true)} onClick={() => { setNewRow(null); setErrMsg(''); }}>취소</button>
                      </div>
                    </td>
                  </tr>
                </>
              )}

              {visible.length === 0 && !newRow && (
                <tr><td colSpan={7} style={{ ...tdSt, textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── room_assignment 탭 ───────────────────────────────────────────────────────

const RA_EMPTY: RoomAssignmentRow = {
  year: 0, half_year: '', room_no: '', chasu: '', seq: 1,
  school: '', name: '', grade: 1, gender: '', check_in_ymd: '', check_out_ymd: '',
};

function RoomAssignmentTab() {
  const [rows,        setRows]        = useState<RoomAssignmentRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [editIdx,     setEditIdx]     = useState<number | null>(null);
  const [draft,       setDraft]       = useState<RoomAssignmentRow | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [errMsg,      setErrMsg]      = useState('');
  const [filterYear,  setFilterYear]  = useState('');
  const [filterHalf,  setFilterHalf]  = useState('');
  const [filterRoom,  setFilterRoom]  = useState('');
  const [filterChasu, setFilterChasu] = useState('');
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [newRow,      setNewRow]      = useState<RoomAssignmentRow | null>(null);
  const [savingNew,   setSavingNew]   = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  const supaUrl = '/api/supabase/rest/v1';
  const hdr = { 'Content-Type': 'application/json' };

  const pkKey = (r: RoomAssignmentRow) => `${r.year}|${r.half_year}|${r.room_no}|${r.chasu}|${r.seq}`;
  const pkUrl = (r: RoomAssignmentRow) =>
    `${supaUrl}/room_assignment`
    + `?year=eq.${r.year}`
    + `&half_year=eq.${encodeURIComponent(r.half_year)}`
    + `&room_no=eq.${encodeURIComponent(r.room_no)}`
    + `&chasu=eq.${encodeURIComponent(r.chasu)}`
    + `&seq=eq.${r.seq}`;

  const load = useCallback(async () => {
    setLoading(true); setErrMsg('');
    try {
      const res = await fetch(
        `${supaUrl}/room_assignment?select=*&order=year,half_year,room_no,chasu,seq`,
        { headers: hdr }
      );
      const data = await res.json();
      setRows(Array.isArray(data) ? data.map((r: Record<string, unknown>) => ({
        year:          Number(r.year),
        half_year:     String(r.half_year ?? ''),
        room_no:       String(r.room_no ?? ''),
        chasu:         String(r.chasu ?? ''),
        seq:           Number(r.seq ?? 0),
        school:        String(r.school ?? ''),
        name:          String(r.name ?? ''),
        grade:         Number(r.grade ?? 0),
        gender:        String(r.gender ?? ''),
        check_in_ymd:  String(r.check_in_ymd ?? ''),
        check_out_ymd: String(r.check_out_ymd ?? ''),
      })) : []);
      setSelected(new Set());
    } catch { setErrMsg('데이터 로드 실패'); }
    finally { setLoading(false); }
  }, [supaUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const startEdit = (i: number) => { setEditIdx(i); setDraft({ ...rows[i] }); setErrMsg(''); setNewRow(null); };
  const cancelEdit = () => { setEditIdx(null); setDraft(null); };

  const saveEdit = async () => {
    if (!draft) return;
    const orig = rows[editIdx!];
    setSaving(true); setErrMsg('');
    try {
      const del = await fetch(pkUrl(orig), { method: 'DELETE', headers: hdr });
      if (!del.ok) throw new Error(`삭제 실패: HTTP ${del.status}`);
      const ins = await fetch(`${supaUrl}/room_assignment`, {
        method: 'POST', headers: { ...hdr, Prefer: 'return=minimal' },
        body: JSON.stringify(draft),
      });
      if (!ins.ok) {
        const b = await ins.json().catch(() => ({}));
        throw new Error((b as { message?: string; error?: string })?.message ?? (b as { error?: string })?.error ?? `저장 실패: HTTP ${ins.status}`);
      }
      setEditIdx(null); setDraft(null);
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
    finally { setSaving(false); }
  };

  const deleteRow = async (i: number) => {
    const r = rows[i];
    if (!confirm(`[${r.room_no}호 ${r.chasu} ${r.name}] 행을 삭제하시겠습니까?`)) return;
    setErrMsg('');
    try {
      const res = await fetch(pkUrl(r), { method: 'DELETE', headers: hdr });
      if (!res.ok) throw new Error(`삭제 실패: HTTP ${res.status}`);
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
  };

  const deleteSelected = async () => {
    if (!confirm(`선택한 ${selected.size}개 행을 삭제하시겠습니까?`)) return;
    setDeleting(true); setErrMsg('');
    try {
      for (const key of selected) {
        const [yr, hy, rm, ch, sq] = key.split('|');
        await fetch(
          `${supaUrl}/room_assignment?year=eq.${yr}&half_year=eq.${encodeURIComponent(hy)}&room_no=eq.${encodeURIComponent(rm)}&chasu=eq.${encodeURIComponent(ch)}&seq=eq.${sq}`,
          { method: 'DELETE', headers: hdr }
        );
      }
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
    finally { setDeleting(false); }
  };

  const saveNewRow = async () => {
    if (!newRow) return;
    setSavingNew(true); setErrMsg('');
    try {
      const res = await fetch(`${supaUrl}/room_assignment`, {
        method: 'POST', headers: { ...hdr, Prefer: 'return=minimal' },
        body: JSON.stringify(newRow),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error((b as { message?: string; error?: string })?.message ?? (b as { error?: string })?.error ?? `저장 실패: HTTP ${res.status}`);
      }
      setNewRow(null);
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
    finally { setSavingNew(false); }
  };

  // ── 필터·선택 ──
  const years   = [...new Set(rows.map(r => r.year))].sort((a, b) => b - a);
  const halves  = [...new Set(rows.filter(r => !filterYear || r.year === Number(filterYear)).map(r => r.half_year))].sort();
  const rooms   = [...new Set(rows.map(r => r.room_no))].sort((a, b) => Number(a) - Number(b));
  const chasues = [...new Set(rows.map(r => r.chasu))].sort();
  const schools = [...new Set(rows.map(r => r.school))].filter(Boolean).sort();

  const visible = rows.filter(r =>
    (!filterYear  || r.year      === Number(filterYear)) &&
    (!filterHalf  || r.half_year === filterHalf) &&
    (!filterRoom  || r.room_no   === filterRoom) &&
    (!filterChasu || r.chasu     === filterChasu)
  );

  const allVisibleSelected = visible.length > 0 && visible.every(r => selected.has(pkKey(r)));
  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(visible.map(pkKey)));
  };
  const toggleSelect = (r: RoomAssignmentRow) => {
    const key = pkKey(r);
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const exportCsv = () => {
    const cols: (keyof RoomAssignmentRow)[] = ['year', 'half_year', 'room_no', 'chasu', 'seq', 'school', 'name', 'grade', 'gender', 'check_in_ymd', 'check_out_ymd'];
    const dataRows = visible.map(r => cols.map(c => `"${String(r[c]).replace(/"/g, '""')}"`).join(','));
    downloadCsv('room_assignment.csv', cols, dataRows);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 필터 + 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>년도</label>
          <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterHalf(''); setEditIdx(null); setSelected(new Set()); }} style={selSt}>
            <option value="">전체</option>
            {years.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>반기</label>
          <select value={filterHalf} onChange={e => { setFilterHalf(e.target.value); setEditIdx(null); setSelected(new Set()); }} style={selSt}>
            <option value="">전체</option>
            {halves.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>객실번호</label>
          <select value={filterRoom} onChange={e => { setFilterRoom(e.target.value); setEditIdx(null); setSelected(new Set()); }} style={selSt}>
            <option value="">전체</option>
            {rooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>차수</label>
          <select value={filterChasu} onChange={e => { setFilterChasu(e.target.value); setEditIdx(null); setSelected(new Set()); }} style={selSt}>
            <option value="">전체</option>
            {chasues.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {visible.length}건 / 전체 {rows.length}건
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {selected.size > 0 && (
            <button style={btn('#ef4444')} onClick={deleteSelected} disabled={deleting}>
              {deleting ? '삭제 중…' : `선택 삭제 (${selected.size})`}
            </button>
          )}
          <button style={btn('#3b82f6', true)} onClick={() => { setNewRow({ ...RA_EMPTY }); setEditIdx(null); }}>+ 행 추가</button>
          <button style={btn('#6b7280', true)} onClick={exportCsv}>CSV 내보내기</button>
        </div>
      </div>

      {errMsg && (
        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, fontSize: 12, color: '#DC2626' }}>
          {errMsg}
        </div>
      )}

      {/* 테이블 */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ ...thSt, width: 36, textAlign: 'center', padding: '10px 8px' }}>
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ ...thSt, textAlign: 'center' }}>년도</th>
                <th style={thSt}>반기</th>
                <th style={thSt}>객실</th>
                <th style={thSt}>차수</th>
                <th style={{ ...thSt, textAlign: 'center' }}>seq</th>
                <th style={thSt}>학교</th>
                <th style={thSt}>이름</th>
                <th style={{ ...thSt, textAlign: 'center' }}>학년</th>
                <th style={{ ...thSt, textAlign: 'center' }}>성별</th>
                <th style={{ ...thSt, textAlign: 'center' }}>입실일</th>
                <th style={{ ...thSt, textAlign: 'center' }}>퇴실일</th>
                <th style={{ ...thSt, textAlign: 'center' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => {
                const origIdx = rows.indexOf(row);
                const isEdit  = editIdx === origIdx;
                const isSel   = selected.has(pkKey(row));
                return (
                  <tr key={pkKey(row)} style={{ background: isSel ? 'rgba(59,130,246,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)' }}>
                    <td style={{ ...tdSt, textAlign: 'center', padding: '7px 8px' }}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleSelect(row)} style={{ cursor: 'pointer' }} />
                    </td>
                    {isEdit ? (
                      <>
                        <td style={{ ...tdSt, textAlign: 'center' }}><input style={{ ...inputSt, width: 55, textAlign: 'center' }} type="number" value={draft!.year} onChange={e => setDraft(d => ({ ...d!, year: Number(e.target.value) }))} /></td>
                        <td style={tdSt}><input style={{ ...inputSt, width: 65 }} value={draft!.half_year} onChange={e => setDraft(d => ({ ...d!, half_year: e.target.value }))} /></td>
                        <td style={tdSt}><input style={{ ...inputSt, width: 55 }} value={draft!.room_no} onChange={e => setDraft(d => ({ ...d!, room_no: e.target.value }))} /></td>
                        <td style={tdSt}><input style={{ ...inputSt, width: 55 }} value={draft!.chasu} onChange={e => setDraft(d => ({ ...d!, chasu: e.target.value }))} /></td>
                        <td style={{ ...tdSt, textAlign: 'center' }}><input style={{ ...inputSt, width: 45, textAlign: 'center' }} type="number" value={draft!.seq} onChange={e => setDraft(d => ({ ...d!, seq: Number(e.target.value) }))} /></td>
                        <td style={tdSt}><input list="ra-schools" style={{ ...inputSt, width: 100 }} value={draft!.school} onChange={e => setDraft(d => ({ ...d!, school: e.target.value }))} /></td>
                        <td style={tdSt}><input style={{ ...inputSt, width: 70 }} value={draft!.name} onChange={e => setDraft(d => ({ ...d!, name: e.target.value }))} /></td>
                        <td style={{ ...tdSt, textAlign: 'center' }}><input style={{ ...inputSt, width: 45, textAlign: 'center' }} type="number" value={draft!.grade} onChange={e => setDraft(d => ({ ...d!, grade: Number(e.target.value) }))} /></td>
                        <td style={{ ...tdSt, textAlign: 'center' }}>
                          <select style={{ ...inputSt, width: 55 }} value={draft!.gender} onChange={e => setDraft(d => ({ ...d!, gender: e.target.value }))}>
                            <option value="">-</option>
                            <option value="남">남</option>
                            <option value="여">여</option>
                          </select>
                        </td>
                        <td style={{ ...tdSt, textAlign: 'center' }}><input style={{ ...inputSt, width: 85, textAlign: 'center' }} value={draft!.check_in_ymd} onChange={e => setDraft(d => ({ ...d!, check_in_ymd: e.target.value }))} placeholder="YYYYMMDD" /></td>
                        <td style={{ ...tdSt, textAlign: 'center' }}><input style={{ ...inputSt, width: 85, textAlign: 'center' }} value={draft!.check_out_ymd} onChange={e => setDraft(d => ({ ...d!, check_out_ymd: e.target.value }))} placeholder="YYYYMMDD" /></td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...tdSt, textAlign: 'center' }}>{row.year}</td>
                        <td style={tdSt}>{row.half_year}</td>
                        <td style={{ ...tdSt, fontWeight: 600 }}>{row.room_no}호</td>
                        <td style={tdSt}>{row.chasu}</td>
                        <td style={{ ...tdSt, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>{row.seq}</td>
                        <td style={tdSt}>{row.school}</td>
                        <td style={{ ...tdSt, fontWeight: 600 }}>{row.name}</td>
                        <td style={{ ...tdSt, textAlign: 'center' }}>{row.grade}학년</td>
                        <td style={{ ...tdSt, textAlign: 'center' }}>
                          <span style={{ padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: row.gender === '남' ? 'rgba(59,130,246,0.12)' : row.gender === '여' ? 'rgba(244,114,182,0.15)' : 'transparent', color: row.gender === '남' ? '#2563eb' : row.gender === '여' ? '#db2777' : 'var(--text)' }}>{row.gender || '-'}</span>
                        </td>
                        <td style={{ ...tdSt, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{row.check_in_ymd}</td>
                        <td style={{ ...tdSt, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{row.check_out_ymd}</td>
                      </>
                    )}
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      {isEdit ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button style={btn('#0D9488')} onClick={saveEdit} disabled={saving}>{saving ? '…' : '저장'}</button>
                          <button style={btn('#6b7280', true)} onClick={cancelEdit}>취소</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button style={btn('#3b82f6')} onClick={() => startEdit(origIdx)}>변경</button>
                          <button style={btn('#ef4444')} onClick={() => deleteRow(origIdx)}>삭제</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {newRow && (
                <>
                  <datalist id="ra-schools">{schools.map(s => <option key={s} value={s} />)}</datalist>
                  <datalist id="ra-rooms">{rooms.map(r => <option key={r} value={r} />)}</datalist>
                  <datalist id="ra-chasues">{chasues.map(c => <option key={c} value={c} />)}</datalist>
                  <tr style={{ background: 'rgba(13,148,136,0.06)', outline: '2px solid var(--accent)', outlineOffset: -1 }}>
                    <td style={{ ...tdSt, textAlign: 'center', padding: '7px 8px' }}>
                      <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>NEW</span>
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <input style={{ ...inputSt, width: 55, textAlign: 'center' }} type="number" placeholder="년도" value={newRow.year || ''} onChange={e => setNewRow(r => ({ ...r!, year: Number(e.target.value) || 0 }))} />
                    </td>
                    <td style={tdSt}>
                      <input style={{ ...inputSt, width: 65 }} placeholder="반기" value={newRow.half_year} onChange={e => setNewRow(r => ({ ...r!, half_year: e.target.value }))} />
                    </td>
                    <td style={tdSt}>
                      <input list="ra-rooms" style={{ ...inputSt, width: 55 }} placeholder="객실" value={newRow.room_no} onChange={e => setNewRow(r => ({ ...r!, room_no: e.target.value }))} />
                    </td>
                    <td style={tdSt}>
                      <input list="ra-chasues" style={{ ...inputSt, width: 55 }} placeholder="차수" value={newRow.chasu} onChange={e => setNewRow(r => ({ ...r!, chasu: e.target.value }))} />
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <input style={{ ...inputSt, width: 45, textAlign: 'center' }} type="number" placeholder="seq" value={newRow.seq || ''} onChange={e => setNewRow(r => ({ ...r!, seq: Number(e.target.value) || 1 }))} />
                    </td>
                    <td style={tdSt}>
                      <input list="ra-schools" style={{ ...inputSt, width: 100 }} placeholder="학교" value={newRow.school} onChange={e => setNewRow(r => ({ ...r!, school: e.target.value }))} />
                    </td>
                    <td style={tdSt}>
                      <input style={{ ...inputSt, width: 70 }} placeholder="이름" value={newRow.name} onChange={e => setNewRow(r => ({ ...r!, name: e.target.value }))} />
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <input style={{ ...inputSt, width: 45, textAlign: 'center' }} type="number" placeholder="학년" value={newRow.grade || ''} onChange={e => setNewRow(r => ({ ...r!, grade: Number(e.target.value) || 0 }))} />
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <select style={{ ...inputSt, width: 55 }} value={newRow.gender} onChange={e => setNewRow(r => ({ ...r!, gender: e.target.value }))}>
                        <option value="">-</option>
                        <option value="남">남</option>
                        <option value="여">여</option>
                      </select>
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <input style={{ ...inputSt, width: 85, textAlign: 'center' }} placeholder="YYYYMMDD" value={newRow.check_in_ymd} onChange={e => setNewRow(r => ({ ...r!, check_in_ymd: e.target.value }))} />
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <input style={{ ...inputSt, width: 85, textAlign: 'center' }} placeholder="YYYYMMDD" value={newRow.check_out_ymd} onChange={e => setNewRow(r => ({ ...r!, check_out_ymd: e.target.value }))} />
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button style={btn('#0D9488')} onClick={saveNewRow} disabled={savingNew}>{savingNew ? '…' : '저장'}</button>
                        <button style={btn('#6b7280', true)} onClick={() => { setNewRow(null); setErrMsg(''); }}>취소</button>
                      </div>
                    </td>
                  </tr>
                </>
              )}

              {visible.length === 0 && !newRow && (
                <tr><td colSpan={13} style={{ ...tdSt, textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── category_price 탭 ─────────────────────────────────────────────────────────

const CP_EMPTY: CategoryPriceRow = { category_code: 0, category_name: '', unit_price: 0, is_active: 'Y' };

function CategoryPriceTab() {
  const [rows,      setRows]      = useState<CategoryPriceRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editIdx,   setEditIdx]   = useState<number | null>(null);
  const [draft,     setDraft]     = useState<CategoryPriceRow | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [errMsg,    setErrMsg]    = useState('');
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
  const [newRow,    setNewRow]    = useState<CategoryPriceRow | null>(null);
  const [savingNew, setSavingNew] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const supaUrl = '/api/supabase/rest/v1';
  const hdr = { 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    setLoading(true); setErrMsg('');
    try {
      const res = await fetch(`${supaUrl}/category_price?select=*&order=category_code`, { headers: hdr });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setSelected(new Set());
    } catch { setErrMsg('데이터 로드 실패'); }
    finally { setLoading(false); }
  }, [supaUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const startEdit = (i: number) => { setEditIdx(i); setDraft({ ...rows[i] }); setErrMsg(''); setNewRow(null); };
  const cancelEdit = () => { setEditIdx(null); setDraft(null); };

  const saveEdit = async () => {
    if (!draft) return;
    setSaving(true); setErrMsg('');
    try {
      const { category_name, unit_price, is_active } = draft;
      const res = await fetch(
        `${supaUrl}/category_price?category_code=eq.${draft.category_code}`,
        { method: 'PATCH', headers: { ...hdr, Prefer: 'return=minimal' }, body: JSON.stringify({ category_name, unit_price, is_active }) }
      );
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error((b as { message?: string })?.message ?? `저장 실패: HTTP ${res.status}`);
      }
      setEditIdx(null); setDraft(null);
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
    finally { setSaving(false); }
  };

  const deleteRow = async (i: number) => {
    const r = rows[i];
    if (!confirm(`[${r.category_code} / ${r.category_name}] 행을 삭제하시겠습니까?`)) return;
    setErrMsg('');
    try {
      const res = await fetch(`${supaUrl}/category_price?category_code=eq.${r.category_code}`, { method: 'DELETE', headers: hdr });
      if (!res.ok) throw new Error(`삭제 실패: HTTP ${res.status}`);
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
  };

  const deleteSelected = async () => {
    if (!confirm(`선택한 ${selected.size}개 행을 삭제하시겠습니까?`)) return;
    setDeleting(true); setErrMsg('');
    try {
      for (const code of selected) {
        await fetch(`${supaUrl}/category_price?category_code=eq.${code}`, { method: 'DELETE', headers: hdr });
      }
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
    finally { setDeleting(false); }
  };

  const saveNewRow = async () => {
    if (!newRow) return;
    setSavingNew(true); setErrMsg('');
    try {
      const res = await fetch(`${supaUrl}/category_price`, {
        method: 'POST', headers: { ...hdr, Prefer: 'return=minimal' },
        body: JSON.stringify(newRow),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error((b as { message?: string })?.message ?? `저장 실패: HTTP ${res.status}`);
      }
      setNewRow(null);
      await load();
    } catch (e) { setErrMsg((e as Error).message); }
    finally { setSavingNew(false); }
  };

  const exportCsv = () => {
    const cols: (keyof CategoryPriceRow)[] = ['category_code', 'category_name', 'unit_price', 'is_active'];
    const dataRows = rows.map(r => cols.map(c => String(r[c])).join(','));
    downloadCsv('category_price.csv', cols, dataRows);
  };

  const fmt = (n: number) => n.toLocaleString('ko-KR');
  const unitPrices    = [...new Set(rows.map(r => r.unit_price))].sort((a, b) => a - b);
  const categoryCodes = [...new Set(rows.map(r => r.category_code))].sort((a, b) => a - b);
  const categoryNames = [...new Set(rows.map(r => r.category_name))].sort();
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.category_code));
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.category_code)));
  };
  const toggleSelect = (code: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>총 {rows.length}건</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {selected.size > 0 && (
            <button style={btn('#ef4444')} onClick={deleteSelected} disabled={deleting}>
              {deleting ? '삭제 중…' : `선택 삭제 (${selected.size})`}
            </button>
          )}
          <button style={btn('#3b82f6', true)} onClick={() => { setNewRow({ ...CP_EMPTY }); setEditIdx(null); }}>+ 행 추가</button>
          <button style={btn('#6b7280', true)} onClick={exportCsv}>CSV 내보내기</button>
        </div>
      </div>

      {errMsg && (
        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, fontSize: 12, color: '#DC2626' }}>
          {errMsg}
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 380px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thSt, width: 36, textAlign: 'center', padding: '10px 8px' }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={thSt}>category_code</th>
                <th style={thSt}>category_name</th>
                <th style={{ ...thSt, textAlign: 'right' }}>unit_price</th>
                <th style={{ ...thSt, textAlign: 'center' }}>is_active</th>
                <th style={{ ...thSt, textAlign: 'center' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isEdit = editIdx === i;
                const isSel  = selected.has(row.category_code);
                return (
                  <tr key={row.category_code}
                    style={{ background: isSel ? 'rgba(59,130,246,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)' }}>
                    <td style={{ ...tdSt, textAlign: 'center', padding: '7px 8px' }}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleSelect(row.category_code)} style={{ cursor: 'pointer' }} />
                    </td>
                    {/* category_code: 신규 등록 시에만 편집 가능, 기존 행은 PK이므로 읽기전용 */}
                    <td style={tdSt}>{row.category_code}</td>
                    {isEdit ? (
                      <>
                        <td style={tdSt}><input style={inputSt} value={draft!.category_name} onChange={e => setDraft(d => ({ ...d!, category_name: e.target.value }))} /></td>
                        <td style={tdSt}><input style={{ ...inputSt, textAlign: 'right', width: 100 }} type="number" value={draft!.unit_price} onChange={e => setDraft(d => ({ ...d!, unit_price: Number(e.target.value) }))} /></td>
                        <td style={{ ...tdSt, textAlign: 'center' }}>
                          <select value={draft!.is_active} onChange={e => setDraft(d => ({ ...d!, is_active: e.target.value }))}
                            style={{ fontSize: 12, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--surface)', color: 'var(--text)' }}>
                            <option value="Y">Y</option>
                            <option value="N">N</option>
                          </select>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={tdSt}>{row.category_name}</td>
                        <td style={{ ...tdSt, textAlign: 'right' }}>{fmt(row.unit_price)}원</td>
                        <td style={{ ...tdSt, textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                            background: row.is_active === 'Y' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
                            color: row.is_active === 'Y' ? '#16a34a' : '#dc2626',
                          }}>{row.is_active}</span>
                        </td>
                      </>
                    )}
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      {isEdit ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button style={btn('#0D9488')} onClick={saveEdit} disabled={saving}>{saving ? '…' : '저장'}</button>
                          <button style={btn('#6b7280', true)} onClick={cancelEdit}>취소</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button style={btn('#3b82f6')} onClick={() => startEdit(i)}>변경</button>
                          <button style={btn('#ef4444')} onClick={() => deleteRow(i)}>삭제</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* 신규 행 — datalist로 선택+직접입력 모두 가능 */}
              {newRow && (
                <>
                  <datalist id="cp-codes">{categoryCodes.map(c => <option key={c} value={c} />)}</datalist>
                  <datalist id="cp-names">{categoryNames.map(n => <option key={n} value={n} />)}</datalist>
                  <datalist id="cp-prices">{unitPrices.map(p => <option key={p} value={p}>{fmt(p)}원</option>)}</datalist>
                  <tr style={{ background: 'rgba(13,148,136,0.06)', outline: '2px solid var(--accent)', outlineOffset: -1 }}>
                    <td style={{ ...tdSt, textAlign: 'center', padding: '7px 8px' }}>
                      <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>NEW</span>
                    </td>
                    <td style={tdSt}>
                      <input list="cp-codes" style={{ ...inputSt, width: 80 }} placeholder="코드" value={newRow.category_code || ''}
                        onChange={e => setNewRow(r => ({ ...r!, category_code: Number(e.target.value) || 0 }))} />
                    </td>
                    <td style={tdSt}>
                      <input list="cp-names" style={inputSt} placeholder="카테고리명" value={newRow.category_name}
                        onChange={e => setNewRow(r => ({ ...r!, category_name: e.target.value }))} />
                    </td>
                    <td style={{ ...tdSt, textAlign: 'right' }}>
                      <input list="cp-prices" style={{ ...inputSt, width: 110, textAlign: 'right' }} type="number"
                        placeholder="단가" value={newRow.unit_price || ''}
                        onChange={e => setNewRow(r => ({ ...r!, unit_price: Number(e.target.value) || 0 }))} />
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <select value={newRow.is_active} onChange={e => setNewRow(r => ({ ...r!, is_active: e.target.value }))}
                        style={{ fontSize: 12, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--surface)', color: 'var(--text)' }}>
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button style={btn('#0D9488')} onClick={saveNewRow} disabled={savingNew}>{savingNew ? '…' : '저장'}</button>
                        <button style={btn('#6b7280', true)} onClick={() => { setNewRow(null); setErrMsg(''); }}>취소</button>
                      </div>
                    </td>
                  </tr>
                </>
              )}

              {rows.length === 0 && !newRow && (
                <tr><td colSpan={6} style={{ ...tdSt, textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export function PageDataManage() {
  const [tab, setTab] = useState<Tab>('room_master');

  const TABS: { key: Tab; label: string; desc: string }[] = [
    { key: 'room_master',    label: '객실 마스터', desc: 'room_master 테이블' },
    { key: 'room_assignment', label: '객실배정',   desc: 'room_assignment 테이블' },
    { key: 'category_price', label: '단가',        desc: 'category_price 테이블' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>데이터 관리</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>마스터 데이터 및 단가 정보를 조회·변경·삭제합니다.</p>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '10px 24px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontSize: 14, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
            {t.label}
            <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.65 }}>({t.desc})</span>
          </button>
        ))}
      </div>

      {tab === 'room_master'    && <RoomMasterTab />}
      {tab === 'room_assignment' && <RoomAssignmentTab />}
      {tab === 'category_price' && <CategoryPriceTab />}
    </div>
  );
}
