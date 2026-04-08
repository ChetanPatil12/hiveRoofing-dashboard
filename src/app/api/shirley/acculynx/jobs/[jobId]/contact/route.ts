export async function GET(
  _request: Request,
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

  // Step 1: get contacts list for job
  const contactsRes = await fetch(
    `https://api.acculynx.com/api/v2/jobs/${jobId}/contacts`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    }
  );

  if (!contactsRes.ok) {
    const text = await contactsRes.text();
    return Response.json(
      { error: `AccuLynx contacts returned ${contactsRes.status}: ${text}` },
      { status: contactsRes.status }
    );
  }

  const contactsData = await contactsRes.json();
  const contacts: Array<{ contactId: string; isPrimary?: boolean }> =
    contactsData.data ?? contactsData ?? [];

  if (contacts.length === 0) {
    return Response.json({ name: '', phone: '' });
  }

  // Prefer primary contact
  const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
  const contactId = primary.contactId;

  // Step 2: get contact details with phone
  const detailRes = await fetch(
    `https://api.acculynx.com/api/v2/contacts/${contactId}?includes=phoneNumber`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    }
  );

  if (!detailRes.ok) {
    const text = await detailRes.text();
    return Response.json(
      { error: `AccuLynx contact detail returned ${detailRes.status}: ${text}` },
      { status: detailRes.status }
    );
  }

  const detail = await detailRes.json();
  const firstName = detail.firstName ?? '';
  const lastName = detail.lastName ?? '';
  const phone = (detail.phoneNumber?.[0]?.number ?? '').replace(/\D/g, '');

  return Response.json({
    name: `${firstName} ${lastName}`.trim(),
    phone,
  });
}
