'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/stores/themeStore';
import { useNavStore, PAGE_NAMES } from '@/stores/navStore';

interface SessionInfo {
  email?: string;
  user_name?: string;
  user_role?: string;
}

export function Header() {
  const router = useRouter();
  const { isDark, toggle } = useThemeStore();
  const currentPage = useNavStore((s) => s.currentPage);
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('sci_session') || sessionStorage.getItem('sci_session');
    if (!stored) {
      setSession(null);
      return;
    }

    try {
      setSession(JSON.parse(stored));
    } catch {
      setSession(null);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('sci_session');
    sessionStorage.removeItem('sci_session');
    router.replace('/login');
  };

  return (
    <header
      style={{
        position: 'fixed',
        inset: '0 0 auto 0',
        height: 'var(--header-h)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        transition: 'background var(--t), border-color var(--t)',
      }}
    >
      {/* 로고 영역 */}
      <div
        style={{
          width: 'var(--sidebar-w)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 20px',
          borderRight: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
            boxShadow: '0 3px 10px rgba(13,148,136,0.30)',
          }}
        >
          ⚡
        </div>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.02em',
          }}
        >
          캠프관 관리 시스템
        </span>
      </div>

      {/* 우측 영역 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 12,
          minWidth: 0,
        }}
      >
        {/* 브레드크럼 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
          <span style={{ color: 'var(--text-xs)', fontSize: 14, flexShrink: 0 }}>›</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
            {PAGE_NAMES[currentPage]}
          </span>
        </div>

        {/* 액션 버튼들 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 검색 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 9,
              padding: '7px 14px',
              fontSize: 13,
              color: 'var(--text-muted)',
              cursor: 'text',
              width: 210,
            }}
          >
            <span>🔍</span>
            <span>검색...</span>
          </div>

          {/* 테마 토글 */}
          <button
            onClick={toggle}
            title="테마 전환"
            aria-label="테마 전환"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: 'var(--text-muted)',
              transition: 'all var(--t)',
            }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* 알림 */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: 'var(--text-muted)',
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            🔔
            <span
              style={{
                position: 'absolute',
                top: 7,
                right: 7,
                width: 7,
                height: 7,
                background: '#F97316',
                borderRadius: '50%',
                border: '2px solid var(--surface)',
              }}
            />
          </div>

          {/* 유저 정보 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 10px 5px 6px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              transition: 'all var(--t)',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
                boxShadow: '0 2px 7px rgba(13,148,136,0.28)',
              }}
            >
              {session?.user_name?.[0] ?? 'U'}
            </div>
            <div style={{ lineHeight: 1.25, minWidth: 0, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                {session?.user_name ?? '사용자'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {session?.user_role === 'ADMIN' ? '시스템 관리자' : '일반 사용자'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="로그아웃"
              aria-label="로그아웃"
              style={{
                marginLeft: 4,
                padding: '7px 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
