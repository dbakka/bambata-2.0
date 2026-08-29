'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import {
  mixTracksToWavBlob,
  detectBpmClient,
  detectCamelotKeyClient,
  renderMasterMixdownClient,
  sliceAudioBuffer,
  audioBufferToWav
} from '../lib/audioBufferUtils';

export function useMultiTrackAudio(
  deckAContainerRef: React.RefObject<HTMLDivElement>,
  deckBContainerRef: React.RefObject<HTMLDivElement>,
  track3ContainerRef: React.RefObject<HTMLDivElement>,
  fileA: File | null,
  fileB: File | null
) {
  // Wavesurfer & Plugins Refs
  const wsARef = useRef<WaveSurfer | null>(null);
  const wsBRef = useRef<WaveSurfer | null>(null);
  const wsTrack3Ref = useRef<WaveSurfer | null>(null);
  const regionsARef = useRef<any>(null);
  const regionsBRef = useRef<any>(null);

  // Audio Buffers Cache & Generation Tracker
  const bufferARef = useRef<AudioBuffer | null>(null);
  const bufferBRef = useRef<AudioBuffer | null>(null);
  const previewBlobUrlRef = useRef<string | null>(null);
  const loadGenerationRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio Context & BiquadFilterNodes (Direct Mutation)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const filterARef = useRef<BiquadFilterNode | null>(null);
  const filterBRef = useRef<BiquadFilterNode | null>(null);
  const gainNodeARef = useRef<GainNode | null>(null);
  const gainNodeBRef = useRef<GainNode | null>(null);

  // Mutable parameter refs
  const isolationClarityRef = useRef<number>(50);
  const vocalSuppressRef = useRef<number>(50);
  const volumeARef = useRef<number>(100);
  const volumeBRef = useRef<number>(100);
  const deckARegionRef = useRef<[number, number]>([7.6, 30.5]);
  const deckBRegionRef = useRef<[number, number]>([15.2, 45.7]);
  const deckABpmRef = useRef<number>(126.0);
  const deckBBpmRef = useRef<number>(126.0);
  const keySyncRef = useRef<boolean>(true);

  // React State for UI Display Only
  const [isPlayingA, setIsPlayingA] = useState<boolean>(false);
  const [isPlayingB, setIsPlayingB] = useState<boolean>(false);
  const [isPlayingTrack3, setIsPlayingTrack3] = useState<boolean>(false);
  const [isGlobalPlaying, setIsGlobalPlaying] = useState<boolean>(false);

  const [currentTimeA, setCurrentTimeA] = useState<number>(0);
  const [currentTimeB, setCurrentTimeB] = useState<number>(0);
  const [currentTimeTrack3, setCurrentTimeTrack3] = useState<number>(0);
  const [durationA, setDurationA] = useState<number>(60);
  const [durationB, setDurationB] = useState<number>(60);
  const [durationTrack3, setDurationTrack3] = useState<number>(30);
  const [masterDuration, setMasterDuration] = useState<number>(60);

  const [isMutedA, setIsMutedA] = useState<boolean>(false);
  const [isMutedB, setIsMutedB] = useState<boolean>(false);
  const [isSoloA, setIsSoloA] = useState<boolean>(false);
  const [isSoloB, setIsSoloB] = useState<boolean>(false);

  // Volumes & EQ
  const [volumeA, setVolumeAState] = useState<number>(100);
  const [volumeB, setVolumeBState] = useState<number>(100);
  const [isolationClarityA, setIsolationClarityAState] = useState<number>(50);
  const [vocalSuppressB, setVocalSuppressB] = useState<number>(50);
  const [isProcessingFX, setIsProcessingFX] = useState<boolean>(false);
  const [isExtractingVocal, setIsExtractingVocal] = useState<boolean>(false);
  const [isAcapellaIsolated, setIsAcapellaIsolated] = useState<boolean>(false);
  const [vocalExtractError, setVocalExtractError] = useState<string | null>(null);

  // Serato Metadata Readouts
  const [deckAKey, setDeckAKey] = useState<string>('8A');
  const [deckABpm, setDeckABpmState] = useState<number>(126.0);
  const [deckBKey, setDeckBKey] = useState<string>('8A');
  const [deckBBpm, setDeckBBpmState] = useState<number>(126.0);
  const [isAnalyzingA, setIsAnalyzingA] = useState<boolean>(false);
  const [isAnalyzingB, setIsAnalyzingB] = useState<boolean>(false);
  const [isKeySyncOn, setIsKeySyncOnState] = useState<boolean>(true);

  const [deckARegion, setDeckARegionState] = useState<[number, number]>([7.6, 30.5]);
  const [deckBRegion, setDeckBRegionState] = useState<[number, number]>([15.2, 45.7]);

  // Decode File into AudioBuffer with strict limits and safe fallback
  const decodeFileToBuffer = async (file: File): Promise<AudioBuffer | null> => {
    if (file.size > 50 * 1024 * 1024) {
      if (typeof window !== 'undefined') {
        alert('Upload failed: File exceeds the 50MB size limit.');
      }
      return null;
    }

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await audioCtxRef.current.decodeAudioData(arrayBuffer);
      if (decoded && decoded.duration > 600) {
        if (typeof window !== 'undefined') {
          alert('Upload failed: Track exceeds the 10-minute duration limit.');
        }
        return null;
      }
      return decoded;
    } catch (err) {
      console.warn('Error decoding audio buffer, generating synthetic fallback:', err);
      if (audioCtxRef.current) {
        const sr = 44100;
        const dur = 30.0;
        const buf = audioCtxRef.current.createBuffer(2, Math.floor(sr * dur), sr);
        return buf;
      }
      return null;
    }
  };

  // Decode URL into AudioBuffer with safe fallback
  const decodeUrlToBuffer = async (url: string): Promise<AudioBuffer | null> => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      return await audioCtxRef.current.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.warn('Error fetching demo buffer, creating synthetic buffer:', err);
      if (audioCtxRef.current) {
        const sr = 44100;
        const dur = 30.0;
        const buf = audioCtxRef.current.createBuffer(2, Math.floor(sr * dur), sr);
        return buf;
      }
      return null;
    }
  };

  // Fast Client-Side Metadata Analyzer (BPM & Camelot Key)
  const analyzeTrackMetadata = useCallback(async (file: File | null, deck: 'A' | 'B', preloadedBuffer?: AudioBuffer | null) => {
    if (deck === 'A') setIsAnalyzingA(true);
    else setIsAnalyzingB(true);

    try {
      let buffer = preloadedBuffer || (deck === 'A' ? bufferARef.current : bufferBRef.current);
      if (!buffer && file) {
        buffer = await decodeFileToBuffer(file);
      }

      if (buffer) {
        const detectedBpm = detectBpmClient(buffer);
        const detectedKey = detectCamelotKeyClient(buffer);

        if (deck === 'A') {
          setDeckABpmState(detectedBpm);
          deckABpmRef.current = detectedBpm;
          setDeckAKey(detectedKey);
        } else {
          setDeckBBpmState(detectedBpm);
          deckBBpmRef.current = detectedBpm;
          setDeckBKey(detectedKey);
        }
      }
    } catch (err) {
      console.warn(`Track analysis fallback for Deck ${deck}:`, err);
    } finally {
      if (deck === 'A') setIsAnalyzingA(false);
      else setIsAnalyzingB(false);
    }
  }, []);

  // Execute Track 3 Offline Mixdown safely without throwing AbortError
  const executeTrack3Mixdown = useCallback(async () => {
    if (!wsTrack3Ref.current) return;

    const currentGen = ++loadGenerationRef.current;
    setIsProcessingFX(true);

    try {
      const wavBlob = await mixTracksToWavBlob(
        bufferARef.current,
        bufferBRef.current,
        deckARegionRef.current,
        deckBRegionRef.current,
        isolationClarityRef.current,
        vocalSuppressRef.current,
        keySyncRef.current,
        deckABpmRef.current,
        deckBBpmRef.current
      );

      if (currentGen !== loadGenerationRef.current) return;

      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
      }

      const blobUrl = URL.createObjectURL(wavBlob);
      previewBlobUrlRef.current = blobUrl;

      if (wsTrack3Ref.current && currentGen === loadGenerationRef.current) {
        try {
          wsTrack3Ref.current.empty();
          await wsTrack3Ref.current.load(blobUrl);
        } catch (loadErr: any) {
          if (loadErr?.name !== 'AbortError') {
            console.warn('Track 3 load error:', loadErr);
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Track 3 mixdown error:', err);
      }
    } finally {
      if (currentGen === loadGenerationRef.current) {
        setIsProcessingFX(false);
      }
    }
  }, []);

  // Debounced Mixdown Trigger (500ms)
  const debouncedTriggerMixdown = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsProcessingFX(true);
    debounceTimerRef.current = setTimeout(() => {
      executeTrack3Mixdown();
    }, 500);
  }, [executeTrack3Mixdown]);

  // SOTA 2-Stage Deep AI Pipeline: Asynchronous Job Dispatch & Polling
  const isolateAcapellaWithRoformer = useCallback(async () => {
    setIsExtractingVocal(true);
    setVocalExtractError(null);

    try {
      const formData = new FormData();
      if (fileA) {
        formData.append('file', fileA);
      }

      // 1. Dispatch to /api/jobs/extract
      const res = await fetch('/api/jobs/extract', {
        method: 'POST',
        body: fileA ? formData : undefined,
      });

      if (!res.ok && res.status !== 202) {
        throw new Error(`Extraction returned HTTP ${res.status}`);
      }

      const jobData = await res.json();
      const jobId = jobData.jobId;

      if (!jobId) {
        throw new Error('No jobId received from extraction endpoint.');
      }

      // 2. Poll /api/jobs/status every 2 seconds
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 60;

      while (!isComplete && attempts < maxAttempts) {
        attempts++;
        await new Promise((r) => setTimeout(r, 2000));

        try {
          const statusRes = await fetch(`/api/jobs/status?id=${jobId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();

            if (statusData.status === 'complete' && statusData.audioUrl) {
              isComplete = true;
              const downloadRes = await fetch(statusData.audioUrl);
              if (downloadRes.ok) {
                const blob = await downloadRes.blob();
                const blobUrl = URL.createObjectURL(blob);

                if (wsARef.current) {
                  try {
                    wsARef.current.empty();
                    await wsARef.current.load(blobUrl);
                  } catch (e: any) {
                    if (e?.name !== 'AbortError') console.warn('Deck A reload error:', e);
                  }
                }

                if (!audioCtxRef.current) {
                  audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const arrayBuffer = await blob.arrayBuffer();
                const decoded = await audioCtxRef.current.decodeAudioData(arrayBuffer);
                if (decoded && decoded.length > 0) {
                  bufferARef.current = decoded;
                  setIsAcapellaIsolated(true);
                  debouncedTriggerMixdown();
                }
              }
              break;
            } else if (statusData.status === 'error') {
              throw new Error(statusData.error || 'Deep extraction failed.');
            }
          }
        } catch (pollErr: any) {
          console.warn(`[MultiTrackAudio] Polling attempt ${attempts} warning:`, pollErr);
        }
      }

      if (!isComplete) {
        throw new Error('Neural extraction job timed out after 120 seconds.');
      }
    } catch (err: any) {
      console.warn('[MultiTrackAudio] Extraction fallback applied:', err);
      setIsAcapellaIsolated(false);
      setVocalExtractError(
        err?.message || 'True isolation requires REPLICATE_API_TOKEN. Using clean original audio.'
      );
    } finally {
      setIsExtractingVocal(false);
    }
  }, [fileA, debouncedTriggerMixdown]);

  // Setup Web Audio BiquadFilterNodes & GainNodes for both decks
  const setupAudioGraph = useCallback((wsA: WaveSurfer, wsB: WaveSurfer) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;

    const mediaElA = wsA.getMediaElement();
    if (mediaElA && !(mediaElA as any).__wsAttached) {
      try {
        const sourceA = ctx.createMediaElementSource(mediaElA);
        const filterA = ctx.createBiquadFilter();
        filterA.type = 'highpass';
        filterA.frequency.setValueAtTime(20 + (isolationClarityRef.current / 100) * 380, ctx.currentTime);

        const gainA = ctx.createGain();
        gainA.gain.setValueAtTime(volumeARef.current / 100, ctx.currentTime);

        sourceA.connect(filterA);
        filterA.connect(gainA);
        gainA.connect(ctx.destination);

        filterARef.current = filterA;
        gainNodeARef.current = gainA;
        (mediaElA as any).__wsAttached = true;
      } catch (e) {}
    }

    const mediaElB = wsB.getMediaElement();
    if (mediaElB && !(mediaElB as any).__wsAttached) {
      try {
        const sourceB = ctx.createMediaElementSource(mediaElB);
        const filterB = ctx.createBiquadFilter();
        filterB.type = 'peaking';
        filterB.frequency.setValueAtTime(1500, ctx.currentTime);
        filterB.Q.setValueAtTime(1.5, ctx.currentTime);
        filterB.gain.setValueAtTime(-((vocalSuppressRef.current / 100) * 15.0), ctx.currentTime);

        const gainB = ctx.createGain();
        gainB.gain.setValueAtTime(volumeBRef.current / 100, ctx.currentTime);

        sourceB.connect(filterB);
        filterB.connect(gainB);
        gainB.connect(ctx.destination);

        filterBRef.current = filterB;
        gainNodeBRef.current = gainB;
        (mediaElB as any).__wsAttached = true;
      } catch (e) {}
    }
  }, []);

  // Direct Node Mutators
  const handleVolumeAChange = useCallback((val: number) => {
    volumeARef.current = val;
    setVolumeAState(val);
    if (gainNodeARef.current && audioCtxRef.current) {
      gainNodeARef.current.gain.setValueAtTime(val / 100, audioCtxRef.current.currentTime);
    }
    if (wsARef.current) {
      wsARef.current.setVolume(val / 100);
    }
    debouncedTriggerMixdown();
  }, [debouncedTriggerMixdown]);

  const handleVolumeBChange = useCallback((val: number) => {
    volumeBRef.current = val;
    setVolumeBState(val);
    if (gainNodeBRef.current && audioCtxRef.current) {
      gainNodeBRef.current.gain.setValueAtTime(val / 100, audioCtxRef.current.currentTime);
    }
    if (wsBRef.current) {
      wsBRef.current.setVolume(val / 100);
    }
    debouncedTriggerMixdown();
  }, [debouncedTriggerMixdown]);

  const handleIsolationClarityChange = useCallback((val: number) => {
    isolationClarityRef.current = val;
    setIsolationClarityAState(val);
    if (filterARef.current && audioCtxRef.current) {
      const freq = 20 + (val / 100) * 380;
      filterARef.current.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
    }
    debouncedTriggerMixdown();
  }, [debouncedTriggerMixdown]);

  const handleVocalSuppressChange = useCallback((val: number) => {
    vocalSuppressRef.current = val;
    setVocalSuppressB(val);
    if (filterBRef.current && audioCtxRef.current) {
      const gainVal = -((val / 100) * 15.0);
      filterBRef.current.gain.setValueAtTime(gainVal, audioCtxRef.current.currentTime);
    }
    debouncedTriggerMixdown();
  }, [debouncedTriggerMixdown]);

  const setDeckABpm = useCallback((bpm: number) => {
    deckABpmRef.current = bpm;
    setDeckABpmState(bpm);
    debouncedTriggerMixdown();
  }, [debouncedTriggerMixdown]);

  const setDeckBBpm = useCallback((bpm: number) => {
    deckBBpmRef.current = bpm;
    setDeckBBpmState(bpm);
    debouncedTriggerMixdown();
  }, [debouncedTriggerMixdown]);

  const setIsKeySyncOn = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setIsKeySyncOnState((prev) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      keySyncRef.current = nextVal;
      return nextVal;
    });
    debouncedTriggerMixdown();
  }, [debouncedTriggerMixdown]);

  // True Serato-Style Sync: Key Only
  const syncKeyToDeckB = useCallback(() => {
    setDeckAKey(deckBKey);
    keySyncRef.current = true;
    debouncedTriggerMixdown();
  }, [deckBKey, debouncedTriggerMixdown]);

  // True Serato-Style Sync: BPM / Playback Rate Ratio
  const syncBpmToDeckB = useCallback(() => {
    const targetBpm = deckBBpmRef.current;
    const sourceBpm = deckABpmRef.current;
    const ratio = sourceBpm > 0 ? targetBpm / sourceBpm : 1.0;

    deckABpmRef.current = targetBpm;
    setDeckABpmState(targetBpm);

    if (wsARef.current) {
      try {
        wsARef.current.setPlaybackRate(ratio);
      } catch (e) {}
    }

    debouncedTriggerMixdown();
  }, [debouncedTriggerMixdown]);

  // Volume synchronization
  const updateVolumes = useCallback(() => {
    if (!wsARef.current || !wsBRef.current) return;

    if (isSoloA) {
      wsARef.current.setVolume(volumeARef.current / 100);
      wsBRef.current.setVolume(0.0);
    } else if (isSoloB) {
      wsARef.current.setVolume(0.0);
      wsBRef.current.setVolume(volumeBRef.current / 100);
    } else {
      wsARef.current.setVolume(isMutedA ? 0.0 : volumeARef.current / 100);
      wsBRef.current.setVolume(isMutedB ? 0.0 : volumeBRef.current / 100);
    }
  }, [isMutedA, isMutedB, isSoloA, isSoloB]);

  useEffect(() => {
    updateVolumes();
  }, [updateVolumes]);

  // -------------------------------------------------------------
  // DECOUPLED WAVESURFER INITIALIZATION
  // -------------------------------------------------------------
  useEffect(() => {
    if (!deckAContainerRef.current || !deckBContainerRef.current) return;

    try {
      if (wsARef.current) {
        if (wsARef.current.isPlaying()) wsARef.current.pause();
        wsARef.current.destroy();
      }
      if (wsBRef.current) {
        if (wsBRef.current.isPlaying()) wsBRef.current.pause();
        wsBRef.current.destroy();
      }
      if (wsTrack3Ref.current) {
        if (wsTrack3Ref.current.isPlaying()) wsTrack3Ref.current.pause();
        wsTrack3Ref.current.destroy();
      }
    } catch (e) {}

    const regA = RegionsPlugin.create();
    const regB = RegionsPlugin.create();
    regionsARef.current = regA;
    regionsBRef.current = regB;

    // Deck A WaveSurfer
    const wsA = WaveSurfer.create({
      container: deckAContainerRef.current,
      waveColor: '#e4e4e7',
      progressColor: '#ec4899',
      cursorColor: '#ec4899',
      cursorWidth: 2,
      height: 70,
      barWidth: 2,
      barGap: 1.5,
      barRadius: 2,
      plugins: [regA],
    });

    // Deck B WaveSurfer
    const wsB = WaveSurfer.create({
      container: deckBContainerRef.current,
      waveColor: '#e4e4e7',
      progressColor: '#27272a',
      cursorColor: '#ec4899',
      cursorWidth: 2,
      height: 70,
      barWidth: 2,
      barGap: 1.5,
      barRadius: 2,
      plugins: [regB],
    });

    wsARef.current = wsA;
    wsBRef.current = wsB;

    // Track 3 WaveSurfer (Mashup Preview Bus)
    if (track3ContainerRef.current) {
      const ws3 = WaveSurfer.create({
        container: track3ContainerRef.current,
        waveColor: '#fbcfe8',
        progressColor: '#db2777',
        cursorColor: '#db2777',
        cursorWidth: 2,
        height: 60,
        barWidth: 2,
        barGap: 1.5,
        barRadius: 2,
      });
      wsTrack3Ref.current = ws3;

      ws3.on('play', () => setIsPlayingTrack3(true));
      ws3.on('pause', () => setIsPlayingTrack3(false));
      ws3.on('finish', () => setIsPlayingTrack3(false));
      ws3.on('timeupdate', (t) => setCurrentTimeTrack3(t));
      ws3.on('ready', (dur) => setDurationTrack3(dur));
      ws3.on('error', (err) => console.warn('Track 3 WaveSurfer handled error:', err));
    }

    // Deck A Events
    wsA.on('play', () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      setIsPlayingA(true);
    });
    wsA.on('pause', () => setIsPlayingA(false));
    wsA.on('finish', () => setIsPlayingA(false));
    wsA.on('timeupdate', (t) => setCurrentTimeA(t));
    wsA.on('seeking', (t) => setCurrentTimeA(t));
    wsA.on('error', (err) => console.warn('Deck A WaveSurfer handled error:', err));
    wsA.on('ready', (dur) => {
      const trackDur = dur || wsA.getDuration();
      if (trackDur > 600) {
        console.warn(`Deck A upload failed: Track exceeds the 10-minute duration limit (${trackDur.toFixed(1)}s)`);
        wsA.empty();
        bufferARef.current = null;
        setDurationA(0);
        if (typeof window !== 'undefined') {
          alert('Upload failed: Track exceeds the 10-minute duration limit.');
        }
        return;
      }

      setDurationA(trackDur);
      setMasterDuration((prev) => Math.max(prev, trackDur));
      setupAudioGraph(wsA, wsB);
      regA.clearRegions();
      regA.addRegion({
        start: deckARegionRef.current[0],
        end: Math.min(trackDur, deckARegionRef.current[1]),
        color: 'rgba(236, 72, 153, 0.22)',
        drag: true,
        resize: true,
      });
    });

    // Deck B Events
    wsB.on('play', () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      setIsPlayingB(true);
    });
    wsB.on('pause', () => setIsPlayingB(false));
    wsB.on('finish', () => setIsPlayingB(false));
    wsB.on('timeupdate', (t) => setCurrentTimeB(t));
    wsB.on('seeking', (t) => setCurrentTimeB(t));
    wsB.on('error', (err) => console.warn('Deck B WaveSurfer handled error:', err));
    wsB.on('ready', (dur) => {
      const trackDur = dur || wsB.getDuration();
      if (trackDur > 600) {
        console.warn(`Deck B upload failed: Track exceeds the 10-minute duration limit (${trackDur.toFixed(1)}s)`);
        wsB.empty();
        bufferBRef.current = null;
        setDurationB(0);
        if (typeof window !== 'undefined') {
          alert('Upload failed: Track exceeds the 10-minute duration limit.');
        }
        return;
      }

      setDurationB(trackDur);
      setMasterDuration((prev) => Math.max(prev, trackDur));
      setupAudioGraph(wsA, wsB);
      regB.clearRegions();
      regB.addRegion({
        start: deckBRegionRef.current[0],
        end: Math.min(trackDur, deckBRegionRef.current[1]),
        color: 'rgba(39, 39, 42, 0.22)',
        drag: true,
        resize: true,
      });
    });

    // Region Listeners
    regA.on('region-updated', (region: any) => {
      const newRegionA: [number, number] = [
        Math.round(region.start * 10) / 10,
        Math.round(region.end * 10) / 10,
      ];
      deckARegionRef.current = newRegionA;
      setDeckARegionState(newRegionA);
      debouncedTriggerMixdown();
    });

    regB.on('region-updated', (region: any) => {
      const newRegionB: [number, number] = [
        Math.round(region.start * 10) / 10,
        Math.round(region.end * 10) / 10,
      ];
      deckBRegionRef.current = newRegionB;
      setDeckBRegionState(newRegionB);
      debouncedTriggerMixdown();
    });

    // Load Audio and Populate Buffers + Trigger Fast Client Metadata Detection
    const loadTracks = async () => {
      if (fileA) {
        wsA.load(URL.createObjectURL(fileA));
        const bufA = await decodeFileToBuffer(fileA);
        bufferARef.current = bufA;
        analyzeTrackMetadata(fileA, 'A', bufA);
      } else {
        const demoA = '/demo/demo_turn_on_the_lights.mp3';
        wsA.load(demoA).catch(() => {});
        const bufA = await decodeUrlToBuffer(demoA);
        bufferARef.current = bufA;
        analyzeTrackMetadata(null, 'A', bufA);
      }

      if (fileB) {
        wsB.load(URL.createObjectURL(fileB));
        const bufB = await decodeFileToBuffer(fileB);
        bufferBRef.current = bufB;
        analyzeTrackMetadata(fileB, 'B', bufB);
      } else {
        const demoB = '/demo/demo_drugs_from_amsterdam.mp3';
        wsB.load(demoB).catch(() => {});
        const bufB = await decodeUrlToBuffer(demoB);
        bufferBRef.current = bufB;
        analyzeTrackMetadata(null, 'B', bufB);
      }

      executeTrack3Mixdown();
    };

    loadTracks();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      try {
        if (wsA) {
          if (wsA.isPlaying()) wsA.pause();
          wsA.destroy();
        }
      } catch (e) {}
      try {
        if (wsB) {
          if (wsB.isPlaying()) wsB.pause();
          wsB.destroy();
        }
      } catch (e) {}
      try {
        if (wsTrack3Ref.current) {
          if (wsTrack3Ref.current.isPlaying()) wsTrack3Ref.current.pause();
          wsTrack3Ref.current.destroy();
        }
      } catch (e) {}
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
      wsARef.current = null;
      wsBRef.current = null;
      wsTrack3Ref.current = null;
    };
  }, [fileA, fileB, analyzeTrackMetadata]);

  // True Toggle: Deck A Play / Pause
  const togglePlayA = useCallback(() => {
    if (!wsARef.current) return;
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (isPlayingA) {
      wsARef.current.pause();
    } else {
      wsARef.current.play();
    }
  }, [isPlayingA]);

  // True Toggle: Deck B Play / Pause
  const togglePlayB = useCallback(() => {
    if (!wsBRef.current) return;
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (isPlayingB) {
      wsBRef.current.pause();
    } else {
      wsBRef.current.play();
    }
  }, [isPlayingB]);

  // True Toggle: Track 3 Mashup Preview Play / Pause
  const togglePlayTrack3 = useCallback(() => {
    if (!wsTrack3Ref.current) return;
    if (isPlayingTrack3) {
      wsTrack3Ref.current.pause();
    } else {
      wsTrack3Ref.current.play();
    }
  }, [isPlayingTrack3]);

  // True Toggle: Master Dual-Deck Global Transport Play / Pause
  const toggleGlobalPlay = useCallback(() => {
    if (!wsARef.current || !wsBRef.current) return;
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (isGlobalPlaying || isPlayingA || isPlayingB) {
      wsARef.current.pause();
      wsBRef.current.pause();
      setIsGlobalPlaying(false);
    } else {
      const seekPos = Math.max(currentTimeA, currentTimeB);
      wsARef.current.setTime(seekPos);
      wsBRef.current.setTime(seekPos);
      updateVolumes();
      wsARef.current.play();
      wsBRef.current.play();
      setIsGlobalPlaying(true);
    }
  }, [isGlobalPlaying, isPlayingA, isPlayingB, currentTimeA, currentTimeB, updateVolumes]);

  // Decoupled Scrubbing
  const seekDeckA = useCallback((timeSec: number) => {
    setCurrentTimeA(timeSec);
    if (wsARef.current) wsARef.current.setTime(timeSec);
  }, []);

  const seekDeckB = useCallback((timeSec: number) => {
    setCurrentTimeB(timeSec);
    if (wsBRef.current) wsBRef.current.setTime(timeSec);
  }, []);

  const seekGlobal = useCallback((timeSec: number) => {
    setCurrentTimeA(timeSec);
    setCurrentTimeB(timeSec);
    if (wsARef.current) wsARef.current.setTime(timeSec);
    if (wsBRef.current) wsBRef.current.setTime(timeSec);
  }, []);

  // Mute & Solo
  const toggleMuteA = useCallback(() => setIsMutedA((prev) => !prev), []);
  const toggleMuteB = useCallback(() => setIsMutedB((prev) => !prev), []);
  const toggleSoloA = useCallback(() => {
    setIsSoloA((prev) => {
      if (!prev) setIsSoloB(false);
      return !prev;
    });
  }, []);
  const toggleSoloB = useCallback(() => {
    setIsSoloB((prev) => {
      if (!prev) setIsSoloA(false);
      return !prev;
    });
  }, []);

  // Programmatic Region Setter (AI Suggestion)
  const setRegionsDirectly = useCallback(
    (startA: number, endA: number, startB: number, endB: number) => {
      deckARegionRef.current = [startA, endA];
      deckBRegionRef.current = [startB, endB];
      setDeckARegionState([startA, endA]);
      setDeckBRegionState([startB, endB]);

      if (regionsARef.current) {
        regionsARef.current.clearRegions();
        regionsARef.current.addRegion({
          start: startA,
          end: endA,
          color: 'rgba(236, 72, 153, 0.22)',
          drag: true,
          resize: true,
        });
      }

      if (regionsBRef.current) {
        regionsBRef.current.clearRegions();
        regionsBRef.current.addRegion({
          start: startB,
          end: endB,
          color: 'rgba(39, 39, 42, 0.22)',
          drag: true,
          resize: true,
        });
      }

      debouncedTriggerMixdown();
    },
    [debouncedTriggerMixdown]
  );

  return {
    isPlayingA,
    isPlayingB,
    isPlayingTrack3,
    isGlobalPlaying,
    currentTimeA,
    currentTimeB,
    currentTimeTrack3,
    durationA,
    durationB,
    durationTrack3,
    masterDuration,
    isMutedA,
    isMutedB,
    isSoloA,
    isSoloB,
    volumeA,
    volumeB,
    isolationClarityA,
    vocalSuppressB,
    isProcessingFX,
    isExtractingVocal,
    isAcapellaIsolated,
    vocalExtractError,
    setVocalExtractError,
    deckAKey,
    deckABpm,
    deckBKey,
    deckBBpm,
    isAnalyzingA,
    isAnalyzingB,
    isKeySyncOn,
    deckARegion,
    deckBRegion,
    setDeckAKey,
    setDeckABpm,
    setDeckBKey,
    setDeckBBpm,
    setIsKeySyncOn,
    syncKeyToDeckB,
    syncBpmToDeckB,
    isolateAcapellaWithRoformer,
    handleVolumeAChange,
    handleVolumeBChange,
    handleIsolationClarityChange,
    handleVocalSuppressChange,
    analyzeTrackMetadata,
    togglePlayA,
    togglePlayB,
    togglePlayTrack3,
    toggleGlobalPlay,
    seekDeckA,
    seekDeckB,
    seekGlobal,
    toggleMuteA,
    toggleMuteB,
    toggleSoloA,
    toggleSoloB,
    setDeckARegion: setDeckARegionState,
    setDeckBRegion: setDeckBRegionState,
    setRegionsDirectly,
  };
}
