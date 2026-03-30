import { fetchCustomers } from '@/lib/sheets';

export async function GET() {
  try {
    const customers = await fetchCustomers();
    return Response.json({ customers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
