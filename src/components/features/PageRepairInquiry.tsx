'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';

interface BuildingRoom {
  room_no:   string;
  floor:     string;
  room_name: string;
}

interface RepairRecord {
  repair_date:   string;
  floor:         string | null;
  room_no:       string | null;
  room_name:     string | null;
  repair_detail: string | null;
  created_at:    string;
}

const selSt: React.CSSProperties = {
  padding: '7px 11px', fontSize: 13, borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text)', cursor: 'pointer', outline: 'none',
};
const labelSt: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em',
};

export function PageRepairInquiry() {
  const [rooms,       setRooms]       = useState<BuildingRoom[]>([]);
  const [floors,      setFloors]      = useState<string[]>([]);
  const [selFloor,    setSelFloor]    = useState('');
  const [selRoom,     setSelRoom]     = useState('');
  const [dateFrom,    setDateFrom]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10);
  });
  const [dateTo,      setDateTo]      = useState(() => new Date().toISOString().slice(0, 10));
  const [keyword,     setKeyword]     = useState('');
  const [records,     setRecords]     = useState<RepairRecord[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [searched,    setSearched]    = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const supaUrl = '/api/supabase/rest/v1';
  const hdr     = { 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${supaUrl}/building_codes?select=room_no,floor,room_name&use_yn=eq.Y&order=floor,room_no`, { headers: hdr })
      .then(r => r.json())
      .then((data: BuildingRoom[]) => {
        if (!Array.isArray(data)) return;
        setRooms(data);
        const fl = [...new Set(data.map(r => r.floor))].sort();
        setFloors(fl);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 층 변경 시 객실 초기화
  useEffect(() => { setSelRoom(''); }, [selFloor]);

  const filteredRooms = selFloor ? rooms.filter(r => r.floor === selFloor) : rooms;

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(false);
    setExpandedIdx(null);
    try {
      const params: string[] = ['order=repair_date.desc,created_at.desc'];
      if (selRoom)   params.push(`room_no=eq.${encodeURIComponent(selRoom)}`);
      else if (selFloor) params.push(`floor=eq.${encodeURIComponent(selFloor)}`);
      if (dateFrom)  params.push(`repair_date=gte.${dateFrom}`);
      if (dateTo)    params.push(`repair_date=lte.${dateTo}`);
      if (keyword.trim()) params.push(`repair_detail=ilike.*${encodeURIComponent(keyword.trim())}*`);

      const res = await fetch(`${supaUrl}/repair_history?${params.join('&')}`, { headers: hdr });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selFloor, selRoom, dateFrom, dateTo, keyword]);

  // 마운트 시 기본 1주일 조회
  useEffect(() => { handleSearch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    const today   = new Date().toISOString().slice(0, 10);
    const weekAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })();
    setSelFloor(''); setSelRoom('');
    setDateFrom(weekAgo); setDateTo(today);
    setKeyword('');
    setRecords([]); setSearched(false); setExpandedIdx(null);
  };

  const fmtDate = (d: string) => d?.slice(0, 10) ?? '';
  const fmtTs   = (ts: string) => ts ? ts.slice(0, 16).replace('T', ' ') : '';
  const truncate = (s: string | null, n = 60) =>
    !s ? '' : s.length <= n ? s : s.slice(0, n) + '…';

  const exportToExcel = () => {
    const now     = new Date();
    const yy      = now.getFullYear();
    const mm      = String(now.getMonth() + 1).padStart(2, '0');
    const dd      = String(now.getDate()).padStart(2, '0');
    const dateStr = `출력일: ${yy}-${mm}-${dd}`;
    const NUM_COLS = 6;

    const printRow  = [...Array(NUM_COLS - 1).fill(''), dateStr];
    const headerRow = ['수리일자', '층', '객실번호', '객실명', '수리내역', '등록일시'];
    const bodyRows  = records.map(rec => [
      fmtDate(rec.repair_date),
      rec.floor     ?? '',
      rec.room_no   ?? '',
      rec.room_name ?? '',
      rec.repair_detail ?? '',
      fmtTs(rec.created_at),
    ]);

    const aoa = [printRow, headerRow, ...bodyRows];
    const ws  = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 12 },
      { wch:  6 },
      { wch: 13 },
      { wch: 22 },
      { wch: 55 },
      { wch: 20 },
    ];
    ws['!rows'] = aoa.map((_, i) => ({ hpt: i >= 2 ? 40 : 25 }));

    const border = {
      top:    { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left:   { style: 'thin', color: { rgb: '000000' } },
      right:  { style: 'thin', color: { rgb: '000000' } },
    };

    const blueStyle  = { fill: { patternType: 'solid', fgColor: { rgb: '4472C4' } }, font: { bold: true, color: { rgb: 'FFFFFF' } }, border, alignment: { horizontal: 'center', vertical: 'center' } };
    const dateStyle  = { alignment: { horizontal: 'right', vertical: 'center' } };
    const centerSt   = { border, alignment: { horizontal: 'center', vertical: 'center' } };
    const leftWrapSt = { border, alignment: { horizontal: 'left',   vertical: 'center', wrapText: true } };

    // 0:수리일자 1:층 2:객실번호 3:객실명 5:등록일시 — center / 4:수리내역 — left+wrap
    const CENTER_COLS = new Set([0, 1, 2, 3, 5]);

    const range   = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    const lastRow = range.e.r;

    for (let R = range.s.r; R <= lastRow; R++) {
      for (let C = 0; C < NUM_COLS; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[addr]) ws[addr] = { t: 'z', v: '' };
        if (R === 0) {
          ws[addr].s = C === NUM_COLS - 1 ? dateStyle : {};
        } else if (R === 1) {
          ws[addr].s = blueStyle;
        } else {
          ws[addr].s = CENTER_COLS.has(C) ? centerSt : leftWrapSt;
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '수리내역');
    XLSX.writeFile(wb, `수리내역_${yy}${mm}${dd}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-h) - 64px)', gap: 16 }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', margin: 0 }}>수리내역 조회</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>객실·일자·수리내역 키워드로 조회합니다.</p>
        </div>
        <button onClick={handleReset} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          🔄 초기화
        </button>
      </div>

      {/* 검색 조건 카드 */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 22px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* 층 */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 90 }}>
            <label style={labelSt}>층</label>
            <select value={selFloor} onChange={e => setSelFloor(e.target.value)} style={{ ...selSt, minWidth: 90 }}>
              <option value="">전체</option>
              {floors.map(f => <option key={f} value={f}>{f}층</option>)}
            </select>
          </div>

          {/* 객실 */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 200 }}>
            <label style={labelSt}>객실</label>
            <select value={selRoom} onChange={e => setSelRoom(e.target.value)} style={{ ...selSt, minWidth: 200 }}>
              <option value="">전체</option>
              {filteredRooms.map(r => (
                <option key={r.room_no} value={r.room_no}>{r.room_no} - {r.room_name}</option>
              ))}
            </select>
          </div>

          {/* 일자 범위 */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 150 }}>
            <label style={labelSt}>수리일자 (시작)</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...selSt, minWidth: 150, colorScheme: 'light dark' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 150 }}>
            <label style={labelSt}>수리일자 (종료)</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...selSt, minWidth: 150, colorScheme: 'light dark' }} />
          </div>

          {/* 키워드 */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 200 }}>
            <label style={labelSt}>수리내역 검색어</label>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="예: 누수, 에어컨, 타일…"
              style={{ ...selSt, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* 조회 버튼 */}
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              padding: '8px 28px', borderRadius: 8, border: 'none', background: 'var(--accent)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap', height: 36,
            }}>
            {loading ? '조회 중…' : '🔍 조회'}
          </button>

          {/* 엑셀저장 버튼 — 항상 표시, 결과 있을 때만 활성화 */}
          <button
            onClick={records.length > 0 ? exportToExcel : undefined}
            disabled={records.length === 0}
            style={{
              padding: '8px 20px', borderRadius: 8, height: 36,
              border: `1px solid ${records.length > 0 ? '#16a34a' : 'var(--border)'}`,
              background: records.length > 0 ? '#16a34a' : 'var(--surface)',
              color: records.length > 0 ? '#fff' : 'var(--text-xs)',
              fontSize: 14, fontWeight: 700,
              cursor: records.length > 0 ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap', opacity: records.length > 0 ? 1 : 0.5,
              transition: 'all 0.2s',
            }}>
            📥 엑셀저장
          </button>
        </div>
      </div>

      {/* 결과 테이블 */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
        {!searched && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-xs)', fontSize: 14 }}>
            조건을 입력 후 조회하세요.
          </div>
        )}
        {searched && records.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-xs)', fontSize: 14 }}>
            조회된 수리내역이 없습니다.
          </div>
        )}
        {records.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 1 }}>
                {['#', '수리일자', '층', '객실번호', '객실명', '수리내역', '등록일시'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 11,
                    fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em',
                    textTransform: 'uppercase', borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec, idx) => {
                const isExpanded = expandedIdx === idx;
                return (
                  <React.Fragment key={idx}>
                    <tr
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      style={{
                        cursor: 'pointer',
                        background: isExpanded ? 'var(--accent-bg)' : idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                        transition: 'background 0.15s',
                        borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: 'var(--text-xs)', fontSize: 12, whiteSpace: 'nowrap' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: 600 }}>{fmtDate(rec.repair_date)}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{rec.floor ?? '-'}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{rec.room_no ?? '-'}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{rec.room_name ?? '-'}</td>
                      <td style={{ padding: '10px 14px', maxWidth: 340, color: isExpanded ? 'var(--accent)' : 'var(--text)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ flex: 1 }}>
                            {isExpanded ? (rec.repair_detail ?? '') : truncate(rec.repair_detail)}
                          </span>
                          {rec.repair_detail && rec.repair_detail.length > 60 && (
                            <span style={{ fontSize: 10, color: 'var(--text-xs)', flexShrink: 0 }}>
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>{fmtTs(rec.created_at)}</td>
                    </tr>
                    {isExpanded && rec.repair_detail && rec.repair_detail.length > 60 && (
                      <tr style={{ background: 'var(--accent-bg)', borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={7} style={{ padding: '0 14px 14px 14px' }}>
                          <div style={{
                            padding: '12px 16px', borderRadius: 8,
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            fontSize: 13, lineHeight: 1.7, color: 'var(--text)',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                          }}>
                            {rec.repair_detail}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 결과 건수 */}
      {searched && records.length > 0 && (
        <div style={{ flexShrink: 0, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
          총 <strong style={{ color: 'var(--text)' }}>{records.length}</strong>건
        </div>
      )}
    </div>
  );
}
