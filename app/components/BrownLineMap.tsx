'use client';

export type Train = {
  rn: string;
  destNm: string;
  trDr: string;
  nextStaId: string;
  nextStaNm: string;
  isApp: string;
  isDly: string;
  lat: string;
  lon: string;
};

export type Incident = {
  id: string;
  runNumber: string;
  carNumber: string;
  type: string;
  summary: string;
  timestamp: number;
};

// Full Brown Line route in riding order.
// After Merch. Mart the train enters the Loop and goes COUNTER-CLOCKWISE:
//   down Wells St (west side) → east on Van Buren (south side)
//   → north on Wabash (east side) → west on Lake St (north side)
//   → exits at Clark/Lake back to Merch. Mart.
export const STATIONS = [
  // ── Straight section: Kimball → Merch. Mart (indices 0–16) ─────────────
  { id: '41290', name: 'Kimball' },
  { id: '40870', name: 'Francisco' },
  { id: '41010', name: 'Rockwell' },
  { id: '41480', name: 'Western' },
  { id: '40090', name: 'Damen' },
  { id: '41500', name: 'Montrose' },
  { id: '41460', name: 'Irving Park' },
  { id: '41440', name: 'Addison' },
  { id: '41310', name: 'Paulina' },
  { id: '40360', name: 'Southport' },
  { id: '41320', name: 'Belmont' },
  { id: '41210', name: 'Wellington' },
  { id: '40530', name: 'Diversey' },
  { id: '40660', name: 'Armitage' },
  { id: '40800', name: 'Sedgwick' },
  { id: '40710', name: 'Chicago' },
  { id: '40460', name: 'Merch. Mart' },

  // ── Loop circuit: counter-clockwise (indices 17–24) ─────────────────────
  // West side going south (Wells St):
  { id: '41700', name: 'Washington/Wells' },
  { id: '40040', name: 'Quincy' },
  // South side going east (Van Buren St):
  { id: '40160', name: 'LaSalle/Van Buren' },
  { id: '40850', name: 'Harold Washington Library' },
  // East side going north (Wabash Ave):
  { id: '40680', name: 'Adams/Wabash' },
  { id: '41400', name: 'Washington/Wabash' },
  // North side going west (Lake St):
  { id: '40260', name: 'State/Lake' },   // ← temporarily closed until 2029
  { id: '40380', name: 'Clark/Lake' },   // ← last Loop stop; exits back to Merch. Mart
] as const;

// Transfer stations (larger dots)
const TRANSFER_IDS = new Set([
  '41320', '40460', '41700', '40040', '40160', '40850',
  '40680', '41400', '40260', '40380', '40710',
]);

// ── Layout ────────────────────────────────────────────────────────────────
//
//  The Loop forms a square.  The main north-south line (x = LOOP_LEFT_X)
//  continues straight into the west side of the Loop.  Labels for the four
//  Loop sides sit outside the rectangle.
//
//            ↑ Kimball
//            │
//     [Merch. Mart]          ← on the main line (same x as west side)
//            │
//   NW ──────┼────── NE      ← LOOP_TOP_Y  (Lake St)
//   │  Clark/Lk  State/Lk │
//   │                       │
//  Wash/Wells           Wash/Wabash
//   │                       │
//  Quincy               Adams/Wab
//   │                       │
//   SW ─── LaSalle ─ HWLib ─ SE  ← LOOP_BOT_Y  (Van Buren St)
//

const SPACING      = 36;
const TOP_PAD      = 28;
const LOOP_LEFT_X  = 90;                        // Wells St / main line x
const LOOP_RIGHT_X = LOOP_LEFT_X + 3 * SPACING; // Wabash Ave x  (= 198)
const LOOP_MID_X   = (LOOP_LEFT_X + LOOP_RIGHT_X) / 2; // centre of loop (= 144)
const LOOP_TOP_Y   = TOP_PAD + 17 * SPACING;    // Lake St y
const LOOP_BOT_Y   = LOOP_TOP_Y + 3 * SPACING;  // Van Buren St y
const SVG_W        = 310;
const SVG_H        = LOOP_BOT_Y + TOP_PAD + 20; // a little extra below south labels
const TRAIN_R      = 14;
const HIT_R        = 22;
const SIDE         = 12;  // perpendicular offset for opposing trains on straight section

// ── Station XY positions ──────────────────────────────────────────────────
function getStXY(i: number): { x: number; y: number } {
  if (i <= 16) return { x: LOOP_LEFT_X, y: TOP_PAD + i * SPACING };
  switch (i) {
    // West side (Wells) – going south
    case 17: return { x: LOOP_LEFT_X,              y: LOOP_TOP_Y + 1 * SPACING };
    case 18: return { x: LOOP_LEFT_X,              y: LOOP_TOP_Y + 2 * SPACING };
    // South side (Van Buren) – going east
    case 19: return { x: LOOP_LEFT_X + 1 * SPACING, y: LOOP_BOT_Y };
    case 20: return { x: LOOP_LEFT_X + 2 * SPACING, y: LOOP_BOT_Y };
    // East side (Wabash) – going north
    case 21: return { x: LOOP_RIGHT_X, y: LOOP_TOP_Y + 2 * SPACING };
    case 22: return { x: LOOP_RIGHT_X, y: LOOP_TOP_Y + 1 * SPACING };
    // North side (Lake) – going west
    case 23: return { x: LOOP_LEFT_X + 2 * SPACING, y: LOOP_TOP_Y };
    case 24: return { x: LOOP_LEFT_X + 1 * SPACING, y: LOOP_TOP_Y };
    default: return { x: LOOP_LEFT_X, y: LOOP_TOP_Y };
  }
}

// ── Incident sentiment ────────────────────────────────────────────────────
const GOOD_TYPES = new Set(['Clean', 'Quiet', 'Safe', 'Empty', 'On Time', 'Working']);

function trainSentiment(incs: Incident[]): 'good' | 'bad' | 'neutral' {
  if (incs.length === 0) return 'neutral';
  let good = 0, bad = 0;
  for (const inc of incs) {
    if (GOOD_TYPES.has(inc.type)) good++; else bad++;
  }
  if (good > bad) return 'good';
  if (bad > good) return 'bad';
  return 'neutral';
}

// ── Train 2-D position ────────────────────────────────────────────────────
//
// Trains in the Loop always travel counter-clockwise (index increases).
// On the straight section, trDr=5 → Loop-bound (going south, index increases)
//                           trDr=1 → Kimball-bound (going north, index decreases)
//
function trainPos(train: Train): { cx: number; cy: number } | null {
  const idx = STATIONS.findIndex(s => s.id === train.nextStaId);
  if (idx === -1) return null;

  const inLoop      = idx > 16;
  const isLoopBound = train.trDr === '5';

  // "from" station: where the train came from
  let fromIdx: number;
  if (inLoop) {
    // Loop trains always go counter-clockwise → from the previous index
    fromIdx = idx > 17 ? idx - 1 : 16; // if entering loop, came from Merch. Mart
  } else if (isLoopBound) {
    fromIdx = Math.max(0, idx - 1);
  } else {
    // Kimball-bound: could be coming from a loop station (Clark/Lake) or the next straight station
    fromIdx = idx < 16 ? idx + 1 : 17; // if leaving loop to Merch. Mart, came from Clark/Lake (idx 24)
    // Use a simpler approximation: just use idx+1 capped at last station
    fromIdx = Math.min(STATIONS.length - 1, idx + 1);
  }

  const from = getStXY(fromIdx);
  const to   = getStXY(idx);
  const t    = train.isApp === '1' ? 0.85 : 0.5;

  const bx = from.x + (to.x - from.x) * t;
  const by = from.y + (to.y - from.y) * t;

  // Perpendicular offset only on the straight north-south section
  let dx = 0;
  if (!inLoop && fromIdx <= 16) {
    dx = isLoopBound ? -SIDE : SIDE;
  }

  return { cx: bx + dx, cy: by };
}

// ── Label helpers ─────────────────────────────────────────────────────────
const CLOSED_ID = '40260'; // State/Lake temporarily closed

function stationLabel(i: number): string {
  const n = STATIONS[i].name;
  // Shorten long names for Loop stations where space is tight
  const shorts: Record<string, string> = {
    'Washington/Wells':        'Wash/Wells',
    'LaSalle/Van Buren':       'LaSalle/VB',
    'Harold Washington Library': 'HW Library',
    'Washington/Wabash':       'Wash/Wabash',
    'State/Lake':              'State/Lake*', // * = closed
  };
  return shorts[n] ?? n;
}

type Props = {
  trains: Train[];
  incidents: Incident[];
  selectedRn: string | null;
  onSelectTrain: (rn: string) => void;
};

export default function BrownLineMap({ trains, incidents, selectedRn, onSelectTrain }: Props) {
  const incidentMap = incidents.reduce<Record<string, Incident[]>>((acc, inc) => {
    (acc[inc.runNumber] ??= []).push(inc);
    return acc;
  }, {});

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      className="overflow-visible select-none mx-auto block"
      style={{ fontFamily: 'ui-monospace, monospace', touchAction: 'pan-y' }}
    >

      {/* ── Loop square background ──────────────────────────────── */}
      <rect
        x={LOOP_LEFT_X} y={LOOP_TOP_Y}
        width={LOOP_RIGHT_X - LOOP_LEFT_X}
        height={LOOP_BOT_Y - LOOP_TOP_Y}
        fill="#6b3a1f" fillOpacity={0.07}
        stroke="none"
        rx={2}
      />

      {/* ── Loop street labels (outside corners) ─────────────────── */}
      <text x={LOOP_MID_X}   y={LOOP_TOP_Y - 14} textAnchor="middle" fontSize={8} fill="#52525b" letterSpacing="1">LAKE ST</text>
      <text x={LOOP_MID_X}   y={LOOP_BOT_Y + 28} textAnchor="middle" fontSize={8} fill="#52525b" letterSpacing="1">VAN BUREN ST</text>
      <text
        x={LOOP_LEFT_X - 6}
        y={(LOOP_TOP_Y + LOOP_BOT_Y) / 2}
        textAnchor="middle" fontSize={8} fill="#52525b" letterSpacing="1"
        transform={`rotate(-90, ${LOOP_LEFT_X - 6}, ${(LOOP_TOP_Y + LOOP_BOT_Y) / 2})`}
      >WELLS ST</text>
      <text
        x={LOOP_RIGHT_X + 6}
        y={(LOOP_TOP_Y + LOOP_BOT_Y) / 2}
        textAnchor="middle" fontSize={8} fill="#52525b" letterSpacing="1"
        transform={`rotate(90, ${LOOP_RIGHT_X + 6}, ${(LOOP_TOP_Y + LOOP_BOT_Y) / 2})`}
      >WABASH AVE</text>

      {/* ── Track lines ──────────────────────────────────────────── */}

      {/* Main line + west side of Loop (continuous vertical, Kimball → SW corner) */}
      <line
        x1={LOOP_LEFT_X} y1={TOP_PAD}
        x2={LOOP_LEFT_X} y2={LOOP_BOT_Y}
        stroke="#6b3a1f" strokeWidth={3}
      />

      {/* North side: NW corner → NE corner (Lake St) */}
      <line
        x1={LOOP_LEFT_X}  y1={LOOP_TOP_Y}
        x2={LOOP_RIGHT_X} y2={LOOP_TOP_Y}
        stroke="#6b3a1f" strokeWidth={3}
      />

      {/* East side: NE corner → SE corner (Wabash Ave) */}
      <line
        x1={LOOP_RIGHT_X} y1={LOOP_TOP_Y}
        x2={LOOP_RIGHT_X} y2={LOOP_BOT_Y}
        stroke="#6b3a1f" strokeWidth={3}
      />

      {/* South side: SW corner → SE corner (Van Buren St) */}
      <line
        x1={LOOP_LEFT_X}  y1={LOOP_BOT_Y}
        x2={LOOP_RIGHT_X} y2={LOOP_BOT_Y}
        stroke="#6b3a1f" strokeWidth={3}
      />

      {/* ── Direction hints ───────────────────────────────────────── */}
      <text x={LOOP_LEFT_X} y={TOP_PAD - 12} textAnchor="middle" fontSize={9} fill="#52525b">↑ Kimball</text>

      {/* counter-clockwise arrow inside loop */}
      <text
        x={LOOP_MID_X} y={(LOOP_TOP_Y + LOOP_BOT_Y) / 2}
        textAnchor="middle" fontSize={10} fill="#6b3a1f" fillOpacity={0.4}
      >↺</text>

      {/* ── Stations ─────────────────────────────────────────────── */}
      {STATIONS.map((st, i) => {
        const { x, y }  = getStXY(i);
        const isXfer    = TRANSFER_IDS.has(st.id);
        const isClosed  = st.id === CLOSED_ID;
        const label     = stationLabel(i);

        // Label placement depends on which side of the Loop we're on
        let lx: number, ly: number, anchor: 'start' | 'end' | 'middle';

        if (i <= 16) {
          // Straight section: label to the right of the main line
          lx = LOOP_LEFT_X + 28; ly = y + 4; anchor = 'start';
        } else if (i === 17 || i === 18) {
          // West side: label to the LEFT of the track
          lx = LOOP_LEFT_X - 8; ly = y + 4; anchor = 'end';
        } else if (i === 19 || i === 20) {
          // South side: label below the track, split around mid-x
          lx = i === 19 ? LOOP_MID_X - 2 : LOOP_MID_X + 2;
          ly = LOOP_BOT_Y + 16;
          anchor = i === 19 ? 'end' : 'start';
        } else if (i === 21 || i === 22) {
          // East side: label to the RIGHT of the track
          lx = LOOP_RIGHT_X + 8; ly = y + 4; anchor = 'start';
        } else {
          // North side (Clark/Lake, State/Lake): label above, split around mid-x
          lx = i === 24 ? LOOP_MID_X - 2 : LOOP_MID_X + 2;
          ly = LOOP_TOP_Y - 8;
          anchor = i === 24 ? 'end' : 'start';
        }

        return (
          <g key={st.id}>
            <circle
              cx={x} cy={y}
              r={isXfer ? 5 : 3.5}
              fill={isClosed ? '#52525b' : isXfer ? '#9f7155' : '#6b3a1f'}
              stroke={isXfer && !isClosed ? '#c4956b' : 'none'}
              strokeWidth={1.5}
            />
            <text
              x={lx} y={ly}
              fontSize={10}
              fill={isClosed ? '#52525b' : '#a1a1aa'}
              textAnchor={anchor}
              fontStyle={isClosed ? 'italic' : 'normal'}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* State/Lake closed footnote */}
      <text
        x={LOOP_RIGHT_X + 2} y={LOOP_TOP_Y - 8}
        fontSize={8} fill="#52525b" textAnchor="start"
      >* closed ~2029</text>

      {/* ── Trains ───────────────────────────────────────────────── */}
      {trains.map(train => {
        const pos = trainPos(train);
        if (!pos) return null;

        const trainIncs = incidentMap[train.rn] ?? [];
        const sentiment = trainSentiment(trainIncs);
        const isSel     = selectedRn === train.rn;
        const dotColor  = sentiment === 'good' ? '#22c55e'
                        : sentiment === 'bad'  ? '#ef4444'
                        : null;

        return (
          <g
            key={train.rn}
            transform={`translate(${pos.cx}, ${pos.cy})`}
            onClick={() => onSelectTrain(train.rn)}
            style={{ cursor: 'pointer', transition: 'transform 0.6s ease' }}
          >
            {isSel && (
              <circle cx={0} cy={0} r={TRAIN_R + 5}
                fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.6}
              />
            )}
            <circle cx={0} cy={0} r={HIT_R} fill="transparent" />
            <circle cx={0} cy={0} r={TRAIN_R} fill="#ffffff" stroke={isSel ? '#e4e4e7' : '#a78570'} strokeWidth={2} />
            <text x={0} y={4} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#6b3a1f">
              {train.rn}
            </text>
            {dotColor && (
              <circle cx={9} cy={-9} r={4.5}
                fill={dotColor} stroke="#1c1917" strokeWidth={1}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
