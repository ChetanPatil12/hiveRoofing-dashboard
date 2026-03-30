import type { Customer } from '@/types/customer';

const SHEET_ID = '1SbXGNNpSAKSX_92kus4QEr7q86m-xYSFVz2KxGXp-8w';
const TAB_NAME = 'review_tracker';

export async function fetchCustomers(): Promise<Customer[]> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_SHEETS_API_KEY environment variable is not set');
  }

  const range = encodeURIComponent(TAB_NAME);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${apiKey}`;

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets API returned ${res.status}: ${body}`);
  }

  const json = await res.json();
  const rows: string[][] = json.values ?? [];

  if (rows.length < 2) return [];

  const [headers, ...dataRows] = rows;

  return dataRows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? '';
    });

    return {
      ...obj,
      current_step: parseInt(obj.current_step, 10) || 0,
    } as unknown as Customer;
  });
}
