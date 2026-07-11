// Word document report generation using the docx library.
// Called client-side only (imports canvas-based chart functions).

import {
  AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx';

import {
  CAT_COLORS, CAT_LABELS,
  drawHBarChart, drawRateCard, drawRingChart, drawStatCard, drawVBarChart,
} from './reportCharts';

// ── 타입 ─────────────────────────────────────────────────────────────────────

export interface RoomReportData {
  year: number;
  half_year: string;
  chasu: string;
  // 총 객실수
  totalRooms: number;
  roomFloors: { floor: string; count: number }[];
  // 객실 가동율
  occupancyRate: string;
  occupancyOccupied: number;
  occupancyTotal: number;
  occupancyFloors: { floor: string; occupied: number; total: number; rate: string }[];
  // 총 입실인원수
  totalGuests: number;
  guestFloors: { floor: string; count: number }[];
  // 입실율
  checkInRate: string;
  checkInOccupied: number;
  checkInTotal: number;
  checkInFloors: { floor: string; occupied: number; total: number; rate: string }[];
}

export interface LaundryReportData {
  catCounts: number[];  // [cover, pillow, duvet, funnel]
  catAmounts: number[]; // [cover, pillow, duvet, funnel] in won
  totalCount: number;
  totalAmount: number;
}

export interface SettlementRow {
  chasu: string;
  room_no: string;
  cover_count: number;
  pillow_count: number;
  duvet_count: number;
  funnel_count: number;
  amount: number;
}

// ── 이미지 크기 (px → docx 변환, 96 DPI 기준: 1px = 9525 EMU) ───────────────
// 4열 카드: 본문 7.5인치 / 4열 ≈ 1.8인치 = 175px
// 2열 차트: 본문 7.5인치 / 2열 ≈ 3.4인치 = 330px

const IMG_W4 = 175;
const h4 = (canvasH: number, canvasW = 400) => Math.round(IMG_W4 * canvasH / canvasW);
const IMG_W2 = 330;
const h2 = (canvasH: number, canvasW = 400) => Math.round(IMG_W2 * canvasH / canvasW);

// ── 테두리 헬퍼 ──────────────────────────────────────────────────────────────

const NO_BORDER  = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const;
const THIN       = { style: BorderStyle.SINGLE, size: 1, color: '000000' } as const;
// ITableBordersOptions: insideHorizontal / insideVertical
const NONE_TABLE = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER };
const THIN_TABLE = { top: THIN, bottom: THIN, left: THIN, right: THIN, insideHorizontal: THIN, insideVertical: THIN };
// ITableCellBorders: no inside properties
const NONE_CELL  = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const THIN_CELL  = { top: THIN, bottom: THIN, left: THIN, right: THIN };

// ── 문단 헬퍼 ────────────────────────────────────────────────────────────────

function heading(text: string, color = '0d9488', size = 20) {
  return new Paragraph({
    spacing: { before: 60, after: 40 },
    children: [new TextRun({ text, bold: true, size, color })],
  });
}

function imgPara(data: Uint8Array, width: number, height: number) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [new ImageRun({ type: 'png', data, transformation: { width, height } })],
  });
}

// 2열 이미지 그리드 테이블 (각 행은 [imgData, pixelWidth, pixelHeight] 쌍의 배열)
function imgGrid(rows: Array<[Uint8Array, number, number][]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NONE_TABLE,
    rows: rows.map(cols =>
      new TableRow({
        children: cols.map(([data, w, hh]) =>
          new TableCell({
            width: { size: Math.floor(100 / cols.length), type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            borders: NONE_CELL,
            children: [imgPara(data, w, hh)],
          }),
        ),
      }),
    ),
  });
}

// ── 정산 데이터 테이블 ────────────────────────────────────────────────────────

function makeSettlementTable(rows: SettlementRow[], year: number, half_year: string): Table {
  const fmt = (n: number) => n.toLocaleString('ko-KR');
  const cellText = (text: string, bold = false, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER) =>
    new TableCell({
      borders: THIN_CELL,
      children: [
        new Paragraph({
          alignment: align,
          spacing: { before: 40, after: 40 },
          children: [new TextRun({ text, bold, size: 20 })],
        }),
      ],
    });

  const headerCells = ['차수', '객실', '커버', '배개', '이불', '발판', '금액(원)'].map(t =>
    new TableCell({
      borders: THIN_CELL,
      shading: { fill: '4472C4', type: ShadingType.CLEAR },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 40 },
          children: [new TextRun({ text: t, bold: true, size: 20, color: 'FFFFFF' })],
        }),
      ],
    }),
  );

  const dataRows = rows.map(r =>
    new TableRow({
      children: [
        cellText(r.chasu),
        cellText(r.room_no),
        cellText(String(r.cover_count)),
        cellText(String(r.pillow_count)),
        cellText(String(r.duvet_count)),
        cellText(String(r.funnel_count)),
        cellText(fmt(r.amount), false, AlignmentType.RIGHT),
      ],
    }),
  );

  const totals = rows.reduce(
    (acc, r) => ({
      cover: acc.cover + r.cover_count,
      pillow: acc.pillow + r.pillow_count,
      duvet: acc.duvet + r.duvet_count,
      funnel: acc.funnel + r.funnel_count,
      amount: acc.amount + r.amount,
    }),
    { cover: 0, pillow: 0, duvet: 0, funnel: 0, amount: 0 },
  );

  const totalCells = ['합계', '', String(totals.cover), String(totals.pillow), String(totals.duvet), String(totals.funnel), fmt(totals.amount)].map((t, i) =>
    new TableCell({
      borders: THIN_CELL,
      shading: { fill: '4472C4', type: ShadingType.CLEAR },
      children: [
        new Paragraph({
          alignment: i === 6 ? AlignmentType.RIGHT : AlignmentType.CENTER,
          spacing: { before: 40, after: 40 },
          children: [new TextRun({ text: t, bold: true, size: 20, color: 'FFFFFF' })],
        }),
      ],
    }),
  );

  // Title row spanning all 7 columns
  const titleText = `${year}년 ${half_year} 세탁대상 목록`;
  const titleRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 7,
        borders: THIN_CELL,
        shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [new TextRun({ text: titleText, bold: true, size: 24, color: '1e40af' })],
          }),
        ],
      }),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: THIN_TABLE,
    rows: [
      titleRow,
      new TableRow({ children: headerCells }),
      ...dataRows,
      new TableRow({ children: totalCells }),
    ],
  });
}

// ── 메인 보고서 생성 ─────────────────────────────────────────────────────────

export async function generateWordReport(
  room: RoomReportData,
  laundry: LaundryReportData,
  settlement: SettlementRow[],
): Promise<void> {
  // ── 차트 이미지 병렬 생성 ──
  const [
    imgTotalRooms,
    imgOccupancyCard,   // 컴팩트 비율 카드 (4열 상단 행)
    imgOccupancy,       // 전체 도넛 차트  (2열 하단 행)
    imgTotalGuests,
    imgCheckInCard,     // 컴팩트 비율 카드 (4열 상단 행)
    imgCheckIn,         // 전체 수평 막대  (2열 하단 행)
    imgCatCount,
    imgCatAmount,
  ] = await Promise.all([
    drawStatCard(
      '총 객실수', `${room.totalRooms}개`, '#0d9488',
      room.roomFloors.map(f => ({ floor: f.floor, count: f.count, unit: '개' })),
    ),
    drawRateCard(
      '객실 가동율', room.occupancyRate,
      room.occupancyFloors, '#0d9488',
    ),
    drawRingChart(
      room.occupancyRate, room.occupancyOccupied, room.occupancyTotal,
      room.occupancyFloors, '#0d9488',
    ),
    drawStatCard(
      '총 입실인원수', `${room.totalGuests}명`, '#3b82f6',
      room.guestFloors.map(f => ({ floor: f.floor, count: f.count, unit: '명' })),
    ),
    drawRateCard(
      '입실율', room.checkInRate,
      room.checkInFloors, '#f97316',
    ),
    drawHBarChart(
      room.checkInRate, room.checkInOccupied, room.checkInTotal,
      room.checkInFloors, '#f97316',
    ),
    drawVBarChart(
      '항목별 건수',
      `${room.year}년 ${room.half_year} · ${room.chasu}차수`,
      CAT_LABELS.map((l, i) => ({ label: l, value: laundry.catCounts[i] ?? 0, color: CAT_COLORS[i] })),
      laundry.totalCount,
      '건',
    ),
    drawVBarChart(
      '항목별 금액',
      `${room.year}년 ${room.half_year} · ${room.chasu}차수`,
      CAT_LABELS.map((l, i) => ({ label: l, value: laundry.catAmounts[i] ?? 0, color: CAT_COLORS[i] })),
      laundry.totalAmount,
      '원',
    ),
  ]);

  // ── 섹션별 레이아웃 ──
  // 1a) 객실관리 상단: 4열 컴팩트 카드 (총 객실수 | 가동율 | 총 입실인원수 | 입실율)
  const roomCardGrid = imgGrid([
    [
      [imgTotalRooms,    IMG_W4, h4(130)],
      [imgOccupancyCard, IMG_W4, h4(130)],
      [imgTotalGuests,   IMG_W4, h4(130)],
      [imgCheckInCard,   IMG_W4, h4(130)],
    ],
  ]);

  // 1b) 객실관리 하단: 2열 상세 차트 (도넛 가동율 | 수평막대 입실율)
  const roomChartGrid = imgGrid([
    [[imgOccupancy, IMG_W2, h2(290)], [imgCheckIn, IMG_W2, h2(270)]],
  ]);

  // 2) 세탁관리: 2열 수직 막대 (항목별 건수 | 항목별 금액)
  const laundryGrid = imgGrid([
    [[imgCatCount, IMG_W2, h2(300)], [imgCatAmount, IMG_W2, h2(300)]],
  ]);

  // 3) 세탁비 정산 테이블
  const settTable = makeSettlementTable(settlement, room.year, room.half_year);

  // ── 문서 조립 ──
  const periodLabel = `${room.year}년 ${room.half_year} ${room.chasu}차수`;

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: '과학 캠프관 관리 보고서', bold: true, size: 36, color: '111827' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: periodLabel, size: 22, color: '6b7280' }),
            new TextRun({ text: '   출력일: ' + new Date().toLocaleDateString('ko-KR'), size: 18, color: '9ca3af' }),
          ],
        }),
        heading('객실관리', '0d9488', 24),
        roomCardGrid,
        roomChartGrid,
        heading('세탁관리-항목별', '3b82f6', 24),
        laundryGrid,
        heading('세탁비 정산 내역', '1d4ed8', 24),
        settTable,
      ],
    }],
  });

  // ── 브라우저 다운로드 ──
  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `캠프관_보고서_${room.year}_${room.half_year}_${room.chasu}차수.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
