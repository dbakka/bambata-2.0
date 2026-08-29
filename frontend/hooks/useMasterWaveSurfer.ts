'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

export function useMasterWaveSurfer(
  containerRef: React.RefObject<HTMLDivElement>,
  audioUrl: string | null,
  initialDurationSec: number = 60,
  onLoadError?: (err: any) => void
) {
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);

  const [isMasterPlaying, setIsMasterPlaying] = useState<boolean>(false);
  const [isMasterReady, setIsMasterReady] = useState<boolean>(false);
  const [masterProgressSec, setMasterProgressSec] = useState<number>(0);
  const [masterDurationSec, setMasterDurationSec] = useState<number>(initialDurationSec);
  const [masterRegion, setMasterRegion] = useState<[number, number]>([0, Math.min(30, initialDurationSec)]);

  useEffect(() => {
    // Only initialize WaveSurfer when container exists AND audioUrl is provided
    if (!containerRef.current || !audioUrl) {
      setIsMasterReady(false);
      return;
    }

    if (wsRef.current) {
      try {
        if (wsRef.current.isPlaying()) wsRef.current.pause();
        wsRef.current.destroy();
      } catch (e) {}
      wsRef.current = null;
    }

    setIsMasterReady(false);

    const reg = RegionsPlugin.create();
    regionsRef.current = reg;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#fbcfe8',
      progressColor: '#ec4899',
      cursorColor: '#18181b',
      cursorWidth: 2,
      height: 100,
      barWidth: 2,
      barGap: 1.5,
      barRadius: 2,
      plugins: [reg],
    });

    wsRef.current = ws;

    ws.on('play', () => setIsMasterPlaying(true));
    ws.on('pause', () => setIsMasterPlaying(false));
    ws.on('finish', () => setIsMasterPlaying(false));
    ws.on('timeupdate', (t) => setMasterProgressSec(t));
    ws.on('seeking', (t) => setMasterProgressSec(t));
    ws.on('error', (err) => {
      console.warn('WaveSurfer internal error:', err);
      setIsMasterReady(false);
      if (onLoadError) onLoadError(err);
    });

    ws.on('ready', (dur) => {
      setMasterDurationSec(dur);
      setIsMasterReady(true);
      reg.clearRegions();
      reg.addRegion({
        start: 0,
        end: Math.min(30, dur),
        color: 'rgba(236, 72, 153, 0.18)',
        drag: true,
        resize: true,
      });
      setMasterRegion([0, Math.min(30, dur)]);
    });

    reg.on('region-updated', (region: any) => {
      setMasterRegion([
        Math.round(region.start * 10) / 10,
        Math.round(region.end * 10) / 10,
      ]);
    });

    ws.load(audioUrl).catch((err) => {
      console.warn('Error loading master audio:', err);
      setIsMasterReady(false);
      if (onLoadError) onLoadError(err);
    });

    return () => {
      try {
        if (ws) {
          if (ws.isPlaying()) ws.pause();
          ws.destroy();
        }
      } catch (e) {}
      wsRef.current = null;
    };
  }, [audioUrl, onLoadError]);

  // True Toggle Play / Pause
  const toggleMasterPlay = useCallback(() => {
    if (!wsRef.current) return;
    if (isMasterPlaying) {
      wsRef.current.pause();
    } else {
      wsRef.current.play();
    }
  }, [isMasterPlaying]);

  const seekMaster = useCallback((timeSec: number) => {
    setMasterProgressSec(timeSec);
    if (wsRef.current) wsRef.current.setTime(timeSec);
  }, []);

  return {
    isMasterPlaying,
    isMasterReady,
    masterProgressSec,
    masterDurationSec,
    masterRegion,
    toggleMasterPlay,
    seekMaster,
    setMasterRegion,
  };
}
