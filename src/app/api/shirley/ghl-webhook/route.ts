// GHL posts here when an inbound SMS is received.
// We forward it to the shirley-inbound-message Trigger.dev task.

export async function POST(request: Request) {
  const triggerSecret = process.env.SHIRLEY_TRIGGER_SECRET_KEY;

  if (!triggerSecret) {
    return Response.json(
      { error: 'SHIRLEY_TRIGGER_SECRET_KEY is not set' },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // GHL custom data field names (as configured in GHL webhook settings)
  const phone =
    (body.contact_phone as string) ??
    (body.contact_phone_raw as string) ??
    (body.phone as string) ??
    '';

  const message_body =
    (body.sms_body as string) ??
    (body.message as string) ??
    (body.body as string) ??
    '';

  const ghl_message_id =
    (body.contact_id as string) ??
    (body.messageId as string) ??
    `ghl-${Date.now()}`;

  if (!phone || !message_body) {
    // Not an SMS we care about — acknowledge silently so GHL doesn't retry
    return Response.json({ received: true });
  }

  const res = await fetch(
    'https://api.trigger.dev/api/v1/tasks/shirley-inbound-message/trigger',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${triggerSecret}`,
      },
      body: JSON.stringify({
        payload: { phone, message_body, ghl_message_id },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`[ghl-webhook] Trigger.dev error: ${text}`);
    // Still return 200 to GHL so it doesn't retry the webhook
    return Response.json({ received: true });
  }

  return Response.json({ received: true });
}
