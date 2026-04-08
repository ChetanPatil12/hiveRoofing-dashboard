import pool from '@/lib/db';
import type { Escalation } from '@/types/shirley';

export async function GET() {
  try {
    const { rows } = await pool.query<Escalation>(`
      SELECT e.*, j.property_address, j.homeowner_name
      FROM escalations e
      LEFT JOIN jobs j ON j.job_id = e.job_id
      WHERE e.resolved_at IS NULL
      ORDER BY e.created_at DESC
    `);

    return Response.json({ escalations: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
