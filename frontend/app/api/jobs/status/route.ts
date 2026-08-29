import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('jobId');

    if (!id) {
      return NextResponse.json({ error: 'Missing prediction id query parameter.' }, { status: 400 });
    }

    const prediction = await replicate.predictions.get(id);

    let outputUrl: string | null = null;
    if (prediction.status === 'succeeded' && prediction.output) {
      if (typeof prediction.output === 'string') {
        outputUrl = prediction.output;
      } else if (typeof prediction.output === 'object') {
        outputUrl =
          (prediction.output as any).vocals ||
          (prediction.output as any).vocal ||
          (prediction.output as any)[0] ||
          null;
      }
    }

    return NextResponse.json({
      jobId: prediction.id,
      status: prediction.status,
      outputUrl,
      error: prediction.error,
    });
  } catch (err: any) {
    console.error('[JobsStatus] Prediction status check error:', err);
    return NextResponse.json(
      { error: err?.message || 'Error checking prediction status.' },
      { status: 500 }
    );
  }
}
