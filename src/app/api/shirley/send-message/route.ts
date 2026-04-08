import type { SendMessagePayload } from '@/types/shirley';

export async function POST(request: Request) {
  const secretKey = process.env.SHIRLEY_TRIGGER_SECRET_KEY;
  if (!secretKey) {
    return Response.json(
      { error: 'SHIRLEY_TRIGGER_SECRET_KEY is not set' },
      { status: 500 }
    );
  }

  let body: SendMessagePayload;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.jobId || !body.recipientPhone || !body.messageBody) {
    return Response.json(
      { error: 'jobId, recipientPhone, and messageBody are required' },
      { status: 400 }
    );
  }

  const res = await fetch(
    'https://api.trigger.dev/api/v1/tasks/shirley-employee-message/trigger',
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
      { error: `Couldn't send message — please try again` },
      { status: res.status }
    );
  }

  return Response.json({ success: true });
}
