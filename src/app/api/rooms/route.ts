import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});

interface AssignmentPayload {
  year?: number;
  half_year?: string;
  room_no?: string;
  chasu?: string;
  seq?: number;
  name?: string | null;
  school?: string | null;
  grade?: number | null;
  gender?: string | null;
  check_in_ymd?: string | null;
  check_out_ymd?: string | null;
}

function normalizeAssignmentPayload(payload: AssignmentPayload) {
  return {
    year: Number(payload.year),
    half_year: String(payload.half_year ?? '').trim(),
    room_no: String(payload.room_no ?? '').trim(),
    chasu: String(payload.chasu ?? '').trim(),
    seq: Number(payload.seq),
    name: payload.name ?? null,
    school: payload.school ?? null,
    grade: payload.grade != null ? Number(payload.grade) : null,
    gender: payload.gender ?? null,
    check_in_ymd: payload.check_in_ymd ?? null,
    check_out_ymd: payload.check_out_ymd ?? null,
  };
}

export async function GET() {
  const client = await pool.connect();
  try {
    const [masters1Res, mastersAllRes, assignmentsRes] = await Promise.all([
      client.query(
        `SELECT room_no, seq, category_code, guest_count
         FROM public.room_master
         WHERE category_code = $1
         ORDER BY room_no`,
        ['1000']
      ),
      client.query(
        `SELECT room_no, seq
         FROM public.room_master
         WHERE category_code = $1
         ORDER BY room_no, seq`,
        ['1000']
      ),
      client.query(
        `SELECT year, half_year, room_no, chasu, seq, name, school, grade, gender, check_in_ymd, check_out_ymd
         FROM public.room_assignment
         ORDER BY year, half_year, room_no, chasu, seq`
      ),
    ]);

    return NextResponse.json({
      masters1: masters1Res.rows,
      mastersAll: mastersAllRes.rows,
      assignments: assignmentsRes.rows,
    });
  } catch (error) {
    console.error('rooms api get error:', error);
    return NextResponse.json({ error: 'room fetch failed' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    const client = await pool.connect();

    try {
      if (action === 'insert') {
        const row = normalizeAssignmentPayload(body?.row ?? {});
        if (!row.year || !row.half_year || !row.room_no || !row.chasu || row.seq == null) {
          return NextResponse.json({ success: false, error: 'invalid payload' }, { status: 400 });
        }
        await client.query(
          `INSERT INTO public.room_assignment (year, half_year, room_no, chasu, seq, name, school, grade, gender, check_in_ymd, check_out_ymd)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [row.year, row.half_year, row.room_no, row.chasu, row.seq, row.name, row.school, row.grade, row.gender, row.check_in_ymd, row.check_out_ymd]
        );
        return NextResponse.json({ success: true });
      }

      if (action === 'patch') {
        const pk = body?.pk ?? {};
        const updates = body?.updates ?? {};
        const row = normalizeAssignmentPayload({ ...pk, ...updates });
        await client.query(
          `UPDATE public.room_assignment
           SET name = $1, school = $2, grade = $3, gender = $4, check_in_ymd = $5, check_out_ymd = $6
           WHERE year = $7 AND half_year = $8 AND room_no = $9 AND chasu = $10 AND seq = $11`,
          [row.name, row.school, row.grade, row.gender, row.check_in_ymd, row.check_out_ymd, row.year, row.half_year, row.room_no, row.chasu, row.seq]
        );
        return NextResponse.json({ success: true });
      }

      if (action === 'delete') {
        const row = normalizeAssignmentPayload(body?.row ?? {});
        await client.query(
          `DELETE FROM public.room_assignment
           WHERE year = $1 AND half_year = $2 AND room_no = $3 AND chasu = $4 AND seq = $5`,
          [row.year, row.half_year, row.room_no, row.chasu, row.seq]
        );
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ success: false, error: 'unsupported action' }, { status: 400 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('rooms api post error:', error);
    return NextResponse.json({ success: false, error: 'room mutation failed' }, { status: 500 });
  }
}
