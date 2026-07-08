'use client';

import { useState, useEffect } from 'react';

interface BuildingRoom {
  room_no:   string;
  floor:     string;
  room_name: string;
}

type SaveState = 'idle' | 'saving' | 'done' | 'error';

const selSt: React.CSSProperties = {
  padding: '8px 12px', fontSize: 13, borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text)', cursor: 'pointer', outline: 'none',
};
const labelSt: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block',
};

export function PageRepairRegister() {
  const [rooms,      setRooms]      = useState<BuildingRoom[]>([]);
  const [floors,     setFloors]     = useState<string[]>([]);
  const [selFloor,   setSelFloor]   = useState('');
  const [selRoom,    setSelRoom]    = useState('');
  const [repairDate, setRepairDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [detail,     setDetail]     = useState('');
  const [saveState,  setSaveState]  = useState<SaveState>('idle');
  const [errMsg,     setErrMsg]     = useState('');

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
        if (fl.length) setSelFloor(fl[0]);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const first = filteredRooms[0];
    setSelRoom(first?.room_no ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selFloor]);

  const filteredRooms = rooms.filter(r => !selFloor || r.floor === selFloor);

  const handleReset = () => {
    setDetail('');
    setRepairDate(new Date().toISOString().slice(0, 10));
    setSaveState('idle');
    setErrMsg('');
  };

  const handleSave = async () => {
    if (!repairDate) { setErrMsg('일자를 선택해 주세요.'); return; }
    if (!selRoom)    { setErrMsg('객실을 선택해 주세요.'); return; }

    setSaveState('saving');
    setErrMsg('');
    try {
      const room = rooms.find(r => r.room_no === selRoom);
      const body = {
        repair_date:   repairDate,
        floor:         selFloor,
        room_no:       selRoom,
        room_name:     room?.room_name ?? '',
        repair_detail: detail,
      };

      const res = await fetch(`${supaUrl}/repair_history`, {
        method: 'POST',
        headers: { ...hdr, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error((b as { message?: string })?.message ?? `저장 실패: HTTP ${res.status}`);
      }

      setSaveState('done');
      setTimeout(() => { handleReset(); setSaveState('idle'); }, 3000);
    } catch (e) {
      setErrMsg((e as Error).message);
      setSaveState('error');
    }
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', margin: 0 }}>수리내역 등록</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>수리 일자·객실·내용을 입력하세요.</p>
        </div>
        <button onClick={handleReset} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          🔄 초기화
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 조건 입력 카드 */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>

            {/* 일자 */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 160 }}>
              <label style={labelSt}>수리 일자</label>
              <input
                type="date"
                value={repairDate}
                onChange={e => setRepairDate(e.target.value)}
                style={{ ...selSt, minWidth: 160, colorScheme: 'light dark' }}
              />
            </div>

            {/* 층 */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 100 }}>
              <label style={labelSt}>층</label>
              <select value={selFloor} onChange={e => setSelFloor(e.target.value)} style={{ ...selSt, minWidth: 100 }}>
                <option value="">전체</option>
                {floors.map(f => <option key={f} value={f}>{f}층</option>)}
              </select>
            </div>

            {/* 객실 */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 220 }}>
              <label style={labelSt}>객실 (ROOM_NO - ROOM_NAME)</label>
              <select value={selRoom} onChange={e => setSelRoom(e.target.value)} style={{ ...selSt, width: '100%' }}>
                <option value="">선택</option>
                {filteredRooms.map(r => (
                  <option key={r.room_no} value={r.room_no}>{r.room_no} - {r.room_name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* 수리내역 입력 카드 */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '20px 24px' }}>
          <label style={{ ...labelSt, fontSize: 13, marginBottom: 10 }}>수리내역</label>
          <textarea
            value={detail}
            onChange={e => setDetail(e.target.value)}
            placeholder="수리 내용을 자유롭게 입력하세요.&#10;예) 세면대 수전 교체, 화장실 타일 균열 보수, 에어컨 필터 청소 등"
            rows={8}
            style={{
              width: '100%', padding: '12px 14px', fontSize: 13, lineHeight: 1.7,
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg)', color: 'var(--text)',
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* 오류 메시지 */}
        {errMsg && (
          <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, color: '#DC2626' }}>
            ⚠ {errMsg}
          </div>
        )}

        {/* 저장 완료 */}
        {saveState === 'done' && (
          <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
            ✓ 수리내역이 저장되었습니다. 잠시 후 폼이 초기화됩니다.
          </div>
        )}

        {/* 저장 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saveState === 'saving' || saveState === 'done'}
            style={{
              padding: '12px 40px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700,
              background: saveState === 'done' ? '#16a34a' : 'var(--accent)',
              color: '#fff', cursor: saveState === 'saving' || saveState === 'done' ? 'default' : 'pointer',
              opacity: saveState === 'saving' ? 0.7 : 1,
              boxShadow: saveState === 'done' ? 'none' : '0 2px 12px rgba(13,148,136,0.3)',
              transition: 'all 0.2s',
            }}>
            {saveState === 'saving' && '저장 중…'}
            {saveState === 'done'   && '✓ 저장 완료'}
            {saveState === 'idle'   && '💾 저장'}
            {saveState === 'error'  && '다시 시도'}
          </button>
        </div>

      </div>
    </div>
  );
}
