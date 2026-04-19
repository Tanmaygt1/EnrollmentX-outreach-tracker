import { NextRequest, NextResponse } from 'next/server';
import { getOutreachLogs, appendOutreachLog } from '@/lib/sheets';
import { computeStats, computeTeamStats, Period } from '@/lib/stats';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get('period') ?? 'all') as Period;

    const logs = await getOutreachLogs();
    const stats = computeStats(logs, period);
    const teamStats = computeTeamStats(logs, period);
    const recentActivity = [...logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    return NextResponse.json({ stats, teamStats, recentActivity });
  } catch (err) {
    console.error('[GET /api/outreach]', err);
    return NextResponse.json({ error: 'Failed to fetch outreach data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamMemberName, leadName, platform, status, notes } = body;

    if (!teamMemberName || !leadName || !platform || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await appendOutreachLog({
      timestamp: new Date().toISOString(),
      teamMemberName,
      leadName,
      platform,
      status,
      notes: notes ?? '',
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/outreach]', err);
    return NextResponse.json({ error: 'Failed to log outreach' }, { status: 500 });
  }
}
