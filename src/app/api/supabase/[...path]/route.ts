import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
});

const TABLE_WHITELIST = new Set([
  'room_master', 'room_assignment', 'category_price', 'building_codes',
  'laundry_target', 'laundry_settlement', 'users', 'repair_history', 'repair_list',
]);

// Primary key columns per table — used for ON CONFLICT upsert
const TABLE_PK_COLS: Record<string, string[]> = {
  room_assignment:    ['year', 'half_year', 'room_no', 'chasu', 'seq'],
  room_master:        ['room_no', 'category_code', 'seq'],
  building_codes:     ['code_type', 'code_value'],
  laundry_target:     ['year', 'half_year', 'chasu', 'room_no'],
  laundry_settlement: ['year', 'half_year', 'chasu'],
  users:              ['email'],
};

function quoteId(name: string) {
  return '"' + name.replace(/"/g, '""') + '"';
}

function validIdentifier(name: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function parseFilter(key: string, rawValue: string, paramIndex: number) {
  const [opAndPrefix, value] = rawValue.includes('.') ? rawValue.split('.', 2) : ['eq', rawValue];
  const column = validIdentifier(key) ? quoteId(key) : null;
  if (!column) throw new Error(`Invalid filter column: ${key}`);

  switch (opAndPrefix) {
    case 'eq': return { clause: `${column} = $${paramIndex}`, values: [value] };
    case 'neq': return { clause: `${column} <> $${paramIndex}`, values: [value] };
    case 'gt': return { clause: `${column} > $${paramIndex}`, values: [value] };
    case 'gte': return { clause: `${column} >= $${paramIndex}`, values: [value] };
    case 'lt': return { clause: `${column} < $${paramIndex}`, values: [value] };
    case 'lte': return { clause: `${column} <= $${paramIndex}`, values: [value] };
    case 'like': return { clause: `${column} LIKE $${paramIndex}`, values: [value] };
    case 'ilike': return { clause: `${column} ILIKE $${paramIndex}`, values: [value] };
    case 'is':
      if (value === 'null') return { clause: `${column} IS NULL`, values: [] };
      if (value === 'not.null') return { clause: `${column} IS NOT NULL`, values: [] };
      throw new Error(`Unsupported is operator value: ${value}`);
    case 'in': {
      const list = value.startsWith('(') && value.endsWith(')')
        ? value.slice(1, -1).split(',').map((v) => v.trim())
        : [value];
      return { clause: `${column} = ANY($${paramIndex})`, values: [list] };
    }
    default:
      return { clause: `${column} = $${paramIndex}`, values: [rawValue] };
  }
}

function parseSelect(select: string | null) {
  if (!select || select === '*' || select.trim() === '') return '*';
  return select.split(',').map((name) => validIdentifier(name.trim()) ? quoteId(name.trim()) : null)
    .filter(Boolean)
    .join(', ');
}

function parseOrder(order: string | null) {
  if (!order) return '';
  return order.split(',').map((name) => {
    const trimmed = name.trim();
    const match = /^([A-Za-z_][A-Za-z0-9_]*)(\.(asc|desc))?$/i.exec(trimmed);
    if (!match) return null;
    const column = quoteId(match[1]);
    const dir = match[3] ? match[3].toUpperCase() : '';
    return dir ? `${column} ${dir}` : column;
  }).filter(Boolean).join(', ');
}

function buildWhere(searchParams: URLSearchParams, paramOffset = 0) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of searchParams.entries()) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
    const { clause, values: clauseValues } = parseFilter(key, value, paramOffset + values.length + 1);
    clauses.push(clause);
    values.push(...clauseValues);
  }

  return { clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values };
}

async function executeQuery(text: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { path = [] } = await params;
  if (path.length !== 3 || path[0] !== 'rest' || path[1] !== 'v1') {
    return NextResponse.json({ error: 'Unsupported path' }, { status: 400 });
  }

  const table = path[2];
  if (!TABLE_WHITELIST.has(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const select = parseSelect(url.searchParams.get('select'));
    const order = parseOrder(url.searchParams.get('order'));
    const { clause, values } = buildWhere(url.searchParams);

    const sql = [
      `SELECT ${select} FROM public.${quoteId(table)}`,
      clause,
      order ? `ORDER BY ${order}` : '',
      url.searchParams.has('limit') ? `LIMIT ${Number(url.searchParams.get('limit'))}` : '',
      url.searchParams.has('offset') ? `OFFSET ${Number(url.searchParams.get('offset'))}` : '',
    ].filter(Boolean).join(' ');

    const rows = await executeQuery(sql, values);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Supabase proxy GET error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { path = [] } = await params;
  if (path.length !== 3 || path[0] !== 'rest' || path[1] !== 'v1') {
    return NextResponse.json({ error: 'Unsupported path' }, { status: 400 });
  }

  const table = path[2];
  if (!TABLE_WHITELIST.has(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const rows = Array.isArray(payload) ? payload : [payload];
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows to insert' }, { status: 400 });
  }

  const keys = Object.keys(rows[0]);
  if (keys.length === 0) {
    return NextResponse.json({ error: 'No columns provided' }, { status: 400 });
  }
  if (!keys.every(validIdentifier)) {
    return NextResponse.json({ error: 'Invalid column name' }, { status: 400 });
  }

  const columns = keys.map(quoteId).join(', ');
  const values: unknown[] = [];
  const paramSets = rows.map((row, rowIndex) => {
    return `(${keys.map((key, colIndex) => {
      values.push((row as Record<string, unknown>)[key]);
      return `$${rowIndex * keys.length + colIndex + 1}`;
    }).join(', ')})`;
  }).join(', ');

  const prefer = request.headers.get('Prefer') ?? '';
  const wantUpsert = prefer.includes('resolution=merge-duplicates');
  const pkCols = TABLE_PK_COLS[table];

  let sql: string;
  if (wantUpsert && pkCols) {
    const pkSet = new Set(pkCols);
    const nonPkKeys = keys.filter((k) => !pkSet.has(k));
    const conflictCols = pkCols.map(quoteId).join(', ');
    if (nonPkKeys.length === 0) {
      sql = `INSERT INTO public.${quoteId(table)} (${columns}) VALUES ${paramSets} ON CONFLICT (${conflictCols}) DO NOTHING`;
    } else {
      const updateClauses = nonPkKeys.map((k) => `${quoteId(k)} = EXCLUDED.${quoteId(k)}`).join(', ');
      sql = `INSERT INTO public.${quoteId(table)} (${columns}) VALUES ${paramSets} ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateClauses}`;
    }
  } else {
    sql = `INSERT INTO public.${quoteId(table)} (${columns}) VALUES ${paramSets}`;
  }

  try {
    await executeQuery(sql, values);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supabase proxy POST error:', error);
    const msg = error instanceof Error ? error.message : 'Insert failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { path = [] } = await params;
  if (path.length !== 3 || path[0] !== 'rest' || path[1] !== 'v1') {
    return NextResponse.json({ error: 'Unsupported path' }, { status: 400 });
  }

  const table = path[2];
  if (!TABLE_WHITELIST.has(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });
  }

  const updates = await request.json().catch(() => null);
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
  }

  const keys = Object.keys(updates).filter(validIdentifier);
  if (keys.length === 0) {
    return NextResponse.json({ error: 'No update columns provided' }, { status: 400 });
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  for (const [idx, key] of keys.entries()) {
    setClauses.push(`${quoteId(key)} = $${idx + 1}`);
    values.push((updates as Record<string, unknown>)[key]);
  }

  try {
    const url = new URL(request.url);
    const { clause, values: whereValues } = buildWhere(url.searchParams, values.length);
    if (!clause) {
      return NextResponse.json({ error: 'Update without filter is not allowed' }, { status: 400 });
    }

    const sql = `UPDATE public.${quoteId(table)} SET ${setClauses.join(', ')} ${clause}`;
    await executeQuery(sql, [...values, ...whereValues]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supabase proxy PATCH error:', error);
    const msg = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { path = [] } = await params;
  if (path.length !== 3 || path[0] !== 'rest' || path[1] !== 'v1') {
    return NextResponse.json({ error: 'Unsupported path' }, { status: 400 });
  }

  const table = path[2];
  if (!TABLE_WHITELIST.has(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const { clause, values } = buildWhere(url.searchParams);
    if (!clause) {
      return NextResponse.json({ error: 'Delete without filter is not allowed' }, { status: 400 });
    }
    const sql = `DELETE FROM public.${quoteId(table)} ${clause}`;
    await executeQuery(sql, values);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supabase proxy DELETE error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
