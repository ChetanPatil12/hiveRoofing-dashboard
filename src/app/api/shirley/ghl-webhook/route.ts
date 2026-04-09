// GHL posts here when an inbound SMS is received.
// We forward it to the shirley-inbound-message Trigger.dev task.

/** Strip everything except digits, then normalise to E.164 +1XXXXXXXXXX */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // If 10 digits, prepend country code
  if (digits.length === 10) return `+1${digits}`;
  // If 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  // Otherwise return as-is with + prefix if not already there
  return raw.startsWith('+') ? raw : `+${digits}`;
}

export async function POST(request: Request) {
  const triggerSecret = process.env.SHIRLEY_TRIGGER_SECRET_KEY;

  if (!triggerSecret) {
    console.error('[ghl-webhook] SHIRLEY_TRIGGER_SECRET_KEY is not set');
    return Response.json(
      { error: 'SHIRLEY_TRIGGER_SECRET_KEY is not set' },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    console.error('[ghl-webhook] Failed to parse request body');
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Log the full raw payload so we can debug field name mismatches in Vercel logs
  console.log('[ghl-webhook] Raw payload:', JSON.stringify(body));

  // GHL custom data field names (as configured in GHL webhook settings)
  const rawPhone =
    (body.contact_phone as string) ||
    (body.contact_phone_raw as string) ||
    (body.phone as string) ||
    '';

  // GHL sometimes sends the body as a JSON string: {"type":2,"body":"actual text"}
  // Extract the inner .body string if that's the case
  function extractMessageBody(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed.body === 'string') return parsed.body;
        if (typeof parsed.text === 'string') return parsed.text;
        if (typeof parsed.message === 'string') return parsed.message;
      } catch { /* not JSON, fall through */ }
    }
    return trimmed;
  }

  const message_body = extractMessageBody(
    body.sms_body ?? body.message ?? body.body ?? ''
  );

  const ghl_message_id =
    (body.contact_id as string) ||
    (body.messageId as string) ||
    `ghl-${Date.now()}`;

  if (!rawPhone || !message_body) {
    console.warn('[ghl-webhook] Missing phone or message_body — ignoring. phone:', rawPhone, 'body:', message_body);
    // Not an SMS we care about — acknowledge silently so GHL doesn't retry
    return Response.json({ received: true });
  }

  const phone = normalizePhone(rawPhone);
  console.log(`[ghl-webhook] Received SMS from ${rawPhone} → normalized: ${phone} | body: "${message_body}"`);

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
