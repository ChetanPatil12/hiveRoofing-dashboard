import type { SendMessagePayload } from '@/types/shirley';

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_EMPLOYEE_MSG_WEBHOOK;
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl) {
    return Response.json(
      { error: 'N8N_EMPLOYEE_MSG_WEBHOOK is not set' },
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

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return Response.json(
      { error: `Couldn't send message — please try again` },
      { status: res.status }
    );
  }

  return Response.json({ success: true });
}
