import type { AccuLynxJobResult } from '@/types/shirley';

export async function GET(request: Request) {
  const apiKey = process.env.ACCULYNX_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ACCULYNX_API_KEY environment variable is not set' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';

  if (!q.trim()) {
    return Response.json({ jobs: [] });
  }

  const res = await fetch(
    'https://api.acculynx.com/api/v2/jobs/search?pageSize=20&includes=contacts,tradeTypes',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ searchTerm: q.trim() }),
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

  interface RawJob {
    id: string;
    locationAddress?: {
      street1?: string;
      street2?: string;
      city?: string;
      state?: { abbreviation?: string };
      zipCode?: string;
    };
    contacts?: Array<{
      isPrimary?: boolean;
      contact?: {
        id?: string;
        firstName?: string;
        lastName?: string;
        phoneNumbers?: Array<{ id: string }>;
      };
    }>;
    tradeTypes?: Array<{ id: string; name: string }>;
  }

  const jobs: AccuLynxJobResult[] = (data.items ?? data.data ?? []).map((j: RawJob) => {
    const loc = j.locationAddress;
    const parts = [
      loc?.street1,
      loc?.street2,
      loc?.city,
      loc?.state?.abbreviation,
      loc?.zipCode,
    ].filter(Boolean);
    const fullAddress = parts.join(', ');

    const primaryContact =
      j.contacts?.find((c) => c.isPrimary) ?? j.contacts?.[0];
    const firstName = primaryContact?.contact?.firstName ?? '';
    const lastName = primaryContact?.contact?.lastName ?? '';
    const homeownerName = `${firstName} ${lastName}`.trim();
    const contactId = primaryContact?.contact?.id;
    const phoneNumberId = primaryContact?.contact?.phoneNumbers?.[0]?.id;

    return {
      id: j.id,
      address: { fullAddress },
      homeownerName: homeownerName || undefined,
      tradeTypes: j.tradeTypes ?? [],
      contactId: contactId || undefined,
      phoneNumberId: phoneNumberId || undefined,
    };
  });

  return Response.json({ jobs });
}
