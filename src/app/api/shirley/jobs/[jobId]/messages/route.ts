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
      // Normalize both sides to digits-only for comparison so that
      // "+17205551234" matches "(720) 555-1234" stored in either column.
      // Normalize both sides to 10-digit before comparing — handles +1 prefix mismatch.
      const result = await pool.query<Message>(
        `SELECT * FROM messages
         WHERE job_id = $1
           AND (
             regexp_replace(regexp_replace(sender_phone, '[^0-9]', '', 'g'), '^1([0-9]{10})$', '\\1') = regexp_replace(regexp_replace($2, '[^0-9]', '', 'g'), '^1([0-9]{10})$', '\\1')
             OR regexp_replace(regexp_replace(recipient_phone, '[^0-9]', '', 'g'), '^1([0-9]{10})$', '\\1') = regexp_replace(regexp_replace($2, '[^0-9]', '', 'g'), '^1([0-9]{10})$', '\\1')
           )
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
