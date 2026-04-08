import pool from '@/lib/db';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { rowCount } = await pool.query(
      'UPDATE escalations SET resolved_at = NOW() WHERE escalation_id = $1',
      [id]
    );

    if (rowCount === 0) {
      return Response.json({ error: 'Escalation not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
