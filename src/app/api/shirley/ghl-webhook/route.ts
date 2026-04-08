// Receives inbound SMS webhooks from GoHighLevel and triggers the Shirley
// conversation engine on Trigger.dev.
//
// In GHL: Settings → Conversations → Webhooks → point to:
// https://your-vercel-url.vercel.app/api/shirley/ghl-webhook

export async function POST(request: Request) {
  const secretKey = process.env.TRIGGER_DEV_SECRET_KEY;
  if (!secretKey) {
    return Response.json(
      { error: 'TRIGGER_DEV_SECRET_KEY is not set' },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Only handle inbound SMS messages
  if (body.type !== 'InboundMessage') {
    return Response.json({ ignored: true, type: body.type });
  }

  if (!body.phone && !body.contactId) {
    return Response.json({ error: 'Missing phone or contactId' }, { status: 400 });
  }

  const res = await fetch(
    'https://api.trigger.dev/api/v1/tasks/shirley-inbound-message/trigger',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        payload: {
          type: body.type,
          locationId: body.locationId,
          contactId: body.contactId,
          phone: body.phone,
          message: body.message,
          messageId: body.messageId,
          dateAdded: body.dateAdded,
          attachments: body.attachments ?? [],
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`[ghl-webhook] Trigger.dev error ${res.status}: ${text}`);
    // Still return 200 to GHL so it doesn't keep retrying
    return Response.json({ received: true, triggerError: res.status });
  }

  return Response.json({ received: true });
}
