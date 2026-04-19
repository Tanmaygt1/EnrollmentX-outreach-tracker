import { NextRequest, NextResponse } from 'next/server';
import { updateLeadFields, appendOutreachLog } from '@/lib/sheets';

/**
 * PATCH /api/leads/[rowIndex]
 *
 * Body:
 *   rowIndex   - 1-based row number in the sheet
 *   fields     - key/value pairs matching COL_ALIASES keys in sheets.ts
 *   logEntry?  - optional outreach log entry to append simultaneously
 *
 * Special action "claim":
 *   When a team member DMs a lead they pass action:"claim" along with
 *   teamMember, platform. This atomically sets:
 *     dmed      → "Yes"
 *     dmedBy    → teamMember
 *     dateOfDm  → today ISO string
 *     stage     → "DMed"
 *   and appends to the outreach log.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { rowIndex: string } },
) {
  try {
    const body = await req.json();
    const rowIndex = parseInt(params.rowIndex, 10);

    if (isNaN(rowIndex)) {
      return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
    }

    // ── Claim action ──────────────────────────────────────────────
    if (body.action === 'claim') {
      const { teamMember, leadName, platform } = body as {
        teamMember: string;
        leadName: string;
        platform: string;
      };

      if (!teamMember) {
        return NextResponse.json({ error: 'teamMember required for claim' }, { status: 400 });
      }

      await updateLeadFields(rowIndex, {
        dmed:      'Yes',
        dmedBy:    teamMember,
        dateOfDm:  new Date().toISOString().split('T')[0], // YYYY-MM-DD
        stage:     'DMed',
        assignedTo: teamMember,
      });

      await appendOutreachLog({
        timestamp:      new Date().toISOString(),
        teamMemberName: teamMember,
        leadName:       leadName ?? '',
        platform:       platform ?? 'WhatsApp',
        status:         'DMed',
        notes:          '',
      });

      return NextResponse.json({ ok: true });
    }

    // ── Generic field update ──────────────────────────────────────
    const { fields, logEntry } = body as {
      fields?: Record<string, string>;
      logEntry?: {
        teamMemberName: string;
        leadName: string;
        platform: string;
        status: string;
        notes: string;
      };
    };

    if (fields && Object.keys(fields).length > 0) {
      await updateLeadFields(rowIndex, fields);
    }

    if (logEntry) {
      await appendOutreachLog({
        ...logEntry,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/leads/[rowIndex]]', err);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}
