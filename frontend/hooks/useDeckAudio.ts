'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import {
  detectBpmClient,
  detectCamelotKeyClient,
  audioBufferToWav,
} from '../lib/audioBufferUtils';

export interface UseDeckAudioProps {
  deck: 'A' | 'B';
  file: File | null;
  defaultAudioUrl?: string;
  otherDeckBpm?: number;
  otherDeckKey?: string;
  onRegionChange?: (region: [number, number]) => void;
}

export function useDeckAudio({
  deck,
  file,
  defaultAudioUrl,
  otherDeckBpm = 126.0,
  otherDeckKey = '8A',
  onRegionChange,
}: UseDeckAudioProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSolo, setIsSolo] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(100);
  const [filterVal, setFilterValState] = useState<number>(50); // Clarity HPF for A, Suppress Notch for B
  const [bpm, setBpmState] = useState<number>(126.0);
  const [camelotKey, setCamelotKeyState] = useState<string>('8A');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isExtractingVocal, setIsExtractingVocal] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);
  const [extractionStage, setExtractionStage] = useState<string>('Initializing Deep Neural Pipeline');
  const [isAcapellaIsolated, setIsAcapellaIsolated] = useState<boolean>(false);
  const [vocalExtractError, setVocalExtractError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(60);
  const [region, setRegionState] = useState<[number, number]>(
    deck === 'A' ? [7.6, 30.5] : [15.2, 45.7]
  );

  const bpmRef = useRef<number>(126.0);
  const volumeRef = useRef<number>(100);
  const filterValRef = useRef<number>(50);

  // Safe Audio Context getter
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  // Safe Audio Decoder
  const decodeBuffer = useCallback(async (data: ArrayBuffer): Promise<AudioBuffer | null> => {
    try {
      const ctx = getAudioContext();
      return await ctx.decodeAudioData(data);
    } catch (err) {
      console.warn(`Deck ${deck} decoding fallback:`, err);
      const ctx = getAudioContext();
      const sr = 44100;
      const dur = 30.0;
      return ctx.createBuffer(2, Math.floor(sr * dur), sr);
    }
  }, [deck, getAudioContext]);

  // Client-Side BPM & Key Detection
  const analyzeBuffer = useCallback((buf: AudioBuffer) => {
    setIsAnalyzing(true);
    try {
      const detectedBpm = detectBpmClient(buf);
      const detectedKey = detectCamelotKeyClient(buf);
      setBpmState(detectedBpm);
      bpmRef.current = detectedBpm;
      setCamelotKeyState(detectedKey);
    } catch (err) {
      console.warn(`Deck ${deck} analysis error:`, err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [deck]);

  // Setup DSP Web Audio Nodes
  const attachAudioNodes = useCallback(() => {
    if (!wsRef.current) return;
    const mediaEl = wsRef.current.getMediaElement();
    if (!mediaEl || (mediaEl as any).__wsAttached) return;

    try {
      const ctx = getAudioContext();
      const source = ctx.createMediaElementSource(mediaEl);
      const filter = ctx.createBiquadFilter();

      if (deck === 'A') {
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(20 + (filterValRef.current / 100) * 380, ctx.currentTime);
      } else {
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(1500, ctx.currentTime);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);
        filter.gain.setValueAtTime(-((filterValRef.current / 100) * 15.0), ctx.currentTime);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volumeRef.current / 100, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      filterNodeRef.current = filter;
      gainNodeRef.current = gain;
      (mediaEl as any).__wsAttached = true;
    } catch (e) {}
  }, [deck, getAudioContext]);

  // Initialize WaveSurfer Instance
  useEffect(() => {
    if (!containerRef.current) return;

    if (wsRef.current) {
      try {
        if (wsRef.current.isPlaying()) wsRef.current.pause();
        wsRef.current.destroy();
      } catch (e) {}
      wsRef.current = null;
    }

    const regPlugin = RegionsPlugin.create();
    regionsRef.current = regPlugin;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#e4e4e7',
      progressColor: deck === 'A' ? '#ec4899' : '#27272a',
      cursorColor: '#ec4899',
      cursorWidth: 2,
      height: 70,
      barWidth: 2,
      barGap: 1.5,
      barRadius: 2,
      plugins: [regPlugin],
    });

    wsRef.current = ws;

    ws.on('play', () => {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      setIsPlaying(true);
    });
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('timeupdate', (t) => setCurrentTime(t));
    ws.on('seeking', (t) => setCurrentTime(t));
    ws.on('error', (err) => console.warn(`Deck ${deck} WaveSurfer error:`, err));

    ws.on('ready', (dur) => {
      const trackDur = dur || ws.getDuration();
      if (trackDur > 600) {
        console.warn(`Deck ${deck} upload failed: Track exceeds the 10-minute duration limit (${trackDur.toFixed(1)}s)`);
        ws.empty();
        bufferRef.current = null;
        setDuration(0);
        if (typeof window !== 'undefined') {
          alert('Upload failed: Track exceeds the 10-minute duration limit.');
        }
        return;
      }

      setDuration(trackDur);
      attachAudioNodes();
      regPlugin.clearRegions();
      regPlugin.addRegion({
        start: region[0],
        end: Math.min(trackDur, region[1]),
        color: deck === 'A' ? 'rgba(236, 72, 153, 0.22)' : 'rgba(39, 39, 42, 0.22)',
        drag: true,
        resize: true,
      });
    });

    regPlugin.on('region-updated', (r: any) => {
      const newRegion: [number, number] = [
        Math.round(r.start * 10) / 10,
        Math.round(r.end * 10) / 10,
      ];
      setRegionState(newRegion);
      if (onRegionChange) onRegionChange(newRegion);
    });

    // Load Audio with 50MB limit check
    const loadAudioSource = async () => {
      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          console.warn(`Deck ${deck} upload failed: File exceeds 50MB (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
          if (typeof window !== 'undefined') {
            alert('Upload failed: File exceeds the 50MB size limit.');
          }
          return;
        }

        const blobUrl = URL.createObjectURL(file);
        ws.load(blobUrl).catch(() => {});
        const arrayBuf = await file.arrayBuffer();
        const decoded = await decodeBuffer(arrayBuf);
        if (decoded) {
          if (decoded.duration > 600) {
            console.warn(`Deck ${deck} track exceeds 10 minutes (${decoded.duration.toFixed(1)}s)`);
            ws.empty();
            bufferRef.current = null;
            setDuration(0);
            if (typeof window !== 'undefined') {
              alert('Upload failed: Track exceeds the 10-minute duration limit.');
            }
            return;
          }
          bufferRef.current = decoded;
          analyzeBuffer(decoded);
        }
      } else {
        const defaultUrl = defaultAudioUrl || (deck === 'A' ? '/demo/demo_turn_on_the_lights.mp3' : '/demo/demo_drugs_from_amsterdam.mp3');
        ws.load(defaultUrl).catch(() => {});
        try {
          const res = await fetch(defaultUrl);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            const decoded = await decodeBuffer(arrayBuf);
            if (decoded) {
              bufferRef.current = decoded;
              analyzeBuffer(decoded);
            }
          }
        } catch (e) {
          console.warn(`Deck ${deck} default fetch fallback:`, e);
        }
      }
    };

    loadAudioSource();

    return () => {
      try {
        if (ws) {
          if (ws.isPlaying()) ws.pause();
          ws.destroy();
        }
      } catch (e) {}
      wsRef.current = null;
    };
  }, [file, defaultAudioUrl, deck, decodeBuffer, analyzeBuffer, attachAudioNodes, getAudioContext, onRegionChange]);

  // Volume & Solo/Mute State Sync
  const updateVolumes = useCallback(() => {
    if (!wsRef.current) return;
    const vol = isMuted ? 0 : isSolo ? volumeRef.current / 100 : volumeRef.current / 100;
    wsRef.current.setVolume(vol);

    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(vol, audioCtxRef.current.currentTime);
    }
  }, [isMuted, isSolo]);

  useEffect(() => {
    updateVolumes();
  }, [updateVolumes]);

  // Play / Pause
  const togglePlay = useCallback(() => {
    if (!wsRef.current) return;
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    if (isPlaying) {
      wsRef.current.pause();
    } else {
      wsRef.current.play();
    }
  }, [isPlaying, getAudioContext]);

  // Mute & Solo
  const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);
  const toggleSolo = useCallback(() => setIsSolo((prev) => !prev), []);

  // Faders & Sliders
  const handleVolumeChange = useCallback((val: number) => {
    volumeRef.current = val;
    setVolumeState(val);
    if (wsRef.current) wsRef.current.setVolume(val / 100);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(val / 100, audioCtxRef.current.currentTime);
    }
  }, []);

  // Reconnect and Sync Vocal Clarity & Suppression Filters
  useEffect(() => {
    if (filterNodeRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      if (deck === 'A') {
        const hpfFreq = 20 + (filterVal / 100) * 380;
        filterNodeRef.current.frequency.setValueAtTime(hpfFreq, ctx.currentTime);
      } else {
        const notchGain = -((filterVal / 100) * 15.0);
        filterNodeRef.current.gain.setValueAtTime(notchGain, ctx.currentTime);
      }
    }
  }, [filterVal, deck]);

  const handleFilterChange = useCallback((val: number) => {
    filterValRef.current = val;
    setFilterValState(val);
    if (filterNodeRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      if (deck === 'A') {
        filterNodeRef.current.frequency.setValueAtTime(20 + (val / 100) * 380, ctx.currentTime);
      } else {
        filterNodeRef.current.gain.setValueAtTime(-((val / 100) * 15.0), ctx.currentTime);
      }
    }
  }, [deck]);

  // Serato Sync: BPM
  const syncBpm = useCallback(() => {
    const targetBpm = otherDeckBpm;
    const sourceBpm = bpmRef.current;
    const ratio = sourceBpm > 0 ? targetBpm / sourceBpm : 1.0;

    bpmRef.current = targetBpm;
    setBpmState(targetBpm);

    if (wsRef.current) {
      try {
        wsRef.current.setPlaybackRate(ratio);
      } catch (e) {}
    }
  }, [otherDeckBpm]);

  // Serato Sync: Key
  const syncKey = useCallback(() => {
    setCamelotKeyState(otherDeckKey);
  }, [otherDeckKey]);

  // SOTA 2-Stage Deep AI Pipeline: Serverless GPU Replicate BS-RoFormer Polling
  const extractAcapella = useCallback(async () => {
    setIsExtractingVocal(true);
    setExtractionProgress(15);
    setExtractionStage('Starting BS-RoFormer GPU container...');
    setVocalExtractError(null);

    try {
      let audioFileToUpload: File | Blob | null = file;

      if (!audioFileToUpload) {
        try {
          const defaultUrl =
            defaultAudioUrl ||
            (deck === 'A'
              ? '/demo/demo_turn_on_the_lights.mp3'
              : '/demo/demo_drugs_from_amsterdam.mp3');
          const demoRes = await fetch(defaultUrl);
          if (demoRes.ok) {
            audioFileToUpload = await demoRes.blob();
          }
        } catch (demoErr) {
          console.warn('[DeckAudio] Demo track fetch fallback:', demoErr);
        }
      }

      const formData = new FormData();
      if (audioFileToUpload) {
        formData.append('file', audioFileToUpload, 'track_audio.mp3');
      }

      // 1. Dispatch Asynchronous Job to /api/jobs/extract
      const res = await fetch('/api/jobs/extract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${res.status} Error`;
        throw new Error(`Extraction failed: ${errorMsg}`);
      }

      const jobData = await res.json();
      const jobId = jobData.jobId;

      if (!jobId) {
        throw new Error('No prediction jobId received from Replicate API.');
      }

      // 2. Poll /api/jobs/status?id={jobId} every 2 seconds until complete
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 60; // 120s timeout

      while (!isComplete && attempts < maxAttempts) {
        attempts++;
        await new Promise((r) => setTimeout(r, 2000));

        try {
          const statusRes = await fetch(`/api/jobs/status?id=${jobId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            const repStatus = statusData.status;

            if (repStatus === 'starting') {
              setExtractionProgress(25);
              setExtractionStage('Starting BS-RoFormer GPU container...');
            } else if (repStatus === 'processing') {
              setExtractionProgress(65);
              setExtractionStage('BS-RoFormer Complex Separation...');
            } else if (repStatus === 'succeeded' && statusData.outputUrl) {
              isComplete = true;
              setExtractionProgress(100);
              setExtractionStage('Complete');

              const downloadRes = await fetch(statusData.outputUrl);
              if (downloadRes.ok) {
                const blob = await downloadRes.blob();
                const blobUrl = URL.createObjectURL(blob);

                if (wsRef.current) {
                  try {
                    wsRef.current.empty();
                    await wsRef.current.load(blobUrl);
                  } catch (e) {}
                }

                const ctx = getAudioContext();
                const arrayBuf = await blob.arrayBuffer();
                const decoded = await ctx.decodeAudioData(arrayBuf);
                if (decoded && decoded.length > 0) {
                  bufferRef.current = decoded;
                  setIsAcapellaIsolated(true);
                }
              }
              break;
            } else if (repStatus === 'failed' || repStatus === 'canceled') {
              throw new Error(statusData.error || `Replicate prediction ${repStatus}.`);
            }
          }
        } catch (pollErr: any) {
          if (pollErr?.message?.includes('Replicate prediction')) {
            throw pollErr;
          }
          console.warn(`[DeckAudio] Polling attempt ${attempts} warning:`, pollErr);
        }
      }

      if (!isComplete) {
        throw new Error('BS-RoFormer neural extraction timed out after 120 seconds.');
      }
    } catch (err: any) {
      console.warn('[DeckAudio] Async extraction note:', err);
      setIsAcapellaIsolated(false);
      setVocalExtractError(
        err?.message || 'Vocal isolation failed. Check your REPLICATE_API_TOKEN.'
      );
    } finally {
      setIsExtractingVocal(false);
    }
  }, [file, getAudioContext]);

  // Scrubbing
  const seek = useCallback((timeSec: number) => {
    setCurrentTime(timeSec);
    if (wsRef.current) wsRef.current.setTime(timeSec);
  }, []);

  return {
    containerRef,
    wsInstance: wsRef.current,
    buffer: bufferRef.current,
    isPlaying,
    isMuted,
    isSolo,
    volume,
    filterVal,
    bpm,
    camelotKey,
    isAnalyzing,
    isExtractingVocal,
    extractionProgress,
    extractionStage,
    isAcapellaIsolated,
    vocalExtractError,
    duration,
    currentTime,
    region,
    togglePlay,
    toggleMute,
    toggleSolo,
    handleVolumeChange,
    handleFilterChange,
    setBpm: setBpmState,
    setCamelotKey: setCamelotKeyState,
    syncBpm,
    syncKey,
    extractAcapella,
    seek,
    setRegion: setRegionState,
  };
}
