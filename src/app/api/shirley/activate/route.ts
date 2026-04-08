import type { ActivationPayload } from '@/types/shirley';

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_ACTIVATE_JOB_WEBHOOK;
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl) {
    return Response.json(
      { error: 'N8N_ACTIVATE_JOB_WEBHOOK is not set' },
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

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `Failed to activate job: ${text}` },
      { status: res.status }
    );
  }

  const data = await res.json().catch(() => ({}));
  return Response.json({ success: true, ...data });
}
