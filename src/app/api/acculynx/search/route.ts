export async function POST(request: Request) {
  const apiKey = process.env.ACCULYNX_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ACCULYNX_API_KEY environment variable is not set' },
      { status: 500 }
    );
  }

  let body: { searchTerm?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { searchTerm } = body;
  if (!searchTerm || !searchTerm.trim()) {
    return Response.json({ error: 'searchTerm is required' }, { status: 400 });
  }

  const res = await fetch(
    'https://api.acculynx.com/api/v2/jobs/search?pageSize=10&includes=contact',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ searchTerm: searchTerm.trim() }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `AccuLynx API returned ${res.status}: ${text}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  return Response.json(data);
}
