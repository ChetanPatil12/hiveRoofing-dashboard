import { google } from 'googleapis';

const SHEET_ID = '1SbXGNNpSAKSX_92kus4QEr7q86m-xYSFVz2KxGXp-8w';
const TAB_NAME = 'review_tracker';

// Must match the actual Google Sheet column order exactly.
// Existing sheet ends at last_updated (AB). New columns appended after.
const SHEET_COLUMNS = [
  // Existing columns A–AB (match the sheet header row exactly)
  'customer_id', 'job_id', 'customer_name', 'customer_email', 'customer_phone',
  'customer_address', 'review_link_base', 'current_step', 'status', 'last_milestone',
  'job_closed_date', 'last_request_date', 'last_request_step', 'initial_rating',
  'initial_feedback', 'step1_confirmed', 'step1_confirmed_date', 'step2_confirmed',
  'step2_confirmed_date', 'step3_confirmed', 'step3_confirmed_date', 'step4_confirmed',
  'step4_confirmed_date', 'step5_confirmed', 'step5_confirmed_date',
  'notes', 'created_date', 'last_updated',
  // New columns — add these headers to the sheet after last_updated (AC onward)
  'step6_confirmed', 'step6_confirmed_date', 'post_close_reminder_count',
  'step1_nps', 'step2_nps', 'step3_nps', 'step4_nps', 'step5_nps', 'step6_nps',
] as const;

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

    // Use hardcoded SHEET_COLUMNS as the source of truth — the sheet's header row is
    // incomplete (missing step6_confirmed and step6_confirmed_date), so reading headers
    // would map created_date/last_updated to the wrong columns.
    const col = (name: string) => SHEET_COLUMNS.indexOf(name as typeof SHEET_COLUMNS[number]);

    // customer_id is always index 0 (first column)
    const dataRowIdx = rows.slice(1).findIndex(row => row[0] === customerId);
    if (dataRowIdx === -1) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    const sheetRowNum = dataRowIdx + 2; // 1-indexed sheet row

    // Pad or trim to exactly SHEET_COLUMNS.length so the write range always matches.
    const rowData = rows[dataRowIdx + 1].slice(0, SHEET_COLUMNS.length) as string[];
    while (rowData.length < SHEET_COLUMNS.length) rowData.push('');

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

    const lastCol = columnLetter(SHEET_COLUMNS.length);
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
