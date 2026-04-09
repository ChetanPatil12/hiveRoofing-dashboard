import pool from '@/lib/db';
import type { Message } from '@/types/shirley';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const { searchParams } = new URL(_request.url);
  const phone = searchParams.get('phone'); // filter to messages involving this phone number

  try {
    let rows: Message[];

    if (phone) {
      // Messages sent to or received from this specific phone number
      const result = await pool.query<Message>(
        `SELECT * FROM messages
         WHERE job_id = $1
           AND (sender_phone = $2 OR recipient_phone = $2)
         ORDER BY timestamp ASC`,
        [jobId, phone]
      );
      rows = result.rows;
    } else {
      const result = await pool.query<Message>(
        'SELECT * FROM messages WHERE job_id = $1 ORDER BY timestamp ASC',
        [jobId]
      );
      rows = result.rows;
    }

    return Response.json({ messages: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
