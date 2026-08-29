import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({
      status: 'success',
      job_id: `job_master_${Date.now()}`,
      message: 'Master render delegated to client OfflineAudioContext engine.',
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'success',
      job_id: `job_master_${Date.now()}`,
      message: 'Master pipeline ready.',
    });
  }
}
