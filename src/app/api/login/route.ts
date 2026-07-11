import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';

interface LoginPayload {
  email?: string;
  password?: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function verifyPassword(inputPassword: string, storedHash?: string | null): boolean {
  if (!storedHash || !inputPassword) return false;
  const hashed = createHash('sha256').update(inputPassword.trim()).digest('hex');
  return storedHash.trim().toLowerCase() === hashed;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as LoginPayload;
    const email = body.email?.trim() ?? '';
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json({ success: false, reason: 'invalid' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json({ success: false, reason: 'invalid' }, { status: 500 });
    }

    const client = new Client({ connectionString });
    try {
      await client.connect();
      const result = await client.query(
        'SELECT email, user_name, user_role, is_active, password_hash FROM public.users WHERE lower(email) = lower($1) LIMIT 1',
        [normalizedEmail]
      );

      const user = result.rows[0] as {
        email?: string;
        user_name?: string;
        user_role?: string;
        is_active?: string | boolean;
        password_hash?: string | null;
      } | undefined;

      if (!user?.email) {
        return NextResponse.json({ success: false, reason: 'invalid' });
      }

      if (user.is_active === 'N' || user.is_active === false) {
        return NextResponse.json({ success: false, reason: 'inactive' });
      }

      if (!verifyPassword(password, user.password_hash)) {
        return NextResponse.json({ success: false, reason: 'invalid' });
      }

      return NextResponse.json({
        success: true,
        email: user.email,
        user_name: user.user_name ?? user.email.split('@')[0],
        user_role: user.user_role ?? 'USER',
      });
    } finally {
      await client.end().catch(() => undefined);
    }
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ success: false, reason: 'invalid' }, { status: 500 });
  }
}
