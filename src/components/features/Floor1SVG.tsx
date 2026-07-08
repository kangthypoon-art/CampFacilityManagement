export function Floor1SVG() {
  return (
    <svg viewBox="0 0 780 400" width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      {/* 건물 외곽 */}
      <rect x="0" y="0" width="780" height="400" className="fp-r-wall" rx="3"/>

      {/* ── 상단 강의실 구역 (y=0-145) ── */}

      {/* 계단(좌상단) */}
      <rect x="0" y="0" width="48" height="145" className="fp-r-stairs"/>
      <line x1="0" y1="48"  x2="48" y2="48"  stroke="var(--border)" strokeWidth="1" opacity="0.5"/>
      <line x1="0" y1="96"  x2="48" y2="96"  stroke="var(--border)" strokeWidth="1" opacity="0.5"/>
      <text x="24" y="72" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">계단</text>

      {/* 제4강의실 */}
      <rect x="48" y="0" width="288" height="145" className="fp-r-lecture"/>
      <text x="192" y="60" textAnchor="middle" dominantBaseline="central" className="fp-lbl-tt">제4강의실</text>
      <text x="192" y="82" textAnchor="middle" dominantBaseline="central" className="fp-lbl-cd">(실험대)</text>

      {/* 제3강의실 */}
      <rect x="336" y="0" width="289" height="145" className="fp-r-lecture"/>
      <text x="480" y="60" textAnchor="middle" dominantBaseline="central" className="fp-lbl-tt">제3강의실</text>
      <text x="480" y="82" textAnchor="middle" dominantBaseline="central" className="fp-lbl-cd">(실험대)</text>

      {/* ── 수평 복도H (x=0-625, y=145-175) ── */}
      <rect x="0" y="145" width="625" height="30" className="fp-r-corridor"/>
      <text x="245" y="160" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">복  도</text>

      {/* ── 수직 복도V (x=625-670) ── */}
      <rect x="625" y="0" width="45" height="400" className="fp-r-corridor"/>
      <text x="647" y="200" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" transform="rotate(-90,647,200)">복  도</text>

      {/* ── 우측 강의실 (x=670-780) ── */}
      {/* 제2강의실 */}
      <rect x="670" y="0" width="110" height="200" className="fp-r-lecture"/>
      <text x="725" y="88" textAnchor="middle" dominantBaseline="central" className="fp-lbl">제2강의실</text>
      <text x="725" y="108" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">(30석)</text>

      {/* 제1강의실 */}
      <rect x="670" y="200" width="110" height="200" className="fp-r-lecture"/>
      <text x="725" y="288" textAnchor="middle" dominantBaseline="central" className="fp-lbl">제1강의실</text>
      <text x="725" y="308" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">(30석)</text>

      {/* ── 하단 구역 (y=175-400) ── */}

      {/* 입구/로비 */}
      <rect x="0" y="175" width="495" height="225" className="fp-r-lobby"/>
      <text x="247" y="272" textAnchor="middle" dominantBaseline="central" className="fp-lbl-tt">입구 / 로비</text>
      <text x="247" y="298" textAnchor="middle" dominantBaseline="central" className="fp-lbl-cd">(학부모 대기실)</text>

      {/* 여자화장실 */}
      <rect x="495" y="175" width="130" height="78" className="fp-r-shower-w"/>
      <text x="560" y="214" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">여자화장실</text>

      {/* 남자화장실 */}
      <rect x="495" y="253" width="130" height="60" className="fp-r-shower-m"/>
      <text x="560" y="283" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">남자화장실</text>

      {/* 입구 */}
      <rect x="495" y="313" width="130" height="27" className="fp-r-corridor"/>
      <text x="533" y="326" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">입구</text>

      {/* 운영사무실 */}
      <rect x="495" y="340" width="82" height="60" className="fp-r-office"/>
      <text x="536" y="368" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">운영사무실</text>

      {/* 승강기 */}
      <rect x="577" y="340" width="27" height="60" className="fp-r-elev"/>
      <text x="590" y="362" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">승</text>
      <text x="590" y="376" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">강기</text>

      {/* 계단(우하) */}
      <rect x="604" y="340" width="21" height="60" className="fp-r-stairs"/>
      <line x1="604" y1="340" x2="625" y2="400" className="fp-stair-x"/>
      <line x1="625" y1="340" x2="604" y2="400" className="fp-stair-x"/>
      <text x="614" y="370" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">계단</text>
    </svg>
  );
}
