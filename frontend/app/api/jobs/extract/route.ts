import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const replicateToken = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;
    if (!replicateToken) {
      console.error('REPLICATE BACKEND ERROR: REPLICATE_API_TOKEN is missing from environment.');
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN is missing. Please check .env.local.' },
        { status: 401 }
      );
    }

    const replicate = new Replicate({
      auth: replicateToken,
    });

    let dataUri: string | null = null;

    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | Blob | null;

      if (file && typeof (file as any).arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = (file as any).type || 'audio/mpeg';
        dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
    } catch (formErr) {
      console.warn('REPLICATE BACKEND: FormData parse note:', formErr);
    }

    // Fallback if no file in FormData: read default demo track
    if (!dataUri) {
      const demoPath = path.join(process.cwd(), 'public', 'demo', 'demo_turn_on_the_lights.wav');
      const demoMp3Path = path.join(process.cwd(), 'public', 'demo', 'demo_turn_on_the_lights.mp3');
      if (fs.existsSync(demoPath)) {
        const demoBuffer = fs.readFileSync(demoPath);
        dataUri = `data:audio/wav;base64,${demoBuffer.toString('base64')}`;
      } else if (fs.existsSync(demoMp3Path)) {
        const demoBuffer = fs.readFileSync(demoMp3Path);
        dataUri = `data:audio/mpeg;base64,${demoBuffer.toString('base64')}`;
      }
    }

    if (!dataUri) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[REPLICATE BACKEND] Dispatching prediction to Demucs (25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953)...');
    
    // Create prediction using the stable Demucs release version hash
    const prediction = await replicate.predictions.create({
      version: '25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953',
      input: {
        audio: dataUri,
        stem: 'vocals',
      },
    });

    console.log('[REPLICATE BACKEND] Prediction created successfully. Job ID:', prediction.id);
    return NextResponse.json({ jobId: prediction.id, status: prediction.status }, { status: 202 });
  } catch (error: any) {
    console.error('REPLICATE BACKEND ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
