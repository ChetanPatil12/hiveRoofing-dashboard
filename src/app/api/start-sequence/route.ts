export async function POST(request: Request) {
  const secretKey = process.env.TRIGGER_DEV_SECRET_KEY;
  if (!secretKey) {
    return Response.json(
      { error: 'TRIGGER_DEV_SECRET_KEY environment variable is not set' },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.jobId) {
    return Response.json({ error: 'jobId is required' }, { status: 400 });
  }

  const res = await fetch(
    'https://api.trigger.dev/api/v1/tasks/manual-enroll/trigger',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({ payload: { jobId: body.jobId } }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `Trigger.dev returned ${res.status}: ${text}` },
      { status: res.status }
    );
  }

  return Response.json({
    success: true,
    message: `Review sequence started for job ${body.jobNumber ?? body.jobId}`,
    jobId: body.jobId,
  });
}
