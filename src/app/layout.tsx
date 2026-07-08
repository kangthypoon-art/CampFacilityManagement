import type { Metadata } from 'next';
import './globals.css';
import { ThemeInitializer } from '@/components/layout/ThemeInitializer';

export const metadata: Metadata = {
  title: '캠프관 관리 시스템',
  description: '과학캠프관 시설 관리 대시보드',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
