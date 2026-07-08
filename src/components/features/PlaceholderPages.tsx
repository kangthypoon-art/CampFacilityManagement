'use client';

import type { ReactNode } from 'react';

/* ── 공통 스타일 헬퍼 ── */
function PageShell({ title, desc, btnLabel, children }: { title: string; desc: string; btnLabel: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4, color: 'var(--text)' }}>{title}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{desc}</p>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 10px rgba(13,148,136,0.28)', whiteSpace: 'nowrap' }}>
          {btnLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

function PhCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', padding: '24px 26px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', transition: 'background var(--t), border-color var(--t)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</div>
      {children}
    </div>
  );
}

function PhTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  const tdStyle: React.CSSProperties = { padding: '13px 12px 13px 0', fontSize: 13, borderBottom: '1px solid var(--border)', verticalAlign: 'middle', color: 'var(--text)' };
  const thStyle: React.CSSProperties = { textAlign: 'left', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-xs)', padding: '0 12px 12px 0', borderBottom: '2px solid var(--border)' };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{headers.map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => <td key={j} style={{ ...tdStyle, borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border)' }}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusDot({ type, label }: { type: 'ok' | 'warn' | 'err' | 'idle'; label: string }) {
  const colors = { ok: 'var(--green)', warn: 'var(--orange)', err: 'var(--red)', idle: 'var(--text-xs)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: colors[type], boxShadow: type !== 'idle' ? `0 0 0 2px ${colors[type]}30` : 'none', display: 'inline-block' }} />
      {label}
    </span>
  );
}

function Badge({ type, label }: { type: 'green' | 'orange' | 'red' | 'blue'; label: string }) {
  const styles: Record<string, React.CSSProperties> = {
    green:  { background: 'rgba(16,185,129,0.1)',  color: '#059669' },
    orange: { background: 'rgba(249,115,22,0.1)',  color: '#EA580C' },
    red:    { background: 'rgba(239,68,68,0.1)',   color: '#DC2626' },
    blue:   { background: 'rgba(59,130,246,0.1)',  color: '#2563EB' },
  };
  return <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', ...styles[type] }}>{label}</span>;
}

/* ── 비품관리 ── */
export function PageSupplies() {
  const rows = [
    ['에어컨',       '24대', '전 객실',   <StatusDot type="ok"   label="정상" />,     '2026-06-01'],
    ['침대 프레임',  '48개', 'A·B동',     <StatusDot type="ok"   label="정상" />,     '2026-05-20'],
    ['냉장고',       '24대', '전 객실',   <StatusDot type="warn" label="점검 필요" />, '2026-04-15'],
    ['TV (55인치)',  '24대', '전 객실',   <StatusDot type="ok"   label="정상" />,     '2026-06-10'],
    ['세탁기',       '6대',  '세탁실',    <StatusDot type="err"  label="고장" />,      '2026-06-18'],
    ['소화기',       '32개', '각 층 복도', <StatusDot type="ok"   label="정상" />,     '2026-06-05'],
    ['인터넷 공유기','12대', 'A·B·C동',   <StatusDot type="ok"   label="정상" />,     '2026-06-12'],
    ['전기 주전자', '24개', '전 객실',    <StatusDot type="warn" label="일부 교체" />, '2026-05-30'],
  ];
  return (
    <PageShell title="비품 관리" desc="캠프관 비품 현황 및 점검 상태를 관리하세요" btnLabel="＋ 비품 등록">
      <PhCard title="비품 현황">
        <PhTable headers={['비품명','수량','위치','상태','최종점검일']} rows={rows} />
      </PhCard>
    </PageShell>
  );
}

/* ── 설비관리 ── */
export function PageFacilities() {
  const rows = [
    ['보일러 (A동)', '지하 1층', <StatusDot type="ok"   label="정상" />,     '김기사', '2026-07-01'],
    ['보일러 (B동)', '지하 1층', <StatusDot type="warn" label="점검중" />,   '김기사', '2026-06-20'],
    ['엘리베이터',   '메인 로비', <StatusDot type="ok"   label="정상" />,    '이기사', '2026-07-15'],
    ['발전기',       '옥외 기계실', <StatusDot type="ok" label="정상" />,    '박기사', '2026-08-01'],
    ['수도 펌프',    '지하 2층', <StatusDot type="err"  label="이상 감지" />, '최기사', '2026-06-19'],
    ['CCTV 시스템', '전 구역',  <StatusDot type="ok"   label="정상" />,     '정기사', '2026-07-01'],
    ['전기 분전반', '각 층',    <StatusDot type="ok"   label="정상" />,     '이기사', '2026-09-01'],
  ];
  return (
    <PageShell title="설비 관리" desc="캠프관 설비 점검 일정 및 상태를 관리하세요" btnLabel="＋ 점검 등록">
      <PhCard title="설비 점검 현황">
        <PhTable headers={['설비명','위치','상태','담당자','다음점검일']} rows={rows} />
      </PhCard>
    </PageShell>
  );
}

/* ── 출입관리 ── */
export function PageAccess() {
  const rows = [
    ['09:02', '김민준', 'A동 101호', '정문', <Badge type="green" label="입장" />],
    ['09:15', '이서연', 'B동 203호', '후문', <Badge type="green" label="입장" />],
    ['10:30', '박도현', '외부 방문', '정문', <Badge type="blue"  label="방문" />],
    ['11:45', '최수아', 'A동 105호', '정문', <Badge type="red"   label="퇴장" />],
    ['13:10', '정지호', '관리팀',    '관리동', <Badge type="green" label="입장" />],
    ['14:22', '강현우', 'B동 210호', '후문', <Badge type="red"   label="퇴장" />],
    ['15:08', '윤지민', 'C동 301호', '정문', <Badge type="green" label="입장" />],
    ['16:55', '송태양', '외부 방문', '정문', <Badge type="red"   label="퇴장" />],
  ];
  return (
    <PageShell title="출입 관리" desc="오늘의 출입 기록을 확인하고 관리하세요" btnLabel="＋ 권한 추가">
      <PhCard title="출입 기록 — 오늘">
        <PhTable headers={['시간','이름','소속','출입문','구분']} rows={rows} />
      </PhCard>
    </PageShell>
  );
}

/* ── 사용자 ── */
export function PageUsers() {
  const rows = [
    ['김관리', <Badge type="blue"   label="관리자" />, 'admin@camp.kr',  <StatusDot type="ok"   label="활성" />,   '2026-06-19 09:00'],
    ['이운영', <Badge type="orange" label="운영자" />, 'op1@camp.kr',    <StatusDot type="ok"   label="활성" />,   '2026-06-19 08:45'],
    ['박담당', <Badge type="orange" label="운영자" />, 'op2@camp.kr',    <StatusDot type="idle" label="오프라인" />, '2026-06-18 17:30'],
    ['최직원', <Badge type="green"  label="일반" />,   'staff1@camp.kr', <StatusDot type="ok"   label="활성" />,   '2026-06-19 10:10'],
    ['정직원', <Badge type="green"  label="일반" />,   'staff2@camp.kr', <StatusDot type="idle" label="오프라인" />, '2026-06-17 14:00'],
  ];
  return (
    <PageShell title="사용자 관리" desc="시스템 사용자 계정 및 권한을 관리하세요" btnLabel="＋ 사용자 추가">
      <PhCard title="사용자 목록">
        <PhTable headers={['이름','역할','이메일','상태','마지막 로그인']} rows={rows} />
      </PhCard>
    </PageShell>
  );
}

/* ── 상품 ── */
export function PageProducts() {
  const rows = [
    ['1인 객실 (1박)', '₩ 85,000',  '12', <StatusDot type="ok"   label="판매중" />],
    ['2인 객실 (1박)', '₩ 130,000', '8',  <StatusDot type="ok"   label="판매중" />],
    ['단체실 (1박)',   '₩ 280,000', '2',  <StatusDot type="warn" label="잔여 적음" />],
    ['조식 패키지',   '₩ 15,000',  '50', <StatusDot type="ok"   label="판매중" />],
    ['세탁 서비스',   '₩ 8,000',   '—',  <StatusDot type="err"  label="일시 중단" />],
  ];
  return (
    <PageShell title="상품 관리" desc="객실 상품 및 서비스 가격을 관리하세요" btnLabel="＋ 상품 추가">
      <PhCard title="상품 목록">
        <PhTable headers={['상품명','가격','재고','상태']} rows={rows} />
      </PhCard>
    </PageShell>
  );
}

/* ── 메시지 ── */
export function PageMessages() {
  const rows = [
    ['이서연 (B동 203호)', '에어컨 소음 발생 — 점검 요청드립니다',          '13:22', <Badge type="red"   label="미확인" />],
    ['박도현 (외부)',       '내일 오전 10시 방문 예약 확인 부탁드려요',       '11:05', <Badge type="red"   label="미확인" />],
    ['최수아 (A동 105호)', '퇴실 시간 연장 가능한지 문의합니다',              '10:48', <Badge type="red"   label="미확인" />],
    ['시스템 알림',         '수도 펌프 이상 감지 — 즉시 점검 필요',           '09:30', <Badge type="green" label="확인" />],
    ['김관리 (관리팀)',     '주간 회의 자료 공유드립니다',                    '어제',  <Badge type="green" label="확인" />],
  ];
  return (
    <PageShell title="메시지함" desc="수신된 메시지 및 시스템 알림을 확인하세요" btnLabel="＋ 메시지 작성">
      <PhCard title="수신 메시지">
        <PhTable headers={['발신자','내용','시간','읽음']} rows={rows} />
      </PhCard>
    </PageShell>
  );
}

/* ── 설정 ── */
export function PageSettings() {
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500 };
  return (
    <PageShell title="시스템 설정" desc="캠프관 운영 환경 설정을 관리하세요" btnLabel="설정 저장">
      <PhCard title="기본 설정">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>시설명</div>
            <div style={{ padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--text)' }}>캠프관 현황 관리 시스템</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>알림 이메일</div>
            <div style={{ padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--text)' }}>admin@camp.kr</div>
          </div>
          <div style={rowStyle}><span>이상 감지 자동 알림</span><Badge type="green" label="활성화" /></div>
          <div style={rowStyle}><span>야간 자동 잠금 (22:00)</span><Badge type="green" label="활성화" /></div>
          <div style={rowStyle}><span>백업 자동 저장</span><Badge type="orange" label="설정 필요" /></div>
        </div>
      </PhCard>
    </PageShell>
  );
}

/* ── 보안 ── */
export function PageSecurity() {
  const rows = [
    ['09:00:12', '관리자 로그인', '192.168.1.10', <Badge type="green"  label="성공" />],
    ['09:00:45', '운영자 로그인', '192.168.1.22', <Badge type="green"  label="성공" />],
    ['10:15:33', '로그인 시도',  '203.0.113.5',   <Badge type="red"    label="실패" />],
    ['10:15:51', '로그인 시도',  '203.0.113.5',   <Badge type="red"    label="실패" />],
    ['10:16:04', 'IP 자동 차단', '203.0.113.5',   <Badge type="orange" label="차단됨" />],
    ['13:40:08', '설정 변경',    '192.168.1.10',  <Badge type="green"  label="성공" />],
  ];
  return (
    <PageShell title="보안 로그" desc="시스템 접근 이벤트 및 보안 현황을 모니터링하세요" btnLabel="로그 내보내기">
      <PhCard title="접근 이벤트">
        <PhTable headers={['시간','이벤트','IP','결과']} rows={rows} />
      </PhCard>
    </PageShell>
  );
}
