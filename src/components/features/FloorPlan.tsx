'use client';

import { useState } from 'react';
import type { FloorKey } from '@/types';
import { Floor1SVG } from './Floor1SVG';
import { Floor2SVG } from './Floor2SVG';
import { Floor3SVG } from './Floor3SVG';

const TABS: { key: FloorKey; label: string }[] = [
  { key: '1', label: '1층 — 강의실' },
  { key: '2', label: '2층 — 숙소' },
  { key: '3', label: '3층 — 숙소' },
];

const LEGEND_ITEMS = [
  { color: 'rgba(16,185,129,0.55)',  label: '강의실' },
  { color: 'rgba(59,130,246,0.55)',  label: '2인실' },
  { color: 'rgba(13,148,136,0.55)',  label: '5인실' },
  { color: 'rgba(14,165,233,0.55)',  label: '화장실·샤워' },
  { color: 'rgba(245,158,11,0.55)',  label: '장애인실' },
  { color: 'rgba(139,92,246,0.55)',  label: '당직·운영진' },
];

export function FloorPlan() {
  const [activeFloor, setActiveFloor] = useState<FloorKey>('1');

  return (
    <div>
      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            data-testid={`fp-tab-${tab.key}`}
            onClick={() => setActiveFloor(tab.key)}
            style={{
              padding: '7px 22px',
              borderRadius: 'var(--r)',
              border: '1px solid var(--border)',
              background: activeFloor === tab.key ? 'var(--accent)' : 'var(--surface)',
              color: activeFloor === tab.key ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all var(--t)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted)' }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: item.color,
              }}
            />
            {item.label}
          </div>
        ))}
      </div>

      {/* SVG 배치도 */}
      <div
        style={{
          overflowX: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          padding: 16,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ width: '100%', minWidth: 560, maxWidth: 860, margin: '0 auto', aspectRatio: '760 / 320', overflow: 'hidden' }}>
          {activeFloor === '1' && <Floor1SVG />}
          {activeFloor === '2' && <Floor2SVG />}
          {activeFloor === '3' && <Floor3SVG />}
        </div>
      </div>
    </div>
  );
}
