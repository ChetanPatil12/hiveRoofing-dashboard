import pool from '@/lib/db';
import type { Message } from '@/types/shirley';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const { rows: messages } = await pool.query<Message>(
      'SELECT * FROM messages WHERE job_id = $1 ORDER BY timestamp ASC',
      [jobId]
    );

    return Response.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
