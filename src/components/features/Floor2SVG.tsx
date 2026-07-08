interface FloorSVGProps {
  occupiedRooms?: string[];
  roomCounts?: Record<string, number>;
  singleDot?: boolean;
  personDot?: boolean;
}

export function Floor2SVG({ occupiedRooms = [], roomCounts, singleDot, personDot }: FloorSVGProps) {
  const occ = new Set(occupiedRooms);
  const dot = (room: string, idx = 0) => {
    if (roomCounts) return idx < (roomCounts[room] ?? 0) ? '#3b82f6' : '#9ca3af';
    return occ.has(room) ? '#3b82f6' : '#9ca3af';
  };

  const D = ({ cx, cy, room, idx }: { cx: number; cy: number; room: string; idx: number }) => {
    if (singleDot && idx > 0) return null;
    const c = dot(room, idx);
    if (personDot) return (
      <>
        <circle cx={cx} cy={cy - 2} r={2} fill={c}/>
        <ellipse cx={cx} cy={cy + 2.5} rx={2.5} ry={2} fill={c}/>
      </>
    );
    return <circle cx={cx} cy={cy} r={4} fill={c}/>;
  };

  return (
    <svg viewBox="0 0 760 320" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="760" height="320" className="fp-r-wall" rx="3"/>

      {/* 계단(좌) */}
      <rect x="0" y="0" width="52" height="100" className="fp-r-stairs"/>
      <line x1="0" y1="0" x2="52" y2="100" className="fp-stair-x"/>
      <line x1="52" y1="0" x2="0" y2="100" className="fp-stair-x"/>
      <text x="26" y="50" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">계단</text>

      {/* 208호 */}
      <rect x="52" y="0" width="98" height="100" className="fp-r-2p"/>
      <text x="101" y="44" textAnchor="middle" dominantBaseline="central" className="fp-lbl">208호</text>
      <text x="101" y="62" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">2인/침대</text>
      <D cx={59} cy={9} room="208" idx={0}/><D cx={70} cy={9} room="208" idx={1}/>

      {/* 207호 */}
      <rect x="150" y="0" width="98" height="100" className="fp-r-2p"/>
      <text x="199" y="44" textAnchor="middle" dominantBaseline="central" className="fp-lbl">207호</text>
      <text x="199" y="62" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">2인/침대</text>
      <D cx={157} cy={9} room="207" idx={0}/><D cx={168} cy={9} room="207" idx={1}/>

      {/* 206호 */}
      <rect x="248" y="0" width="98" height="100" className="fp-r-2p"/>
      <text x="297" y="44" textAnchor="middle" dominantBaseline="central" className="fp-lbl">206호</text>
      <text x="297" y="62" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">2인/침대</text>
      <D cx={255} cy={9} room="206" idx={0}/><D cx={266} cy={9} room="206" idx={1}/>

      {/* 205호 */}
      <rect x="346" y="0" width="98" height="100" className="fp-r-2p"/>
      <text x="395" y="44" textAnchor="middle" dominantBaseline="central" className="fp-lbl">205호</text>
      <text x="395" y="62" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">2인/침대</text>
      <D cx={353} cy={9} room="205" idx={0}/><D cx={364} cy={9} room="205" idx={1}/>

      {/* 남자공용샤워장 */}
      <rect x="444" y="0" width="88" height="100" className="fp-r-shower-m"/>
      <text x="488" y="40" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">남자공용</text>
      <text x="488" y="58" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">샤워장</text>

      {/* 여자공용샤워장 */}
      <rect x="532" y="0" width="88" height="100" className="fp-r-shower-w"/>
      <text x="576" y="40" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">여자공용</text>
      <text x="576" y="58" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">샤워장</text>

      <rect x="620" y="0" width="20" height="100" className="fp-r-corridor" stroke="none"/>

      {/* 204호 */}
      <rect x="640" y="0" width="120" height="80" className="fp-r-5p"/>
      <text x="700" y="34" textAnchor="middle" dominantBaseline="central" className="fp-lbl">204호</text>
      <text x="700" y="52" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">5인/침대</text>
      <D cx={647} cy={9} room="204" idx={0}/>
      <D cx={658} cy={9} room="204" idx={1}/>
      <D cx={669} cy={9} room="204" idx={2}/>
      <D cx={680} cy={9} room="204" idx={3}/>
      <D cx={691} cy={9} room="204" idx={4}/>

      {/* 복도 */}
      <rect x="0" y="100" width="640" height="130" className="fp-r-corridor" stroke="none"/>
      <text x="250" y="143" textAnchor="middle" dominantBaseline="central" className="fp-lbl-tt">복  도</text>
      <text x="250" y="166" textAnchor="middle" dominantBaseline="central" className="fp-lbl-cd">과학캠프관 2층</text>

      <rect x="480" y="140" width="80" height="28" className="fp-r-toilet"/>
      <text x="520" y="154" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">화장실</text>
      <rect x="480" y="168" width="80" height="28" className="fp-r-toilet"/>
      <text x="520" y="182" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">화장실</text>

      {/* 203호 */}
      <rect x="640" y="80" width="120" height="80" className="fp-r-5p"/>
      <text x="700" y="114" textAnchor="middle" dominantBaseline="central" className="fp-lbl">203호</text>
      <text x="700" y="132" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">5인/침대</text>
      <D cx={647} cy={89} room="203" idx={0}/>
      <D cx={658} cy={89} room="203" idx={1}/>
      <D cx={669} cy={89} room="203" idx={2}/>
      <D cx={680} cy={89} room="203" idx={3}/>
      <D cx={691} cy={89} room="203" idx={4}/>

      {/* 209호 (이불창고) */}
      <rect x="0" y="230" width="116" height="90" className="fp-r-storage"/>
      <text x="58" y="267" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">209호</text>
      <text x="58" y="283" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">이불창고</text>

      {/* 210호 */}
      <rect x="116" y="230" width="116" height="90" className="fp-r-2p"/>
      <text x="174" y="267" textAnchor="middle" dominantBaseline="central" className="fp-lbl">210호</text>
      <text x="174" y="283" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">2인/침대</text>
      <D cx={123} cy={239} room="210" idx={0}/><D cx={134} cy={239} room="210" idx={1}/>

      {/* 211호 */}
      <rect x="232" y="230" width="116" height="90" className="fp-r-2p"/>
      <text x="290" y="267" textAnchor="middle" dominantBaseline="central" className="fp-lbl">211호</text>
      <text x="290" y="283" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">2인/침대</text>
      <D cx={239} cy={239} room="211" idx={0}/><D cx={250} cy={239} room="211" idx={1}/>

      {/* 212호 */}
      <rect x="348" y="230" width="116" height="90" className="fp-r-disabled"/>
      <text x="406" y="261" textAnchor="middle" dominantBaseline="central" className="fp-lbl">212호</text>
      <text x="406" y="275" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">장애인</text>
      <text x="406" y="289" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">침대 2</text>
      <D cx={355} cy={239} room="212" idx={0}/><D cx={366} cy={239} room="212" idx={1}/>

      {/* 213호 */}
      <rect x="464" y="230" width="116" height="90" className="fp-r-duty"/>
      <text x="522" y="261" textAnchor="middle" dominantBaseline="central" className="fp-lbl">213호</text>
      <text x="522" y="275" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">당직실</text>
      <text x="522" y="289" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">침대 1</text>
      <D cx={471} cy={239} room="213" idx={0}/>

      {/* 계단(우) */}
      <rect x="580" y="230" width="60" height="90" className="fp-r-stairs"/>
      <line x1="580" y1="230" x2="640" y2="320" className="fp-stair-x"/>
      <line x1="640" y1="230" x2="580" y2="320" className="fp-stair-x"/>
      <text x="610" y="275" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">계단</text>

      {/* 202호 */}
      <rect x="640" y="160" width="120" height="80" className="fp-r-5p"/>
      <text x="700" y="194" textAnchor="middle" dominantBaseline="central" className="fp-lbl">202호</text>
      <text x="700" y="212" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">5인/침대</text>
      <D cx={647} cy={169} room="202" idx={0}/>
      <D cx={658} cy={169} room="202" idx={1}/>
      <D cx={669} cy={169} room="202" idx={2}/>
      <D cx={680} cy={169} room="202" idx={3}/>
      <D cx={691} cy={169} room="202" idx={4}/>

      {/* 201호 */}
      <rect x="640" y="240" width="120" height="80" className="fp-r-5p"/>
      <text x="700" y="274" textAnchor="middle" dominantBaseline="central" className="fp-lbl">201호</text>
      <text x="700" y="292" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">5인/침대</text>
      <D cx={647} cy={249} room="201" idx={0}/>
      <D cx={658} cy={249} room="201" idx={1}/>
      <D cx={669} cy={249} room="201" idx={2}/>
      <D cx={680} cy={249} room="201" idx={3}/>
      <D cx={691} cy={249} room="201" idx={4}/>
    </svg>
  );
}
