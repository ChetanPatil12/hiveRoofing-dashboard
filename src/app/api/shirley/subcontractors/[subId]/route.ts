import pool from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subId: string }> }
) {
  const { subId } = await params;
  try {
    const { name, phone, language, tradesHandled } = await request.json();
    if (!name?.trim() || !phone?.trim()) {
      return Response.json({ error: 'name and phone are required' }, { status: 400 });
    }
    const trades = (tradesHandled ?? '')
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    const { rowCount } = await pool.query(
      `UPDATE subcontractors
       SET name = $1, phone = $2, language = $3, trades_handled = $4
       WHERE sub_id = $5`,
      [name.trim(), phone.trim(), language ?? 'en', trades, subId]
    );
    if (rowCount === 0) {
      return Response.json({ error: 'Subcontractor not found' }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ subId: string }> }
) {
  const { subId } = await params;
  try {
    // Soft delete — set active_status = false so historical job data still resolves
    const { rowCount } = await pool.query(
      `UPDATE subcontractors SET active_status = false WHERE sub_id = $1`,
      [subId]
    );
    if (rowCount === 0) {
      return Response.json({ error: 'Subcontractor not found' }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
