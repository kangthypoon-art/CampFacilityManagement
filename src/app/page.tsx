'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/components/features/Dashboard';

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem('sci_session') || sessionStorage.getItem('sci_session');
    if (!s) router.replace('/login');
    else setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <Sidebar />
      <div style={{ marginLeft: 'var(--sidebar-w)', paddingTop: 'var(--header-h)', flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Dashboard />
      </div>
    </div>
  );
}
