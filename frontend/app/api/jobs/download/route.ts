import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '../../../../lib/vocalJobStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('id') || searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 });
    }

    const job = getJob(jobId);
    if (!job || !job.audioBuffer) {
      return NextResponse.json({ error: 'Audio not ready or job not found' }, { status: 404 });
    }

    return new Response(new Uint8Array(job.audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'inline; filename="bambata_isolated_acapella.wav"',
        'Cache-Control': 'public, max-age=3600',
        'X-Vocal-Pipeline': '2-Stage-BSRoformer-Neural-Inpainting',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to download acapella.' },
      { status: 500 }
    );
  }
}
