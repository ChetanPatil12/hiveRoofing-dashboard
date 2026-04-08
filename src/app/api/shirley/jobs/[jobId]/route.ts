import pool from '@/lib/db';
import type { Job, Trade, Appointment } from '@/types/shirley';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const { rows: jobs } = await pool.query<Job>(
      'SELECT * FROM jobs WHERE job_id = $1',
      [jobId]
    );

    if (jobs.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const [tradesResult, appointmentsResult] = await Promise.all([
      pool.query<Trade & { sub_name: string; sub_phone: string; sub_language: string }>(`
        SELECT t.*, s.name AS sub_name, s.phone AS sub_phone, s.language AS sub_language
        FROM trades t
        LEFT JOIN subcontractors s ON s.sub_id = t.assigned_sub_id
        WHERE t.job_id = $1
        ORDER BY t.created_at ASC
      `, [jobId]),
      pool.query<Appointment>(
        'SELECT * FROM appointments WHERE job_id = $1 ORDER BY created_at ASC',
        [jobId]
      ),
    ]);

    return Response.json({
      job: {
        ...jobs[0],
        trades: tradesResult.rows,
        appointments: appointmentsResult.rows,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
