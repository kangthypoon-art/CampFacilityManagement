'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';

interface RoomRow {
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

type SaveState = 'idle' | 'saving' | 'done' | 'error';

const COLS: { key: keyof RoomRow; label: string }[] = [
  { key: 'year',          label: '연도'   },
  { key: 'half_year',     label: '반기'   },
  { key: 'room_no',       label: '객실번호' },
  { key: 'chasu',         label: '차수'   },
  { key: 'seq',           label: 'seq'   },
  { key: 'school',        label: '학교'   },
  { key: 'name',          label: '이름'   },
  { key: 'grade',         label: '학년'   },
  { key: 'gender',        label: '성별'   },
  { key: 'check_in_ymd',  label: '입실일'  },
  { key: 'check_out_ymd', label: '퇴실일'  },
];

export function PageUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]             = useState<RoomRow[]>([]);
  const [fileName, setFileName]     = useState('');
  const [saveState, setSaveState]   = useState<SaveState>('idle');
  const [errMsg, setErrMsg]         = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [dragOver, setDragOver]     = useState(false);
  const [seqBusy, setSeqBusy]         = useState(false);
  const [seqWarnings, setSeqWarnings] = useState<string[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [rawFirstRow, setRawFirstRow] = useState<Record<string, unknown> | null>(null);

  // 여러 가능한 헤더명 중 첫 번째로 값이 있는 것을 반환
  const pick = (r: Record<string, unknown>, ...keys: string[]): unknown => {
    for (const k of keys) {
      const v = r[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return undefined;
  };

  const parseFile = (file: File) => {
    setFileName(file.name);
    setSaveState('idle');
    setErrMsg('');
    setSeqWarnings([]);
    setDetectedHeaders([]);
    setRawFirstRow(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // cellDates: false 로 날짜를 문자열로 유지, defval 없이 파싱해서 병합셀 빈값 감지
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

        // 실제 헤더 + 첫 행 원시값 감지
        const headers = raw.length > 0 ? Object.keys(raw[0]) : [];
        setDetectedHeaders(headers);
        if (raw.length > 0) setRawFirstRow(raw[0]);

        // fill-forward: 병합셀로 비어있는 연도/반기/객실번호/차수를 이전 행 값으로 채움
        let lastYear: unknown     = null;
        let lastHalfYear: unknown = null;
        let lastRoomNo: unknown   = null;
        let lastChasu: unknown    = null;

        const mapped: RoomRow[] = raw.map((r) => {
          const rawYear    = pick(r, '연도', '년도', 'year', 'YEAR');
          const rawHalf    = pick(r, '반기', 'half_year', '학기', '반기구분');
          const rawRoomNo  = pick(r, '객실번호', '방번호', '호실', '객실', 'room_no', 'ROOM_NO');
          const rawChasu   = pick(r, '차수', 'chasu', 'CHASU');

          // 값이 있으면 갱신, 없으면 이전 값 사용 (병합셀 fill-forward)
          if (rawYear   !== null && rawYear   !== undefined) lastYear    = rawYear;
          if (rawHalf   !== null && rawHalf   !== undefined) lastHalfYear = rawHalf;
          if (rawRoomNo !== null && rawRoomNo !== undefined) lastRoomNo  = rawRoomNo;
          if (rawChasu  !== null && rawChasu  !== undefined) lastChasu   = rawChasu;

          return {
            year:          Number(lastYear     ?? 0),
            half_year:     String(lastHalfYear ?? ''),
            room_no:       String(lastRoomNo   ?? ''),
            chasu:         String(lastChasu    ?? ''),
            seq:           Number(pick(r, 'seq', '순번', '번호', 'SEQ') ?? 0),
            school:        String(pick(r, '학교', '학교명', 'school', 'SCHOOL')    ?? ''),
            name:          String(pick(r, '이름', '성명', '학생명', 'name', 'NAME') ?? ''),
            grade:         Number(pick(r, '학년', 'grade', 'GRADE')               ?? 0),
            gender:        String(pick(r, '성별', 'gender', 'GENDER')             ?? ''),
            check_in_ymd:  String(pick(r, '입실일', '체크인', 'check_in_ymd')      ?? ''),
            check_out_ymd: String(pick(r, '퇴실일', '체크아웃', 'check_out_ymd')   ?? ''),
          };
        });
        setRows(mapped);
      } catch {
        setErrMsg('파일을 읽을 수 없습니다. 엑셀(.xlsx/.xls) 파일인지 확인해 주세요.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  };

  const handleReset = () => {
    setRows([]);
    setFileName('');
    setSaveState('idle');
    setErrMsg('');
    setSavedCount(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleAssignSeq = async () => {
    const url = '/api/supabase/rest/v1';
    const hdr = { 'Content-Type': 'application/json' };

    setSeqBusy(true);
    setErrMsg('');
    setSeqWarnings([]);
    try {
      // room_master에서 room_no별 guest_count 조회 (seq=1 기준)
      const res = await fetch(
        `${url}/room_master?category_code=eq.1000&seq=eq.1&select=room_no,guest_count`,
        { headers: hdr }
      );
      const master: { room_no: string; guest_count: number }[] = await res.json();

      const guestCountMap: Record<string, number> = {};
      for (const { room_no, guest_count } of master) {
        guestCountMap[room_no] = guest_count ?? 0;
      }

      // room_no별 현재 순번 카운터
      const counter: Record<string, number> = {};
      const warnings: string[] = [];

      const assigned = rows.map((row) => {
        const roomNo = String(row.room_no).trim();
        const chasu  = String(row.chasu).trim();
        const max = guestCountMap[roomNo];
        if (!roomNo) return row;
        if (max === undefined) {
          warnings.push(`객실 ${roomNo}: room_master에 없는 객실번호`);
          return row;
        }
        const cKey = `${roomNo}|${chasu}`;
        counter[cKey] = (counter[cKey] ?? 0) + 1;
        const seq = counter[cKey];
        if (seq > max) {
          if (!warnings.some(w => w.startsWith(`객실 ${roomNo} ${chasu}: 정원`)))
            warnings.push(`객실 ${roomNo} ${chasu}: 정원(${max}명) 초과`);
        }
        return { ...row, seq };
      });

      setRows(assigned);
      setSeqWarnings([...new Set(warnings)]);
      setSaveState('idle');
    } catch (e) {
      setErrMsg((e as Error).message);
    } finally {
      setSeqBusy(false);
    }
  };

  const handleSave = async () => {
    if (!rows.length) return;
    if (rows.some(r => r.seq === 0)) {
      setErrMsg('순번이 부여되지 않은 행이 있습니다. 먼저 [순번부여] 버튼을 클릭하세요.');
      return;
    }
    const url = '/api/supabase/rest/v1';
    const hdr = { 'Content-Type': 'application/json' };

    // PK(year, half_year, room_no, chasu, seq) 기준 중복 제거 — 마지막 행 우선
    const pkKey = (r: RoomRow) => `${r.year}|${r.half_year}|${r.room_no}|${r.chasu}|${r.seq}`;
    const deduped = [...new Map(rows.map((r) => [pkKey(r), r])).values()];
    const dupCount = rows.length - deduped.length;

    setSaveState('saving');
    setErrMsg('');
    try {
      // Supabase REST는 한 번에 너무 많은 행을 보내면 중복 충돌 가능 → 청크로 나눠 전송
      const CHUNK = 100;
      for (let i = 0; i < deduped.length; i += CHUNK) {
        const chunk = deduped.slice(i, i + CHUNK);
        const res = await fetch(`${url}/room_assignment`, {
          method: 'POST',
          headers: {
            ...hdr,
            Prefer: 'return=minimal,resolution=merge-duplicates',
          },
          body: JSON.stringify(chunk),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message ?? `HTTP ${res.status}`);
        }
      }
      setSavedCount(deduped.length);
      if (dupCount > 0) setErrMsg('');
      setSaveState('done');
      if (dupCount > 0)
        setSeqWarnings((w) => [`중복 행 ${dupCount}건 제거 후 저장`, ...w]);
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
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4, color: 'var(--text)' }}>
            입실데이터 일괄등록
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            엑셀 파일을 업로드하면 내용을 확인 후 room_assignment 테이블에 저장합니다.
          </p>
        </div>
        {rows.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleReset}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all var(--t)',
              }}
            >
              🔄 초기화
            </button>
            <button
              onClick={handleAssignSeq}
              disabled={seqBusy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 'var(--r-sm)',
                border: 'none', background: seqBusy ? 'var(--border)' : 'var(--blue)',
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: seqBusy ? 'default' : 'pointer', transition: 'all var(--t)',
                opacity: seqBusy ? 0.7 : 1,
              }}
            >
              {seqBusy ? '조회 중…' : '🔢 순번부여'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: rows.length ? '320px 1fr' : '1fr', gap: 20 }}>
        {/* 왼쪽: 업로드 영역 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 드래그앤드롭 존 */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--r)',
              background: dragOver ? 'var(--accent-bg)' : 'var(--surface)',
              padding: '40px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              cursor: 'pointer',
              transition: 'all var(--t)',
            }}
          >
            <div style={{ fontSize: 40 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              엑셀 파일을 드래그하거나 클릭
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>.xlsx / .xls 지원</div>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {/* 파일명 */}
          {fileName && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', padding: '10px 14px',
              fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>📄</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{rows.length}행</span>
            </div>
          )}

          {/* 컬럼 가이드 */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              엑셀 헤더 형식
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                <thead>
                  <tr>
                    {COLS.map(({ label }) => (
                      <th key={label} style={{ padding: '5px 8px', border: '1px solid var(--border)', background: 'var(--accent)', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {COLS.map(({ key }) => (
                      <td key={key} style={{ padding: '4px 8px', border: '1px solid var(--border)', color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: 'center', fontSize: 10 }}>
                        {key}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 저장 버튼 */}
          {rows.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saveState === 'saving' || saveState === 'done'}
              style={{
                padding: '12px 0', borderRadius: 'var(--r-sm)',
                background: saveState === 'done' ? 'var(--green)' : 'var(--accent)',
                color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
                cursor: saveState === 'saving' || saveState === 'done' ? 'default' : 'pointer',
                opacity: saveState === 'saving' ? 0.7 : 1,
                transition: 'all var(--t)',
              }}
            >
              {saveState === 'saving' && '저장 중…'}
              {saveState === 'done'   && `✓ ${savedCount}건 저장 완료`}
              {saveState === 'idle'   && `💾 ${rows.length}건 저장`}
              {saveState === 'error'  && '다시 시도'}
            </button>
          )}

          {/* 순번부여 경고 */}
          {seqWarnings.length > 0 && (
            <div style={{
              background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
              borderRadius: 'var(--r-sm)', padding: '10px 14px',
              fontSize: 12, color: '#EA580C', display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <strong>⚠️ 순번 경고</strong>
              {seqWarnings.map((w, i) => <span key={i}>• {w}</span>)}
            </div>
          )}

          {/* 오류 메시지 */}
          {errMsg && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 'var(--r-sm)', padding: '10px 14px',
              fontSize: 12, color: '#DC2626',
            }}>
              ⚠️ {errMsg}
            </div>
          )}
        </div>

        {/* 오른쪽: 미리보기 테이블 */}
        {rows.length > 0 && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>미리보기</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>총 {rows.length}건</span>
            </div>
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    {COLS.map(({ label }) => (
                      <th key={label} style={thStyle}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                      <td style={tdStyle}>{i + 1}</td>
                      {COLS.map(({ key }) => (
                        <td key={key} style={tdStyle}>{String(row[key] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-xs)',
  background: 'var(--bg)',
  borderBottom: '2px solid var(--border)',
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text)',
  whiteSpace: 'nowrap',
};
