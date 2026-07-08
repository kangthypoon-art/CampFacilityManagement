import { FloorPlan } from './FloorPlan';

export function PageFloorPlan() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4, color: 'var(--text)' }}>
            층별 배치도
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>과학캠프관 강의실·숙소 배치도 (1~3층)</p>
        </div>
      </div>
      <FloorPlan />
    </div>
  );
}
