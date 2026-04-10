import { google } from 'googleapis';

const SHEET_ID = '1SbXGNNpSAKSX_92kus4QEr7q86m-xYSFVz2KxGXp-8w';
const TAB_NAME = 'review_tracker';

function getSheetsClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_SHEETS_CLIENT_ID,
    process.env.GOOGLE_SHEETS_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_SHEETS_REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

function columnLetter(n: number): string {
  let letter = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;

  const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SHEETS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_SHEETS_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return Response.json({ error: 'Google Sheets OAuth2 credentials not configured' }, { status: 500 });
  }

  let body: { step: number; action: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { step, action } = body;
  if (!step || !action || !['approve', 'revert'].includes(action) || step < 1 || step > 6) {
    return Response.json({ error: 'Invalid payload. step must be 1–6, action must be approve or revert.' }, { status: 400 });
  }

  try {
    const sheetsClient = getSheetsClient();

    // Read the full sheet (headers + data)
    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: TAB_NAME,
    });

    const rows = (res.data.values ?? []) as string[][];
    if (rows.length < 2) {
      return Response.json({ error: 'Sheet has no data' }, { status: 404 });
    }

    const headers = rows[0];
    const col = (name: string) => headers.indexOf(name);

    const customerIdColIdx = col('customer_id');
    if (customerIdColIdx === -1) {
      return Response.json({ error: 'customer_id column not found in sheet' }, { status: 500 });
    }

    // Data rows start at index 1 (sheet row 2)
    const dataRowIdx = rows.slice(1).findIndex(row => row[customerIdColIdx] === customerId);
    if (dataRowIdx === -1) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    const sheetRowNum = dataRowIdx + 2; // 1-indexed sheet row
    const rowData = [...rows[dataRowIdx + 1]] as string[];

    // Pad row to header length in case trailing empty cells were trimmed
    while (rowData.length < headers.length) rowData.push('');

    const now = new Date().toISOString();

    if (action === 'approve') {
      rowData[col(`step${step}_confirmed`)] = 'yes';
      rowData[col(`step${step}_confirmed_date`)] = now;

      const currentStep = parseInt(rowData[col('current_step')] || '1', 10);
      if (step >= currentStep) {
        rowData[col('current_step')] = step === 6 ? '6' : String(step + 1);
      }

      const status = rowData[col('status')];
      if (status === 'pending') rowData[col('status')] = 'active';
      if (step === 6) rowData[col('status')] = 'completed';
    } else {
      // revert
      rowData[col(`step${step}_confirmed`)] = '';
      rowData[col(`step${step}_confirmed_date`)] = '';
      rowData[col('current_step')] = String(step);

      const status = rowData[col('status')];
      if (status === 'completed') rowData[col('status')] = 'active';
    }

    rowData[col('last_updated')] = now;

    const lastCol = columnLetter(headers.length);
    const range = `${TAB_NAME}!A${sheetRowNum}:${lastCol}${sheetRowNum}`;

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [rowData] },
    });

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
