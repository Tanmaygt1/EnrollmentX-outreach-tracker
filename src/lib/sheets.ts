import { google } from 'googleapis';
import { Lead, OutreachLog, Stage } from '@/types';

const OUTREACH_HEADERS = [
  'id', 'timestamp', 'team_member_name', 'lead_name', 'platform', 'status', 'notes',
];

/**
 * Maps our internal field names to possible header spellings in the user's sheet.
 * We match case-insensitively against the first row.
 */
const COL_ALIASES: Record<string, string[]> = {
  fullName:         ['full name', 'name', 'full_name', 'contact name'],
  email:            ['public email', 'email', 'e-mail', 'email address'],
  phoneCountryCode: ['phone country code', 'country code', 'phone_country_code', 'cc'],
  phoneNumber:      ['phone number', 'phone', 'phone_number', 'mobile', 'mobile number', 'whatsapp'],
  profileLink:      ['profile link', 'instagram', 'ig', 'ig link', 'profile_link', 'instagram link', 'ig profile', 'profile url'],
  dmed:             ['dmed?', 'dmed', 'dm sent', 'dm?', 'dm sent?'],
  dateOfDm:         ['date of dm', 'dm date', 'date_of_dm', 'date dmed'],
  dmedBy:           ['dmed by?', 'dmed by', 'dm by', 'dmed_by', 'sent by', 'outreached by'],
  replied:          ['replied?', 'replied', 'reply', 'reply?'],
  interested:       ['interested?', 'interested', 'interest'],
  followUp1:        ['follow-up 1', 'followup 1', 'follow up 1', 'follow_up_1', 'fu1'],
  followUp2:        ['follow-up 2', 'followup 2', 'follow up 2', 'follow_up_2', 'fu2'],
  followUp3:        ['follow-up 3', 'followup 3', 'follow up 3', 'follow_up_3', 'fu3'],
  stage:            ['stage'],
  notes:            ['notes', 'note', 'comments'],
  assignedTo:       ['assigned to', 'assigned_to', 'assignee', 'owner'],
};

type FieldKey = keyof typeof COL_ALIASES;
type ColIndices = Record<FieldKey, number>;

function resolveColumns(headerRow: string[]): ColIndices {
  const normalized = headerRow.map(h => h.trim().toLowerCase());
  const result = {} as ColIndices;
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    const idx = aliases.reduce<number>((found, alias) => {
      if (found !== -1) return found;
      const i = normalized.indexOf(alias.toLowerCase());
      return i;
    }, -1);
    result[field as FieldKey] = idx;
  }
  return result;
}

/** Convert 0-based column index to A1-notation letter (0→A, 25→Z, 26→AA) */
function colLetter(idx: number): string {
  let letter = '';
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

function getSheetName(type: 'leads' | 'outreach'): string {
  if (type === 'leads') {
    return process.env.LEADS_SHEET_NAME ?? process.env.LEADS_SHEET_TAB ?? 'Sheet1';
  }

  return process.env.OUTREACH_SHEET_NAME ?? process.env.OUTREACH_SHEET_TAB ?? 'Sheet1';
}

// ── LEADS ──────────────────────────────────────────────

export async function getLeads(): Promise<Lead[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.LEADS_SHEET_ID!;
  const sheetName = getSheetName('leads');

  // Read header row
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const headerRow: string[] = (headerRes.data.values?.[0] ?? []).map(String);

  // Ensure Stage, Notes, Assigned To columns exist (append if missing)
  const needed = [
    { key: 'stage',      label: 'Stage' },
    { key: 'notes',      label: 'Notes' },
    { key: 'assignedTo', label: 'Assigned To' },
  ];
  const newHeaders: { range: string; values: string[][] }[] = [];
  let offset = headerRow.length;

  for (const { key, label } of needed) {
    const existing = resolveColumns(headerRow)[key as FieldKey];
    if (existing === -1) {
      newHeaders.push({ range: `${sheetName}!${colLetter(offset)}1`, values: [[label]] });
      headerRow.push(label);
      offset++;
    }
  }

  if (newHeaders.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data: newHeaders },
    });
  }

  const colIndices = resolveColumns(headerRow);
  const lastCol = colLetter(headerRow.length - 1);

  // Fetch all data rows
  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:${lastCol}`,
  });

  const rows = dataRes.data.values ?? [];

  return rows
    .map((row, i) => {
      const get = (field: FieldKey): string => {
        const idx = colIndices[field];
        if (idx === -1) return '';
        return String(row[idx] ?? '').trim();
      };

      return {
        rowIndex: i + 2,
        id: `lead-${i + 2}`,
        fullName:         get('fullName'),
        email:            get('email'),
        phoneCountryCode: get('phoneCountryCode'),
        phoneNumber:      get('phoneNumber'),
        profileLink:      get('profileLink'),
        dmed:             get('dmed'),
        dateOfDm:         get('dateOfDm'),
        dmedBy:           get('dmedBy'),
        replied:          get('replied'),
        interested:       get('interested'),
        followUp1:        get('followUp1'),
        followUp2:        get('followUp2'),
        followUp3:        get('followUp3'),
        stage:            (get('stage') as Stage) || 'New Lead',
        notes:            get('notes'),
        assignedTo:       get('assignedTo'),
      } satisfies Lead;
    })
    .filter(l => l.fullName !== ''); // skip blank rows
}

/**
 * Update arbitrary fields on a single lead row.
 * Pass a partial record of field keys → new string values.
 */
export async function updateLeadFields(
  rowIndex: number,
  updates: Partial<Record<FieldKey, string>>,
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.LEADS_SHEET_ID!;
  const sheetName = getSheetName('leads');

  // Re-read headers to get current positions
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const headerRow: string[] = (headerRes.data.values?.[0] ?? []).map(String);
  const colIndices = resolveColumns(headerRow);

  const data: { range: string; values: string[][] }[] = [];

  for (const [field, value] of Object.entries(updates)) {
    const idx = colIndices[field as FieldKey];
    if (idx === -1) continue;
    data.push({
      range: `${sheetName}!${colLetter(idx)}${rowIndex}`,
      values: [[value as string]],
    });
  }

  if (data.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data },
  });
}

// ── OUTREACH LOG ───────────────────────────────────────

export async function getOutreachLogs(): Promise<OutreachLog[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.OUTREACH_SHEET_ID!;
  const sheetName = getSheetName('outreach');

  await ensureOutreachHeaders(sheets, spreadsheetId, sheetName);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:G`,
  });

  const rows = res.data.values ?? [];
  if (rows.length < 2) return [];

  return rows.slice(1).map(row => ({
    id:             String(row[0] ?? ''),
    timestamp:      String(row[1] ?? ''),
    teamMemberName: String(row[2] ?? ''),
    leadName:       String(row[3] ?? ''),
    platform:       String(row[4] ?? ''),
    status:         String(row[5] ?? ''),
    notes:          String(row[6] ?? ''),
  }));
}

async function ensureOutreachHeaders(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string,
  sheetName: string,
) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:G1`,
  });
  if ((res.data.values?.[0] ?? []).length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [OUTREACH_HEADERS] },
    });
  }
}

export async function appendOutreachLog(entry: Omit<OutreachLog, 'id'>): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.OUTREACH_SHEET_ID!;
  const sheetName = getSheetName('outreach');

  await ensureOutreachHeaders(sheets, spreadsheetId, sheetName);

  const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[id, entry.timestamp, entry.teamMemberName,
                entry.leadName, entry.platform, entry.status, entry.notes]],
    },
  });
}
