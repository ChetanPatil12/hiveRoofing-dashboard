export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const apiKey = process.env.ACCULYNX_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'ACCULYNX_API_KEY environment variable is not set' },
      { status: 500 }
    );
  }

  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };

  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('contactId');
  const phoneNumberId = searchParams.get('phoneNumberId');

  // Fast path: contactId + phoneNumberId already known from search results
  if (contactId && phoneNumberId) {
    const phoneRes = await fetch(
      `https://api.acculynx.com/api/v2/contacts/${contactId}/phone-numbers/${phoneNumberId}`,
      { headers: authHeaders }
    );
    if (!phoneRes.ok) {
      return Response.json({ name: '', phone: '' });
    }
    const phoneData = await phoneRes.json();
    return Response.json({ phone: phoneData.number ?? '' });
  }

  // Slow path fallback: look up via job contacts list
  const contactsRes = await fetch(
    `https://api.acculynx.com/api/v2/jobs/${jobId}/contacts`,
    { headers: authHeaders }
  );

  if (!contactsRes.ok) {
    return Response.json({ name: '', phone: '' });
  }

  const contactsData = await contactsRes.json();
  const contacts: Array<{ contactId: string; isPrimary?: boolean }> =
    contactsData.data ?? contactsData ?? [];

  if (contacts.length === 0) {
    return Response.json({ name: '', phone: '' });
  }

  const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
  const cId = primary.contactId;

  const detailRes = await fetch(
    `https://api.acculynx.com/api/v2/contacts/${cId}`,
    { headers: authHeaders }
  );

  if (!detailRes.ok) {
    return Response.json({ name: '', phone: '' });
  }

  const detail = await detailRes.json();
  const firstName = detail.firstName ?? '';
  const lastName = detail.lastName ?? '';
  const pnId = detail.phoneNumbers?.[0]?.id;

  if (!pnId) {
    return Response.json({ name: `${firstName} ${lastName}`.trim(), phone: '' });
  }

  const phoneRes = await fetch(
    `https://api.acculynx.com/api/v2/contacts/${cId}/phone-numbers/${pnId}`,
    { headers: authHeaders }
  );

  if (!phoneRes.ok) {
    return Response.json({ name: `${firstName} ${lastName}`.trim(), phone: '' });
  }

  const phoneData = await phoneRes.json();
  return Response.json({
    name: `${firstName} ${lastName}`.trim(),
    phone: phoneData.number ?? '',
  });
}
