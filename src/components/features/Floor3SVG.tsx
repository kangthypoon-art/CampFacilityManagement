interface FloorSVGProps {
  occupiedRooms?: string[];
  roomCounts?: Record<string, number>;
  singleDot?: boolean;
  personDot?: boolean;
  onRoomClick?: (roomNo: string) => void;
  onRoomHover?: (roomNo: string | null) => void;
  hoveredRoom?: string | null;
  selectedRoom?: string | null;
  highlightedRooms?: Set<string>;
}

interface RRProps {
  x: number; y: number; w: number; h: number;
  cls: string; room: string;
  onRoomClick?: (r: string) => void;
  onRoomHover?: (r: string | null) => void;
  hoveredRoom?: string | null;
  selectedRoom?: string | null;
  highlightedRooms?: Set<string>;
}

function RoomRect({ x, y, w, h, cls, room, onRoomClick, onRoomHover, hoveredRoom, selectedRoom, highlightedRooms }: RRProps) {
  const isHovered = hoveredRoom === room;
  const isSelected = selectedRoom === room;
  const isHighlighted = highlightedRooms?.has(room) ?? false;
  return (
    <g
      onClick={() => onRoomClick?.(room)}
      onMouseEnter={() => onRoomHover?.(room)}
      onMouseLeave={() => onRoomHover?.(null)}
      style={{ cursor: onRoomClick ? 'pointer' : 'default' }}
    >
      <rect x={x} y={y} width={w} height={h} className={cls} />
      {isHighlighted && <rect x={x} y={y} width={w} height={h} fill="#f59e0b" fillOpacity={0.45} pointerEvents="none" />}
      {isHovered && !isSelected && <rect x={x} y={y} width={w} height={h} fill="white" fillOpacity={0.28} pointerEvents="none" />}
      {isSelected && <rect x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} fill="#0d9488" fillOpacity={0.22} stroke="#0d9488" strokeWidth={3} pointerEvents="none" />}
    </g>
  );
}

export function Floor3SVG({ occupiedRooms = [], roomCounts, singleDot, personDot, onRoomClick, onRoomHover, hoveredRoom, selectedRoom, highlightedRooms }: FloorSVGProps) {
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

  const rr = (x: number, y: number, w: number, h: number, cls: string, room: string) => (
    <RoomRect x={x} y={y} w={w} h={h} cls={cls} room={room}
      onRoomClick={onRoomClick} onRoomHover={onRoomHover}
      hoveredRoom={hoveredRoom} selectedRoom={selectedRoom} highlightedRooms={highlightedRooms} />
  );

  return (
    <svg viewBox="0 0 760 320" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="760" height="320" className="fp-r-wall" rx="3"/>

      {/* 계단(좌) */}
      <rect x="0" y="0" width="52" height="100" className="fp-r-stairs"/>
      <line x1="0" y1="0" x2="52" y2="100" className="fp-stair-x"/>
      <line x1="52" y1="0" x2="0" y2="100" className="fp-stair-x"/>
      <text x="26" y="50" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">계단</text>

      {/* 308호 */}
      {rr(52, 0, 98, 100, 'fp-r-2p', '308')}
      <text x="101" y="44" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>308호</text>
      <text x="101" y="62" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>2인/침대</text>
      <D cx={59} cy={9} room="308" idx={0}/><D cx={70} cy={9} room="308" idx={1}/>

      {/* 307호 */}
      {rr(150, 0, 98, 100, 'fp-r-2p', '307')}
      <text x="199" y="44" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>307호</text>
      <text x="199" y="62" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>2인/침대</text>
      <D cx={157} cy={9} room="307" idx={0}/><D cx={168} cy={9} room="307" idx={1}/>

      {/* 306호 */}
      {rr(248, 0, 98, 100, 'fp-r-2p', '306')}
      <text x="297" y="44" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>306호</text>
      <text x="297" y="62" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>2인/침대</text>
      <D cx={255} cy={9} room="306" idx={0}/><D cx={266} cy={9} room="306" idx={1}/>

      {/* 305호 */}
      {rr(346, 0, 98, 100, 'fp-r-2p', '305')}
      <text x="395" y="44" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>305호</text>
      <text x="395" y="62" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>2인/침대</text>
      <D cx={353} cy={9} room="305" idx={0}/><D cx={364} cy={9} room="305" idx={1}/>

      {/* 남자공용샤워장 */}
      <rect x="444" y="0" width="88" height="100" className="fp-r-shower-m"/>
      <text x="488" y="40" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">남자공용</text>
      <text x="488" y="58" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">샤워장</text>

      {/* 여자공용샤워장 */}
      <rect x="532" y="0" width="88" height="100" className="fp-r-shower-w"/>
      <text x="576" y="40" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">여자공용</text>
      <text x="576" y="58" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">샤워장</text>

      <rect x="620" y="0" width="20" height="100" className="fp-r-corridor" stroke="none"/>

      {/* 304호 */}
      {rr(640, 0, 120, 80, 'fp-r-5p', '304')}
      <text x="700" y="34" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>304호</text>
      <text x="700" y="52" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>5인/침대</text>
      <D cx={647} cy={9} room="304" idx={0}/>
      <D cx={658} cy={9} room="304" idx={1}/>
      <D cx={669} cy={9} room="304" idx={2}/>
      <D cx={680} cy={9} room="304" idx={3}/>
      <D cx={691} cy={9} room="304" idx={4}/>

      {/* 복도 */}
      <rect x="0" y="100" width="640" height="130" className="fp-r-corridor" stroke="none"/>
      <text x="250" y="143" textAnchor="middle" dominantBaseline="central" className="fp-lbl-tt">복  도</text>
      <text x="250" y="166" textAnchor="middle" dominantBaseline="central" className="fp-lbl-cd">과학캠프관 3층</text>

      <rect x="480" y="140" width="80" height="28" className="fp-r-toilet"/>
      <text x="520" y="154" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">화장실</text>
      <rect x="480" y="168" width="80" height="28" className="fp-r-toilet"/>
      <text x="520" y="182" textAnchor="middle" dominantBaseline="central" className="fp-lbl-sm">화장실</text>

      {/* 303호 */}
      {rr(640, 80, 120, 80, 'fp-r-5p', '303')}
      <text x="700" y="114" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>303호</text>
      <text x="700" y="132" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>5인/침대</text>
      <D cx={647} cy={89} room="303" idx={0}/>
      <D cx={658} cy={89} room="303" idx={1}/>
      <D cx={669} cy={89} room="303" idx={2}/>
      <D cx={680} cy={89} room="303" idx={3}/>
      <D cx={691} cy={89} room="303" idx={4}/>

      {/* 309호 */}
      {rr(0, 230, 116, 90, 'fp-r-2p', '309')}
      <text x="58" y="267" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>309호</text>
      <text x="58" y="283" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>2인/침대</text>
      <D cx={6} cy={239} room="309" idx={0}/><D cx={17} cy={239} room="309" idx={1}/>

      {/* 310호 */}
      {rr(116, 230, 116, 90, 'fp-r-2p', '310')}
      <text x="174" y="267" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>310호</text>
      <text x="174" y="283" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>2인/침대</text>
      <D cx={123} cy={239} room="310" idx={0}/><D cx={134} cy={239} room="310" idx={1}/>

      {/* 311호 */}
      {rr(232, 230, 116, 90, 'fp-r-2p', '311')}
      <text x="290" y="267" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>311호</text>
      <text x="290" y="283" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>2인/침대</text>
      <D cx={239} cy={239} room="311" idx={0}/><D cx={250} cy={239} room="311" idx={1}/>

      {/* 312호 */}
      {rr(348, 230, 116, 90, 'fp-r-2p', '312')}
      <text x="406" y="267" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>312호</text>
      <text x="406" y="283" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>2인/침대</text>
      <D cx={355} cy={239} room="312" idx={0}/><D cx={366} cy={239} room="312" idx={1}/>

      {/* 313호 */}
      {rr(464, 230, 116, 90, 'fp-r-duty', '313')}
      <text x="522" y="261" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>313호</text>
      <text x="522" y="275" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>운영진</text>
      <text x="522" y="289" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>침대 1</text>
      <D cx={471} cy={239} room="313" idx={0}/>

      {/* 계단(우) */}
      <rect x="580" y="230" width="60" height="90" className="fp-r-stairs"/>
      <line x1="580" y1="230" x2="640" y2="320" className="fp-stair-x"/>
      <line x1="640" y1="230" x2="580" y2="320" className="fp-stair-x"/>
      <text x="610" y="275" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs">계단</text>

      {/* 302호 */}
      {rr(640, 160, 120, 80, 'fp-r-5p', '302')}
      <text x="700" y="194" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>302호</text>
      <text x="700" y="212" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>5인/침대</text>
      <D cx={647} cy={169} room="302" idx={0}/>
      <D cx={658} cy={169} room="302" idx={1}/>
      <D cx={669} cy={169} room="302" idx={2}/>
      <D cx={680} cy={169} room="302" idx={3}/>
      <D cx={691} cy={169} room="302" idx={4}/>

      {/* 301호 */}
      {rr(640, 240, 120, 80, 'fp-r-5p', '301')}
      <text x="700" y="274" textAnchor="middle" dominantBaseline="central" className="fp-lbl" style={{ pointerEvents: 'none' }}>301호</text>
      <text x="700" y="292" textAnchor="middle" dominantBaseline="central" className="fp-lbl-xs" style={{ pointerEvents: 'none' }}>5인/침대</text>
      <D cx={647} cy={249} room="301" idx={0}/>
      <D cx={658} cy={249} room="301" idx={1}/>
      <D cx={669} cy={249} room="301" idx={2}/>
      <D cx={680} cy={249} room="301" idx={3}/>
      <D cx={691} cy={249} room="301" idx={4}/>
    </svg>
  );
}
