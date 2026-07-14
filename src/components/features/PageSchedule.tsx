'use client';

import { useState, useEffect, useMemo } from 'react';

interface Session {
  key:           string;
  year:          number;
  half_year:     string;
  chasu:         string;
  check_in_ymd:  string;  // YYYY-MM-DD
  check_out_ymd: string;
}

interface AssignmentRow {
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

function normalizeDate(d: unknown): string {
  if (d == null || d === '') return '';
  const s = String(d).replace(/[\/\.]/g, '-').trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const COLORS = [
  '#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899',
  '#10B981', '#EF4444', '#0EA5E9', '#F97316', '#6366F1',
  '#84CC16', '#A855F7', '#14B8A6', '#F43F5E', '#FACC15',
];

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

const NAV_BTN: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)',
  background: 'var(--card-bg)', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300,
};

const TH: React.CSSProperties = {
  padding: '11px 10px', lineHeight: '16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  letterSpacing: '0.05em', color: 'var(--text-xs)',
  background: 'var(--bg)', borderBottom: '2px solid var(--border)',
  whiteSpace: 'nowrap', position: 'sticky', top: 0,
};
const TD: React.CSSProperties = {
  padding: '6px 10px', borderBottom: '1px solid var(--border)',
  color: 'var(--text)', whiteSpace: 'nowrap', fontSize: 12,
};

// ── 우측 패널: 선택된 세션의 객실배정 목록 (읽기 전용) ─────────────────────────

function SessionPanel({ session, onClose }: { session: Session; onClose: () => void }) {
  const [rows, setRows]     = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const BASE = '/api/supabase/rest/v1';
  const HDR  = { 'Content-Type': 'application/json' };

  useEffect(() => {
    setLoading(true);
    fetch(
      `${BASE}/room_assignment?select=*` +
      `&year=eq.${session.year}` +
      `&half_year=eq.${encodeURIComponent(session.half_year)}` +
      `&chasu=eq.${encodeURIComponent(session.chasu)}` +
      `&order=room_no,seq`,
      { headers: HDR }
    )
      .then(r => r.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) { setRows([]); return; }
        setRows((data as Record<string, unknown>[]).map(r => ({
          year:          Number(r.year ?? 0),
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
        })));
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.year, session.half_year, session.chasu]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 16, overflow: 'hidden',
      height: '100%', boxSizing: 'border-box',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>객실배정</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {session.year}년 {session.half_year} {session.chasu}차
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-xs)', marginTop: 1 }}>
            {session.check_in_ymd} ~ {session.check_out_ymd}
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)',
          background: 'var(--card-bg)', cursor: 'pointer', fontSize: 18, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', flexShrink: 0,
        }}>×</button>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>로딩 중…</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={TH}>객실</th>
                  <th style={{ ...TH, textAlign: 'center' }}>차수</th>
                  <th style={{ ...TH, textAlign: 'center' }}>seq</th>
                  <th style={TH}>학교</th>
                  <th style={TH}>이름</th>
                  <th style={{ ...TH, textAlign: 'center' }}>학년</th>
                  <th style={{ ...TH, textAlign: 'center' }}>성별</th>
                  <th style={{ ...TH, textAlign: 'center' }}>입실일</th>
                  <th style={{ ...TH, textAlign: 'center' }}>퇴실일</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.room_no}|${row.seq}`}
                    style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)' }}>
                    <td style={{ ...TD, fontWeight: 600 }}>{row.room_no}호</td>
                    <td style={{ ...TD, textAlign: 'center' }}>{row.chasu}차</td>
                    <td style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>{row.seq}</td>
                    <td style={TD}>{row.school}</td>
                    <td style={{ ...TD, fontWeight: 600 }}>{row.name}</td>
                    <td style={{ ...TD, textAlign: 'center' }}>{row.grade}학년</td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span style={{
                        padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: row.gender === '남' ? 'rgba(59,130,246,0.12)' : row.gender === '여' ? 'rgba(244,114,182,0.15)' : 'transparent',
                        color: row.gender === '남' ? '#2563eb' : row.gender === '여' ? '#db2777' : 'var(--text)',
                      }}>{row.gender || '-'}</span>
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>{row.check_in_ymd}</td>
                    <td style={{ ...TD, textAlign: 'center' }}>{row.check_out_ymd}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ ...TD, textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      데이터 없음
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>총 {rows.length}건</div>
        </>
      )}
    </div>
  );
}

// ── 메인 달력 컴포넌트 ─────────────────────────────────────────────────────────

export function PageSchedule() {
  const today = new Date();
  const [viewYear, setViewYear]         = useState(today.getFullYear());
  const [viewMonth, setViewMonth]       = useState(today.getMonth() + 1);
  const [sessions, setSessions]         = useState<Session[]>([]);
  const [loading, setLoading]           = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const BASE = '/api/supabase/rest/v1';
  const HDR  = { 'Content-Type': 'application/json' };

  useEffect(() => {
    setLoading(true);
    const first8 = toYMD(viewYear, viewMonth, 1).replace(/-/g, '');
    const last8  = toYMD(viewYear, viewMonth, new Date(viewYear, viewMonth, 0).getDate()).replace(/-/g, '');

    fetch(
      `${BASE}/room_assignment?select=year,half_year,chasu,check_in_ymd,check_out_ymd` +
      `&check_out_ymd=gte.${first8}&check_out_ymd=lte.${last8}&order=year,half_year,chasu,check_in_ymd`,
      { headers: HDR }
    )
      .then(r => r.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) { setSessions([]); return; }
        const seen = new Set<string>();
        const uniq: Session[] = [];
        for (const a of data as Record<string, unknown>[]) {
          const cin  = normalizeDate(a.check_in_ymd);
          const cout = normalizeDate(a.check_out_ymd);
          const key  = `${a.year}|${a.half_year}|${a.chasu}|${cin}|${cout}`;
          if (seen.has(key)) continue;
          seen.add(key);
          uniq.push({
            key,
            year:          Number(a.year      ?? 0),
            half_year:     String(a.half_year ?? ''),
            chasu:         String(a.chasu     ?? ''),
            check_in_ymd:  cin,
            check_out_ymd: cout,
          });
        }
        setSessions(uniq);
        // 월 변경 시 선택된 세션이 더 이상 이 달에 없으면 닫기
        setSelectedSession(prev => {
          if (!prev) return null;
          const still = uniq.find(s => s.key === prev.key);
          return still ?? null;
        });
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    sessions.forEach((s, i) => { map[s.key] = COLORS[i % COLORS.length]; });
    return map;
  }, [sessions]);

  const cells = useMemo(() => {
    const startDow    = new Date(viewYear, viewMonth - 1, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const arr: (number | null)[] = Array(startDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [viewYear, viewMonth]);

  const todayStr = toYMD(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const weeks    = cells.length / 7;

  const fmtShort = (ymd: string) => {
    const p = ymd.split('-');
    return p.length === 3 ? `${p[1]}/${p[2]}` : ymd;
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  const calendarBlock = (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>

      {/* 요일 헤더 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        background: 'var(--sidebar-bg)', borderBottom: '2px solid var(--border)',
      }}>
        {WEEKDAYS.map((d, i) => (
          <div key={d} style={{
            padding: '11px 0', lineHeight: '16px', textAlign: 'center', fontSize: 13, fontWeight: 700,
            color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : 'var(--text)',
            borderRight: i < 6 ? '1px solid var(--border)' : 'none',
          }}>{d}</div>
        ))}
      </div>

      {/* 주별 행 */}
      {Array.from({ length: weeks }, (_, wi) => {
        const weekCells = cells.slice(wi * 7, wi * 7 + 7);

        type WeekSession = Session & { startCol: number; endCol: number; isStart: boolean; isEnd: boolean };
        const weekSessions: WeekSession[] = [];

        for (const s of sessions) {
          let startCol = -1, endCol = -1;
          weekCells.forEach((day, di) => {
            if (!day) return;
            const ds = toYMD(viewYear, viewMonth, day);
            if (ds >= s.check_in_ymd && ds <= s.check_out_ymd) {
              if (startCol === -1) startCol = di;
              endCol = di;
            }
          });
          if (startCol === -1) continue;

          const startDay = weekCells[startCol]!;
          const endDay   = weekCells[endCol]!;
          weekSessions.push({
            ...s,
            startCol,
            endCol,
            isStart: toYMD(viewYear, viewMonth, startDay) === s.check_in_ymd,
            isEnd:   toYMD(viewYear, viewMonth, endDay)   === s.check_out_ymd,
          });
        }

        const hasBars = weekSessions.length > 0;

        return (
          <div key={wi} style={{
            position: 'relative',
            borderBottom: wi < weeks - 1 ? '1px solid var(--border)' : 'none',
          }}>

            {/* 세션 바: absolute 오버레이 (pointerEvents: none → 개별 바에서 auto) */}
            {hasBars && (
              <div style={{
                position: 'absolute', top: 5, left: 0, right: 0, zIndex: 2,
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                pointerEvents: 'none',
              }}>
                {weekSessions.map(ws => {
                  const color      = colorMap[ws.key] ?? COLORS[0];
                  const isSelected = selectedSession?.key === ws.key;
                  const br = ws.isStart && ws.isEnd
                    ? '20px'
                    : ws.isStart ? '20px 0 0 20px'
                    : ws.isEnd   ? '0 20px 20px 0'
                    : '0';
                  const label = ws.isStart
                    ? `${ws.half_year} ${ws.chasu}차  ${fmtShort(ws.check_in_ymd)} ~ ${fmtShort(ws.check_out_ymd)}`
                    : '';
                  return (
                    <div
                      key={ws.key}
                      title={`${ws.year}년 ${ws.half_year} (${ws.chasu}차)\n${ws.check_in_ymd} ~ ${ws.check_out_ymd}`}
                      onClick={() => setSelectedSession(prev => prev?.key === ws.key ? null : ws)}
                      style={{
                        gridColumn: `${ws.startCol + 1} / ${ws.endCol + 2}`,
                        background: color, color: '#fff',
                        fontSize: 11.5, fontWeight: 600, lineHeight: '24px',
                        padding: '0 10px', borderRadius: br,
                        marginLeft:  ws.isStart ? 4 : 0,
                        marginRight: ws.isEnd   ? 4 : 0,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        pointerEvents: 'auto', cursor: 'pointer',
                        outline: isSelected ? `2px solid #fff` : 'none',
                        outlineOffset: -2,
                        opacity: selectedSession && !isSelected ? 0.55 : 1,
                        transition: 'opacity 0.15s, outline 0.1s',
                      }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 날짜 셀 (고정 높이 87px) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {weekCells.map((day, di) => {
                const dateStr = day ? toYMD(viewYear, viewMonth, day) : '';
                const isToday = dateStr === todayStr;
                const inSess  = day && sessions.some(s => dateStr >= s.check_in_ymd && dateStr <= s.check_out_ymd);

                return (
                  <div key={di} style={{
                    height: 87, boxSizing: 'border-box',
                    padding: `${hasBars ? 34 : 8}px 10px 6px`,
                    borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                    background: day
                      ? inSess ? 'rgba(13,148,136,0.04)' : 'var(--card-bg)'
                      : 'rgba(0,0,0,0.02)',
                  }}>
                    {day && (
                      isToday ? (
                        <span style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: '#0D9488', color: '#fff',
                          fontSize: 12, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>{day}</span>
                      ) : (
                        <span style={{
                          fontSize: 13, fontWeight: 500,
                          color: di === 0 ? '#EF4444' : di === 6 ? '#3B82F6' : 'var(--text)',
                        }}>{day}</span>
                      )
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* 달력 영역 */}
      <div style={{
        flex: selectedSession ? '0 0 42%' : '1 1 100%',
        maxWidth: selectedSession ? '42%' : 1100,
        margin: selectedSession ? 0 : '0 auto',
        minWidth: 0,
        transition: 'flex 0.25s ease, max-width 0.25s ease',
      }}>
        {/* 월 네비게이션 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
          <button onClick={prevMonth} style={NAV_BTN}>‹</button>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', minWidth: 160, textAlign: 'center' }}>
            {viewYear}년 {viewMonth}월
          </h2>
          <button onClick={nextMonth} style={NAV_BTN}>›</button>
          {loading && <span style={{ fontSize: 12, color: 'var(--text-xs)', marginLeft: 8 }}>로딩 중…</span>}
        </div>

        {calendarBlock}
      </div>

      {/* 우측 패널: 세션 선택 시 표시 */}
      {selectedSession && (
        <div style={{ flex: '1 1 0', minWidth: 320, marginTop: 58 }}>
          <SessionPanel session={selectedSession} onClose={() => setSelectedSession(null)} />
        </div>
      )}
    </div>
  );
}
