import type { ActivationPayload } from '@/types/shirley';

export async function POST(request: Request) {
  const secretKey = process.env.SHIRLEY_TRIGGER_SECRET_KEY;
  if (!secretKey) {
    return Response.json(
      { error: 'SHIRLEY_TRIGGER_SECRET_KEY is not set' },
      { status: 500 }
    );
  }

  let body: ActivationPayload;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.propertyAddress || !body.homeowner?.name || !body.homeowner?.phone) {
    return Response.json(
      { error: 'propertyAddress, homeowner name, and homeowner phone are required' },
      { status: 400 }
    );
  }

  if (!body.trades || body.trades.length === 0) {
    return Response.json({ error: 'At least one trade is required' }, { status: 400 });
  }

  for (const trade of body.trades) {
    if (!trade.subcontractor?.name || !trade.subcontractor?.phone) {
      return Response.json(
        { error: `Trade "${trade.tradeType}" is missing subcontractor name or phone` },
        { status: 400 }
      );
    }
  }

  const res = await fetch(
    'https://api.trigger.dev/api/v1/tasks/shirley-activate-job/trigger',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({ payload: body }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `Failed to activate job: ${text}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  // Trigger.dev returns the run details — extract jobId from the run's output
  // The task itself returns { jobId, tradeIds, schedulingStarted }
  return Response.json({ success: true, runId: data.id, ...data });
}
