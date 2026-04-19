import { NextResponse } from 'next/server';
import { getLeads } from '@/lib/sheets';

export async function GET() {
  try {
    const leads = await getLeads();
    return NextResponse.json(leads);
  } catch (err) {
    console.error('[GET /api/leads]', err);
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to fetch leads';
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development' ? message : 'Failed to fetch leads',
      },
      { status: 500 }
    );
  }
}
