import pool from '@/lib/db';
import type { Subcontractor } from '@/types/shirley';

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
