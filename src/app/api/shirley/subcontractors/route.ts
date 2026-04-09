import pool from '@/lib/db';
import type { Subcontractor } from '@/types/shirley';

export async function POST(request: Request) {
  try {
    const { name, phone, language, tradesHandled } = await request.json();
    if (!name?.trim() || !phone?.trim()) {
      return Response.json({ error: 'name and phone are required' }, { status: 400 });
    }
    const trades = (tradesHandled ?? '')
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    const { rows } = await pool.query(
      `INSERT INTO subcontractors (name, phone, language, trades_handled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone) DO UPDATE
         SET name = EXCLUDED.name,
             language = EXCLUDED.language,
             trades_handled = EXCLUDED.trades_handled
       RETURNING sub_id`,
      [name.trim(), phone.trim(), language ?? 'en', trades]
    );
    return Response.json({ sub_id: rows[0].sub_id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';

  try {
    const { rows } = await pool.query<Subcontractor>(
      `SELECT sub_id, name, phone, language, trades_handled, active_status, created_at
       FROM subcontractors
       WHERE active_status = true
         AND ($1 = '' OR name ILIKE $2)
       ORDER BY name ASC
       LIMIT 20`,
      [q, `%${q}%`]
    );

    return Response.json({ subcontractors: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
