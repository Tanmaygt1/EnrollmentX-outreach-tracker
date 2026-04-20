import { NextResponse } from 'next/server';
import { getLeads } from '@/lib/sheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const leads = await getLeads();
    return NextResponse.json(leads, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
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
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}
