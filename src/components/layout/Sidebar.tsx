'use client';

import { useState, useEffect } from 'react';
import { useNavStore } from '@/stores/navStore';
import type { PageKey } from '@/types';

interface SubSubItemDef {
  page: PageKey;
  label: string;
}

interface SubItemDef {
  page: PageKey;
  label: string;
  sub?: SubSubItemDef[];   // 3단계 서브 아이템
}

interface NavItemDef {
  page: PageKey;
  label: string;
  icon: string;
  badge?: number;
  disabled?: boolean;
  sub?: SubItemDef[];
}

const NAV_ITEMS: NavItemDef[] = [
  {
    page: 'rooms',
    label: '객실관리',
    icon: '🛏',
    sub: [
      { page: 'floorplan', label: '층별 배치도' },
      {
        page: 'data-registration',
        label: '데이터 등록',
        sub: [
          { page: 'master-upload',         label: '마스터 등록'    },
          { page: 'building-code-upload',  label: '빌딩코드 등록'  },
          { page: 'price-upload',          label: '단가 등록'      },
          { page: 'upload',        label: '입실데이터 등록' },
        ],
      },
      { page: 'data-manage', label: '데이터 관리' },
    ],
  },
  {
    page: 'supplies',
    label: '세탁관리',
    icon: '🧺',
    sub: [
      { page: 'laundry-targets',    label: '세탁 대상 추출 및 확정' },
      { page: 'laundry-settlement', label: '세탁비 정산' },
    ],
  },
  {
    page: 'facilities', label: '설비현황', icon: '🔧',
    sub: [
      { page: 'repair-register', label: '수리내역 등록' },
      { page: 'repair-inquiry',  label: '수리내역 조회' },
    ],
  },
  { page: 'access',     label: '출입관리', icon: '🚪', disabled: true },
];

const MANAGE_ITEMS: NavItemDef[] = [
  { page: 'users', label: '사용자', icon: '👥' },
];

const SYSTEM_ITEMS: NavItemDef[] = [
  { page: 'settings', label: '설정', icon: '⚙️', disabled: true },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
      textTransform: 'uppercase', color: 'var(--text-xs)',
      padding: '18px 6px 7px', flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {children}
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function NavItemRow({ item, isActive, onClick }: {
  item: NavItemDef; isActive: boolean; onClick: () => void;
}) {
  const disabled = item.disabled ?? false;
  return (
    <div
      role="button" tabIndex={disabled ? -1 : 0}
      data-testid={`nav-item-${item.page}`}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => !disabled && e.key === 'Enter' && onClick()}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '4px 8px 4px 6px', borderRadius: 9,
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--text-xs)' : isActive ? 'var(--accent)' : 'var(--text-muted)',
        fontSize: 13.5, fontWeight: isActive ? 600 : 500,
        opacity: disabled ? 0.45 : 1,
        transition: 'all var(--t)', position: 'relative', whiteSpace: 'nowrap',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
        background: isActive ? 'var(--accent)' : 'rgba(0,0,0,0.05)',
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: isActive ? '0 3px 10px rgba(13,148,136,0.30)' : 'none',
        transition: 'all var(--t)',
      }}>
        {item.icon}
      </div>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px',
          borderRadius: 99,
          background: isActive ? 'var(--accent-dark)' : 'var(--red)',
          color: '#fff',
        }}>
          {item.badge}
        </span>
      )}
      {item.sub && (
        <span style={{
          marginLeft: 'auto', fontSize: 12, color: 'var(--text-xs)',
          transform: isActive ? 'rotate(90deg)' : 'none',
          transition: 'transform var(--t), color var(--t)',
          flexShrink: 0, lineHeight: 1,
        }}>›</span>
      )}
    </div>
  );
}

function SubItem({ page, label, isActive, onClick }: {
  page: PageKey; label: string; isActive: boolean; onClick: () => void;
}) {
  return (
    <div
      role="button" tabIndex={0}
      data-testid={`nav-sub-item-${page}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '7px 10px 7px 52px', borderRadius: 7, cursor: 'pointer',
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        fontSize: 13, fontWeight: isActive ? 600 : 500,
        background: isActive ? 'var(--accent-bg)' : 'transparent',
        transition: 'all var(--t)', position: 'relative',
        margin: '1px 2px', whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        position: 'absolute', left: 42, width: 4, height: 4,
        borderRadius: '50%', background: 'currentColor',
        opacity: isActive ? 1 : 0.4,
      }} />
      {label}
    </div>
  );
}

// 2단계 그룹 헤더 (자체 페이지 없이 토글만)
function SubGroup({ label, isOpen, isChildActive, onToggle }: {
  label: string; isOpen: boolean; isChildActive: boolean; onToggle: () => void;
}) {
  const active = isOpen || isChildActive;
  return (
    <div
      role="button" tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '7px 10px 7px 52px', borderRadius: 7, cursor: 'pointer',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        fontSize: 13, fontWeight: active ? 600 : 500,
        background: 'transparent',
        transition: 'all var(--t)', position: 'relative',
        margin: '1px 2px', whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        position: 'absolute', left: 42, width: 4, height: 4,
        borderRadius: '50%', background: 'currentColor',
        opacity: active ? 1 : 0.4,
      }} />
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{
        fontSize: 11, color: 'var(--text-xs)',
        transform: isOpen ? 'rotate(90deg)' : 'none',
        transition: 'transform var(--t)',
        flexShrink: 0, lineHeight: 1,
      }}>›</span>
    </div>
  );
}

// 3단계 아이템 (더 깊은 들여쓰기)
function SubSubItem({ page, label, isActive, onClick }: {
  page: PageKey; label: string; isActive: boolean; onClick: () => void;
}) {
  return (
    <div
      role="button" tabIndex={0}
      data-testid={`nav-subsub-item-${page}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '6px 10px 6px 70px', borderRadius: 7, cursor: 'pointer',
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        fontSize: 12.5, fontWeight: isActive ? 600 : 500,
        background: isActive ? 'var(--accent-bg)' : 'transparent',
        transition: 'all var(--t)', position: 'relative',
        margin: '1px 2px', whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        position: 'absolute', left: 60, width: 3, height: 3,
        borderRadius: '50%', background: 'currentColor',
        opacity: isActive ? 1 : 0.35,
      }} />
      {label}
    </div>
  );
}

export function Sidebar() {
  const { currentPage, roomsSubOpen, suppliesSubOpen, facilitiesSubOpen, dataRegSubOpen, navigateTo, toggleRooms, toggleSupplies, toggleFacilities, toggleDataReg } = useNavStore();

  const [occupancy, setOccupancy] = useState<{ rate: string; occupied: number; total: number } | null>(null);

  useEffect(() => {
    const baseUrl = '/api/supabase/rest/v1';
    const headers = { 'Content-Type': 'application/json' };
    Promise.all([
      fetch(`${baseUrl}/room_master?category_code=eq.1000&seq=eq.1&select=room_no&order=room_no`, { headers }).then(r => r.json()),
      fetch(`${baseUrl}/room_assignment?select=year,half_year,room_no&order=year,half_year,room_no`, { headers }).then(r => r.json()),
    ]).then(([masters, assignments]: [{ room_no: string }[], { year: number; half_year: string; room_no: string }[]]) => {
      let latestYear = 0, latestHalf = '';
      for (const a of assignments) {
        if (a.year > latestYear || (a.year === latestYear && a.half_year > latestHalf)) {
          latestYear = a.year; latestHalf = a.half_year;
        }
      }
      const cur = latestYear > 0
        ? assignments.filter(a => a.year === latestYear && a.half_year === latestHalf)
        : assignments;
      const occupiedSet = new Set(cur.map(a => a.room_no));
      const total = masters.length;
      const occupied = masters.filter((m: { room_no: string }) => occupiedSet.has(m.room_no)).length;
      setOccupancy({ total, occupied, rate: total > 0 ? (occupied / total * 100).toFixed(1) + '%' : '0%' });
    }).catch(() => {});
  }, []);

  const renderItems = (items: NavItemDef[]) =>
    items.map((item) => {
      // parentActive: 직계 자식 또는 손자 중에 currentPage가 있으면 활성
      const allDescendants = item.sub?.flatMap(s =>
        s.sub ? [s.page, ...s.sub.map(ss => ss.page)] : [s.page]
      ) ?? [];
      const parentActive = allDescendants.includes(currentPage) || currentPage === item.page;
      const isTopOpen = (roomsSubOpen && item.page === 'rooms') || (suppliesSubOpen && item.page === 'supplies') || (facilitiesSubOpen && item.page === 'facilities');

      return (
        <div key={item.page}>
          <NavItemRow item={item} isActive={!!parentActive} onClick={() => {
            if (item.page === 'rooms') {
              const wasOpen = roomsSubOpen;
              navigateTo(item.page);
              if (wasOpen) toggleRooms();
              return;
            }
            if (item.page === 'supplies') {
              const wasOpen = suppliesSubOpen;
              navigateTo(item.page);
              if (wasOpen) toggleSupplies();
              return;
            }
            if (item.page === 'facilities') {
              const wasOpen = facilitiesSubOpen;
              navigateTo(item.page);
              if (wasOpen) toggleFacilities();
              return;
            }
            navigateTo(item.page);
          }} />
          {item.sub && (
            <div style={{
              display: 'grid',
              gridTemplateRows: isTopOpen ? '1fr' : '0fr',
              transition: 'grid-template-rows 0.25s ease',
            }}>
              <div style={{ minHeight: 0, overflow: 'hidden' }}>
                {item.sub.map((sub) => {
                  // 그룹 헤더 (sub-sub 있는 경우)
                  if (sub.sub) {
                    const isGroupChildActive = sub.sub.some(ss => ss.page === currentPage);
                    const isGroupOpen = dataRegSubOpen;
                    return (
                      <div key={sub.page}>
                        <SubGroup
                          label={sub.label}
                          isOpen={isGroupOpen}
                          isChildActive={isGroupChildActive}
                          onToggle={toggleDataReg}
                        />
                        <div style={{
                          display: 'grid',
                          gridTemplateRows: isGroupOpen ? '1fr' : '0fr',
                          transition: 'grid-template-rows 0.25s ease',
                        }}>
                          <div style={{ minHeight: 0, overflow: 'hidden' }}>
                            {sub.sub.map(ss => (
                              <SubSubItem
                                key={ss.page}
                                page={ss.page}
                                label={ss.label}
                                isActive={currentPage === ss.page}
                                onClick={() => navigateTo(ss.page)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  // 일반 서브 아이템
                  return (
                    <SubItem
                      key={sub.page}
                      page={sub.page}
                      label={sub.label}
                      isActive={currentPage === sub.page}
                      onClick={() => navigateTo(sub.page)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    });

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      background: 'var(--sidebar-bg)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 'var(--header-h)', left: 0, bottom: 0,
      zIndex: 100, overflow: 'hidden',
      borderRight: '1px solid var(--border)',
      transition: 'background var(--t), border-color var(--t)',
    }}>
      <nav style={{
        flex: 1, padding: '14px 12px',
        display: 'flex', flexDirection: 'column', gap: 2,
        overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin',
      }}>
        <SectionLabel>메인</SectionLabel>
        {renderItems(NAV_ITEMS)}

        <SectionLabel>관리</SectionLabel>
        {renderItems(MANAGE_ITEMS)}

        <SectionLabel>시스템</SectionLabel>
        {renderItems(SYSTEM_ITEMS)}
      </nav>

      {/* 사이드바 하단 위젯 */}
      <div style={{
        margin: '0 12px 14px', padding: '15px 16px', borderRadius: 12,
        background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
        color: '#fff', flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
          오늘 현황
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>객실 가동율 {occupancy?.rate ?? '…'}</div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 99, marginBottom: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: occupancy?.rate ?? '0%', background: 'rgba(255,255,255,0.85)', borderRadius: 99, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ fontSize: 11, opacity: 0.72 }}>{occupancy ? `${occupancy.total}개 객실 중 ${occupancy.occupied}개 사용 중` : '로딩 중…'}</div>
      </div>
    </aside>
  );
}
