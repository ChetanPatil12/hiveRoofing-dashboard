import pool from '@/lib/db';
import type { Job, Trade, JobStatus } from '@/types/shirley';

function computeJobStatus(
  trades: Trade[],
  hasUnresolvedEscalation: boolean
): JobStatus {
  if (hasUnresolvedEscalation) return 'needs_attention';
  if (trades.length === 0) return 'on_track';
  const isScheduling = trades.some((t) => t.status === 'scheduling' || t.status === 'not_started');
  if (isScheduling) return 'scheduling';
  return 'on_track';
}

export async function GET() {
  try {
    const { rows: jobs } = await pool.query<Job>(`
      SELECT * FROM jobs ORDER BY updated_at DESC
    `);

    if (jobs.length === 0) {
      return Response.json({ jobs: [] });
    }

    const jobIds = jobs.map((j) => j.job_id);

    const [tradesResult, escalationsResult, messagesResult] = await Promise.all([
      pool.query<Trade & { sub_name: string; sub_phone: string; sub_language: string }>(`
        SELECT t.*, s.name AS sub_name, s.phone AS sub_phone, s.language AS sub_language
        FROM trades t
        LEFT JOIN subcontractors s ON s.sub_id = t.assigned_sub_id
        WHERE t.job_id = ANY($1)
      `, [jobIds]),
      pool.query<{ job_id: string }>(`
        SELECT DISTINCT job_id FROM escalations
        WHERE job_id = ANY($1) AND resolved_at IS NULL
      `, [jobIds]),
      pool.query<{ job_id: string; last_message_at: string }>(`
        SELECT job_id, MAX(timestamp) AS last_message_at
        FROM messages
        WHERE job_id = ANY($1)
        GROUP BY job_id
      `, [jobIds]),
    ]);

    const tradesByJob = new Map<string, Trade[]>();
    for (const trade of tradesResult.rows) {
      const list = tradesByJob.get(trade.job_id) ?? [];
      list.push(trade);
      tradesByJob.set(trade.job_id, list);
    }

    const escalatedJobIds = new Set(escalationsResult.rows.map((r) => r.job_id));
    const lastMessageByJob = new Map(messagesResult.rows.map((r) => [r.job_id, r.last_message_at]));

    const enriched = jobs.map((job) => {
      const trades = tradesByJob.get(job.job_id) ?? [];
      const hasUnresolved = escalatedJobIds.has(job.job_id);
      return {
        ...job,
        trades,
        last_message_at: lastMessageByJob.get(job.job_id) ?? null,
        computed_status: computeJobStatus(trades, hasUnresolved),
        has_unresolved_escalation: hasUnresolved,
      };
    });

    return Response.json({ jobs: enriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
