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

  const url = new URL('https://api.acculynx.com/api/v2/jobs');
  url.searchParams.set('dateFilterType', 'ModifiedDate');
  url.searchParams.set('startDate', '2024-01-01');
  url.searchParams.set('milestones', 'approved,completed');
  url.searchParams.set('pageSize', '25');
  url.searchParams.set('includes', 'contacts,tradeTypes');
  if (q) url.searchParams.set('search', q);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

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
      contact?: { firstName?: string; lastName?: string };
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

    return {
      id: j.id,
      address: { fullAddress },
      homeownerName: homeownerName || undefined,
      tradeTypes: j.tradeTypes ?? [],
    };
  });

  return Response.json({ jobs });
}
