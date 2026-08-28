'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Play,
  Pause,
  Download,
  Sparkles,
  CheckCircle,
  FileAudio,
  RotateCcw,
  Dices,
  Headphones,
  ShieldCheck,
  Activity,
  Plus,
  Scissors,
  Wand2,
  Flame,
  Snowflake,
  FastForward,
  Check,
  Disc3,
  Sliders,
  Volume2,
  VolumeX,
  Layers,
  ChevronRight,
  Maximize2,
  Lock,
  Zap,
  SlidersHorizontal,
  MoveHorizontal,
  Music,
  Square
} from 'lucide-react';
import { webAudioEngine, ReferenceBlueprint } from '../lib/webAudioEngine';

interface ReconstructionStage {
  step: number;
  label: string;
  percent: number;
}

const RECONSTRUCTION_STAGES: ReconstructionStage[] = [
  { step: 1, label: 'BS-Roformer Studio-Grade Vocal Extraction (100% Clean)', percent: 25 },
  { step: 2, label: 'Absolute Groove Key-Lock (Formant-Preserved Tuning)', percent: 50 },
  { step: 3, label: 'Enhanced VAD Spectral Flux Gap Surgeon', percent: 75 },
  { step: 4, label: 'Spotify Pedalboard Master Bus Glue (-0.2 dB TP)', percent: 100 },
];

export default function DJStudioPage() {
  // Track 1 & Track 2 States
  const [track1File, setTrack1File] = useState<File | null>(null);
  const [track1Name, setTrack1Name] = useState<string>('Fred again.. - Turn On The Lights');
  const [track2File, setTrack2File] = useState<File | null>(null);
  const [track2Name, setTrack2Name] = useState<string>('Mau P - Drugs From Amsterdam');

  // NLE Timeline State (Deck A & Deck B in/out loop regions in seconds)
  const [deckAInSec, setDeckAInSec] = useState<number>(7.6);
  const [deckAOutSec, setDeckAOutSec] = useState<number>(30.5);
  const [deckBInSec, setDeckBInSec] = useState<number>(15.2);
  const [deckBOutSec, setDeckBOutSec] = useState<number>(45.7);

  // Live Mute and Solo States for NLE Track Headers
  const [isMutedA, setIsMutedA] = useState<boolean>(false);
  const [isMutedB, setIsMutedB] = useState<boolean>(false);
  const [isSoloA, setIsSoloA] = useState<boolean>(false);
  const [isSoloB, setIsSoloB] = useState<boolean>(false);

  // Global Transport State
  const [isGlobalPlaying, setIsGlobalPlaying] = useState<boolean>(false);
  const [globalProgressSec, setGlobalProgressSec] = useState<number>(0);
  const [totalTimelineSec, setTotalTimelineSec] = useState<number>(60);

  // Pre-Flight Compatibility & Absolute Groove Key-Lock State
  const [compatibilityReason, setCompatibilityReason] = useState<string>('Absolute Groove Key-Lock: Deck B Anchor');

  // Cut to the Chase Macro State
  const [cutToTheChase, setCutToTheChase] = useState<boolean>(false);

  // Reference Clip State
  const [refFile, setRefFile] = useState<File | null>(null);
  const [blueprint, setBlueprint] = useState<ReferenceBlueprint>({
    title: 'Reference Arrangement',
    bpm: 126.0,
    dropTime: 15.24,
    buildStartTime: 7.62,
    pauseDurationMs: 500,
    duration: 60.0,
    energyScore: 98,
    waveformBins: [0.2, 0.3, 0.5, 0.7, 0.9, 1.0, 0.95, 0.9, 0.85, 0.6, 0.4, 0.2],
  });

  // Asynchronous Deep Reconstruction Pipeline State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [mashupReady, setMashupReady] = useState<boolean>(false);

  // Preview Audition State
  const [playingPreviewId, setPlayingPreviewId] = useState<number | null>(null);
  const [previewProgress, setPreviewProgress] = useState<number>(0);
  const [selectedPreviewId, setSelectedPreviewId] = useState<number>(1);

  // Full Song & Infinite Extend & Refine State
  const [fullSongReady, setFullSongReady] = useState<boolean>(false);
  const [isPlayingFull, setIsPlayingFull] = useState<boolean>(false);
  const [fullProgress, setFullProgress] = useState<number>(0);
  const [isExtending, setIsExtending] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isMasteredRefined, setIsMasteredRefined] = useState<boolean>(false);
  const [refinementVersion, setRefinementVersion] = useState<number>(1);
  const [refineActions, setRefineActions] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isExportingRegion, setIsExportingRegion] = useState<boolean>(false);

  // Live Feedback Taps & Skipped Zones
  const [hypeTaps, setHypeTaps] = useState<number[]>([]);
  const [negativeTaps, setNegativeTaps] = useState<number[]>([]);
  const [skippedZones, setSkippedZones] = useState<[number, number][]>([]);

  // Dragging state for NLE regions
  const [activeDrag, setActiveDrag] = useState<{
    deck: 'A' | 'B';
    type: 'in' | 'out' | 'body';
    startX: number;
    initialIn: number;
    initialOut: number;
  } | null>(null);

  const timelineCanvasRef = useRef<HTMLDivElement | null>(null);
  const masterWaveformRef = useRef<HTMLDivElement | null>(null);

  // --- Spacebar Global Transport Keybinding ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        toggleMasterTransport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // --- Handlers ---
  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRefFile(file);
      try {
        const analyzed = await webAudioEngine.analyzeAndListenToReference(file);
        setBlueprint(analyzed);
      } catch (err) {
        console.warn('Reference analysis error:', err);
      }
    }
  };

  const handleSurpriseMe = () => {
    setRefFile(null);
    const surprise = webAudioEngine.setSurpriseReference();
    setBlueprint(surprise);
  };

  const handleTrack1Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTrack1File(file);
      setTrack1Name(file.name);
      try {
        const buffer = await webAudioEngine.loadFileToBuffer(file);
        webAudioEngine.track1Buffer = buffer;
      } catch (err) {
        console.warn('Could not decode Track 1:', err);
      }
    }
  };

  const handleTrack2Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTrack2File(file);
      setTrack2Name(file.name);
      try {
        const buffer = await webAudioEngine.loadFileToBuffer(file);
        webAudioEngine.track2Buffer = buffer;
      } catch (err) {
        console.warn('Could not decode Track 2:', err);
      }
    }
  };

  // --- NLE Live Mute & Solo Handlers ---
  const toggleMuteDeckA = () => {
    const nextMuted = !isMutedA;
    setIsMutedA(nextMuted);
    webAudioEngine.setDeckGain('A', nextMuted ? 0.0 : 1.0);
  };

  const toggleMuteDeckB = () => {
    const nextMuted = !isMutedB;
    setIsMutedB(nextMuted);
    webAudioEngine.setDeckGain('B', nextMuted ? 0.0 : 1.0);
  };

  const toggleSoloDeckA = () => {
    if (isSoloA) {
      setIsSoloA(false);
      webAudioEngine.setDeckGain('A', isMutedA ? 0.0 : 1.0);
      webAudioEngine.setDeckGain('B', isMutedB ? 0.0 : 1.0);
    } else {
      setIsSoloA(true);
      setIsSoloB(false);
      webAudioEngine.setDeckGain('A', 1.0);
      webAudioEngine.setDeckGain('B', 0.0);
    }
  };

  const toggleSoloDeckB = () => {
    if (isSoloB) {
      setIsSoloB(false);
      webAudioEngine.setDeckGain('A', isMutedA ? 0.0 : 1.0);
      webAudioEngine.setDeckGain('B', isMutedB ? 0.0 : 1.0);
    } else {
      setIsSoloB(true);
      setIsSoloA(false);
      webAudioEngine.setDeckGain('A', 0.0);
      webAudioEngine.setDeckGain('B', 1.0);
    }
  };

  // --- Synchronized NLE Master Transport Play/Pause ---
  const toggleMasterTransport = () => {
    if (isGlobalPlaying) {
      webAudioEngine.stop();
      setIsGlobalPlaying(false);
    } else {
      setIsGlobalPlaying(true);
      const effectiveMuteA = isSoloB || (isMutedA && !isSoloA);
      const effectiveMuteB = isSoloA || (isMutedB && !isSoloB);

      webAudioEngine.playSynchronizedDualDecks(
        globalProgressSec,
        effectiveMuteA,
        effectiveMuteB,
        totalTimelineSec,
        (curr) => setGlobalProgressSec(curr),
        () => {
          setIsGlobalPlaying(false);
          setGlobalProgressSec(0);
        }
      );
    }
  };

  // --- Scrubber & Timeline Seek ---
  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineCanvasRef.current) return;
    const rect = timelineCanvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = Math.round(ratio * totalTimelineSec * 10) / 10;

    setGlobalProgressSec(seekTime);
    if (isGlobalPlaying) {
      webAudioEngine.seekTo(seekTime);
    }
  };

  // --- Direct On-Waveform Region Drag & Trim Handlers ---
  const handleMouseDownRegion = (
    e: React.MouseEvent,
    deck: 'A' | 'B',
    type: 'in' | 'out' | 'body'
  ) => {
    e.stopPropagation();
    setActiveDrag({
      deck,
      type,
      startX: e.clientX,
      initialIn: deck === 'A' ? deckAInSec : deckBInSec,
      initialOut: deck === 'A' ? deckAOutSec : deckBOutSec,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeDrag || !timelineCanvasRef.current) return;
      const rect = timelineCanvasRef.current.getBoundingClientRect();
      const deltaX = e.clientX - activeDrag.startX;
      const deltaSec = (deltaX / rect.width) * totalTimelineSec;

      if (activeDrag.deck === 'A') {
        if (activeDrag.type === 'in') {
          const nextIn = Math.max(0, Math.min(deckAOutSec - 1.5, activeDrag.initialIn + deltaSec));
          setDeckAInSec(Math.round(nextIn * 10) / 10);
        } else if (activeDrag.type === 'out') {
          const nextOut = Math.min(totalTimelineSec, Math.max(deckAInSec + 1.5, activeDrag.initialOut + deltaSec));
          setDeckAOutSec(Math.round(nextOut * 10) / 10);
        } else if (activeDrag.type === 'body') {
          const dur = activeDrag.initialOut - activeDrag.initialIn;
          let nextIn = activeDrag.initialIn + deltaSec;
          let nextOut = activeDrag.initialOut + deltaSec;
          if (nextIn < 0) {
            nextIn = 0;
            nextOut = dur;
          }
          if (nextOut > totalTimelineSec) {
            nextOut = totalTimelineSec;
            nextIn = totalTimelineSec - dur;
          }
          setDeckAInSec(Math.round(nextIn * 10) / 10);
          setDeckAOutSec(Math.round(nextOut * 10) / 10);
        }
      } else {
        if (activeDrag.type === 'in') {
          const nextIn = Math.max(0, Math.min(deckBOutSec - 1.5, activeDrag.initialIn + deltaSec));
          setDeckBInSec(Math.round(nextIn * 10) / 10);
        } else if (activeDrag.type === 'out') {
          const nextOut = Math.min(totalTimelineSec, Math.max(deckBInSec + 1.5, activeDrag.initialOut + deltaSec));
          setDeckBOutSec(Math.round(nextOut * 10) / 10);
        } else if (activeDrag.type === 'body') {
          const dur = activeDrag.initialOut - activeDrag.initialIn;
          let nextIn = activeDrag.initialIn + deltaSec;
          let nextOut = activeDrag.initialOut + deltaSec;
          if (nextIn < 0) {
            nextIn = 0;
            nextOut = dur;
          }
          if (nextOut > totalTimelineSec) {
            nextOut = totalTimelineSec;
            nextIn = totalTimelineSec - dur;
          }
          setDeckBInSec(Math.round(nextIn * 10) / 10);
          setDeckBOutSec(Math.round(nextOut * 10) / 10);
        }
      }
    };

    const handleMouseUp = () => {
      setActiveDrag(null);
    };

    if (activeDrag) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDrag, deckAInSec, deckAOutSec, deckBInSec, deckBOutSec, totalTimelineSec]);

  const handleStartDeepReconstruction = () => {
    webAudioEngine.stop();
    webAudioEngine.isCutToTheChase = cutToTheChase;
    webAudioEngine.manualDeckARegion = [deckAInSec, deckAOutSec];
    webAudioEngine.manualDeckBRegion = [deckBInSec, deckBOutSec];

    setIsProcessing(true);
    setMashupReady(false);
    setFullSongReady(false);
    setIsMasteredRefined(false);
    setRefinementVersion(1);
    setRefineActions([]);
    setHypeTaps([]);
    setNegativeTaps([]);
    setSkippedZones([]);
    setCurrentStageIdx(0);
    setProgressPercent(10);

    const stageInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 95) {
          clearInterval(stageInterval);
          setTimeout(() => {
            setIsProcessing(false);
            setMashupReady(true);
            setProgressPercent(100);
            document.getElementById('previews-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 500);
          return 100;
        }

        const nextPercent = prev + 6;
        if (nextPercent >= 75) setCurrentStageIdx(3);
        else if (nextPercent >= 50) setCurrentStageIdx(2);
        else if (nextPercent >= 25) setCurrentStageIdx(1);

        return nextPercent;
      });
    }, 150);
  };

  const handleTogglePreviewPlay = (id: number) => {
    if (playingPreviewId === id) {
      webAudioEngine.stop();
      setPlayingPreviewId(null);
      setPreviewProgress(0);
    } else {
      setPlayingPreviewId(id);
      setSelectedPreviewId(id);
      setPreviewProgress(0);

      webAudioEngine.playMashup(
        id,
        15,
        0,
        (curr) => setPreviewProgress(curr),
        () => {
          setPlayingPreviewId(null);
          setPreviewProgress(0);
        }
      );
    }
  };

  const handleMakeFullSong = (id: number, duration: number = 60) => {
    webAudioEngine.stop();
    setSelectedPreviewId(id);
    const dur = cutToTheChase ? 30 : duration;
    setTotalTimelineSec(dur);
    setFullSongReady(true);
    setIsPlayingFull(false);
    setFullProgress(0);

    setTimeout(() => {
      document.getElementById('full-player-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleToggleFullPlay = () => {
    if (isPlayingFull) {
      webAudioEngine.stop();
      setIsPlayingFull(false);
    } else {
      setIsPlayingFull(true);
      webAudioEngine.playMashup(
        selectedPreviewId,
        totalTimelineSec,
        fullProgress,
        (curr) => setFullProgress(curr),
        () => {
          setIsPlayingFull(false);
          setFullProgress(0);
        }
      );
    }
  };

  const handleMasterScrubberSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!masterWaveformRef.current) return;
    const rect = masterWaveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = Math.round(ratio * totalTimelineSec * 10) / 10;
    
    if (seekTime > fullProgress + 1.5) {
      const skipStartMs = Math.round(fullProgress * 1000);
      const skipEndMs = Math.round(seekTime * 1000);
      setSkippedZones((prev) => [...prev, [skipStartMs, skipEndMs]]);
    }

    setFullProgress(seekTime);
    if (isPlayingFull) {
      webAudioEngine.seekTo(seekTime);
    }
  };

  const handleHypeTap = () => {
    const currentMs = Math.round(fullProgress * 1000);
    setHypeTaps((prev) => [...prev, currentMs]);
  };

  const handleColdTap = () => {
    const currentMs = Math.round(fullProgress * 1000);
    setNegativeTaps((prev) => [...prev, currentMs]);
  };

  const handleInfiniteExtendOneMin = async () => {
    setIsExtending(true);
    const newLength = totalTimelineSec + 60;
    setTimeout(() => {
      setTotalTimelineSec(newLength);
      webAudioEngine.extendMixBySeconds(60);
      setIsExtending(false);
    }, 600);
  };

  const handleRefineAndMaster = async () => {
    webAudioEngine.stop();
    setIsPlayingFull(false);
    setIsRefining(true);

    setTimeout(() => {
      const result = webAudioEngine.refineAndRegenerateFromFeedback({
        hypeTaps,
        negativeTaps,
        skippedZones,
      });

      setTotalTimelineSec(result.newDuration);
      setRefinementVersion(result.iteration);
      setRefineActions(result.actionsTaken);
      setIsMasteredRefined(true);
      setFullProgress(0);

      setHypeTaps([]);
      setNegativeTaps([]);
      setSkippedZones([]);
      setIsRefining(false);

      setIsPlayingFull(true);
      webAudioEngine.playMashup(
        selectedPreviewId,
        result.newDuration,
        0,
        (curr) => setFullProgress(curr),
        () => {
          setIsPlayingFull(false);
          setFullProgress(0);
        }
      );
    }, 1200);
  };

  const handleDownloadMp3 = async () => {
    setIsDownloading(true);
    try {
      const blobUrl = await webAudioEngine.generateDownloadableWav(selectedPreviewId, totalTimelineSec);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `BAMBATA_${totalTimelineSec}s_V${refinementVersion}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportCustomRegion = async () => {
    setIsExportingRegion(true);
    try {
      const blobUrl = await webAudioEngine.exportRegionWav(deckAInSec, deckAOutSec);
      const a = document.createElement('a');
      a.href = blobUrl;
      const clipDur = (deckAOutSec - deckAInSec).toFixed(1);
      a.download = `BAMBATA_Clip_${deckAInSec.toFixed(1)}s_${clipDur}s.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Region export error:', err);
    } finally {
      setIsExportingRegion(false);
    }
  };

  const handleResetAll = () => {
    webAudioEngine.stop();
    setMashupReady(false);
    setFullSongReady(false);
    setPlayingPreviewId(null);
    setIsPlayingFull(false);
    setIsGlobalPlaying(false);
    setIsProcessing(false);
    setIsMasteredRefined(false);
    setRefinementVersion(1);
    setRefineActions([]);
    setHypeTaps([]);
    setNegativeTaps([]);
    setSkippedZones([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clipDurationA = Math.max(1, deckAOutSec - deckAInSec);

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col justify-between selection:bg-pink-500/20 selection:text-pink-600 font-sans tracking-tight">
      
      {/* Sleek Minimalist Studio Header (Light Mode Pink Theme) */}
      <header className="border-b border-zinc-100 py-3.5 px-6 sm:px-10 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-pink-500/30">
              B
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-sm font-extrabold tracking-widest uppercase text-zinc-900">BAMBATA 2.0</span>
              <span className="text-[10px] font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                {compatibilityReason}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Global Transport Master Play/Pause Button */}
            <button
              type="button"
              onClick={toggleMasterTransport}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono text-xs font-bold transition-all shadow-sm ${
                isGlobalPlaying
                  ? 'bg-zinc-900 text-white shadow-zinc-900/20'
                  : 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-500/25'
              }`}
              title="Toggle synchronized playback for both decks (Spacebar)"
            >
              {isGlobalPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              <span>{isGlobalPlaying ? 'Pause NLE' : 'Play NLE'}</span>
              <span className="text-[9px] opacity-70 border border-white/30 px-1 py-0.2 rounded">SPACE</span>
            </button>

            {(mashupReady || fullSongReady) && (
              <button
                type="button"
                onClick={handleResetAll}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                title="Reset session"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Primary NLE Studio Workspace */}
      <main className="max-w-6xl mx-auto px-6 py-6 w-full space-y-6 flex-1">
        
        {/* NLE TWO-COLUMN TIMELINE CONTAINER */}
        <section className="bg-zinc-50 border border-zinc-200/90 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          
          {/* Top Timeline Bar: Transport Controls & Region Metadata */}
          <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-pink-500" />
                NLE Multi-Track Editor
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {globalProgressSec.toFixed(1)}s / {totalTimelineSec.toFixed(0)}s
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="text-pink-600 font-medium">
                Deck A Clip: {deckAInSec.toFixed(1)}s → {deckAOutSec.toFixed(1)}s ({(deckAOutSec - deckAInSec).toFixed(1)}s)
              </span>
              <span className="text-zinc-300">•</span>
              <span className="text-zinc-700 font-medium">
                Deck B Clip: {deckBInSec.toFixed(1)}s → {deckBOutSec.toFixed(1)}s ({(deckBOutSec - deckBInSec).toFixed(1)}s)
              </span>
            </div>
          </div>

          {/* THE NLE STACKED WORKSPACE (Left Headers + Right Timelines) */}
          <div className="flex rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-inner">
            
            {/* LEFT COLUMN: Track Headers (~240px) */}
            <div className="w-56 sm:w-64 border-r border-zinc-200 bg-zinc-50/80 flex flex-col justify-between p-3 divide-y divide-zinc-200 select-none">
              
              {/* Deck A Header */}
              <div className="pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-pink-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-pink-500" />
                    DECK A • HERO VOCAL
                  </span>
                  <span className="text-[8px] font-mono text-pink-600 bg-pink-100/70 px-1.5 py-0.5 rounded">
                    ROFORMER
                  </span>
                </div>

                <div className="text-xs text-zinc-800 font-medium truncate" title={track1Name}>
                  {track1Name}
                </div>

                {/* Deck A Mute & Solo Live Toggle Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={toggleMuteDeckA}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 border transition-all ${
                      isMutedA
                        ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 shadow-xs'
                    }`}
                    title="Mute Deck A audio output"
                  >
                    {isMutedA ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    <span>MUTE</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleSoloDeckA}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 border transition-all ${
                      isSoloA
                        ? 'bg-amber-400 text-zinc-950 border-amber-500 shadow-xs'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 shadow-xs'
                    }`}
                    title="Solo Deck A audio output"
                  >
                    <Headphones className="w-3 h-3" />
                    <span>SOLO</span>
                  </button>
                </div>
              </div>

              {/* Deck B Header */}
              <div className="pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-500" />
                    DECK B • GROOVE &amp; BASS
                  </span>
                  <span className="text-[8px] font-mono text-zinc-700 bg-zinc-200 px-1.5 py-0.5 rounded">
                    KEY ANCHOR
                  </span>
                </div>

                <div className="text-xs text-zinc-800 font-medium truncate" title={track2Name}>
                  {track2Name}
                </div>

                {/* Deck B Mute & Solo Live Toggle Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={toggleMuteDeckB}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 border transition-all ${
                      isMutedB
                        ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 shadow-xs'
                    }`}
                    title="Mute Deck B audio output"
                  >
                    {isMutedB ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    <span>MUTE</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleSoloDeckB}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 border transition-all ${
                      isSoloB
                        ? 'bg-amber-400 text-zinc-950 border-amber-500 shadow-xs'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 shadow-xs'
                    }`}
                    title="Solo Deck B audio output"
                  >
                    <Headphones className="w-3 h-3" />
                    <span>SOLO</span>
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: The Timeline Canvas (flex-grow) */}
            <div
              ref={timelineCanvasRef}
              onClick={handleTimelineScrub}
              className="flex-1 relative flex flex-col justify-between p-3 cursor-pointer select-none overflow-hidden bg-white"
              title="Click anywhere to move playhead • Drag highlighted boxes or handles to trim clips"
            >
              {/* UNIFIED VERTICAL PLAYHEAD (Spans both tracks) */}
              <div
                style={{ left: `${(globalProgressSec / totalTimelineSec) * 100}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-pink-600 shadow-md z-30 pointer-events-none"
              >
                <div className="w-3 h-3 rounded-full bg-pink-500 -translate-x-1/2 -translate-y-1 shadow-sm" />
              </div>

              {/* Time Ruler Markers */}
              <div className="flex justify-between text-[9px] font-mono text-zinc-400 pb-1 border-b border-zinc-100">
                <span>0.0s</span>
                <span>15.0s</span>
                <span>30.0s</span>
                <span>45.0s</span>
                <span>{totalTimelineSec.toFixed(0)}s</span>
              </div>

              {/* TRACK 1 (Deck A) WAVEFORM CANVAS */}
              <div className="h-20 relative flex items-end gap-0.5 py-1">
                
                {/* DIRECT DRAGGABLE REGION HIGHLIGHT (Deck A) */}
                <div
                  style={{
                    left: `${(deckAInSec / totalTimelineSec) * 100}%`,
                    width: `${((deckAOutSec - deckAInSec) / totalTimelineSec) * 100}%`,
                  }}
                  onMouseDown={(e) => handleMouseDownRegion(e, 'A', 'body')}
                  className="absolute top-1 bottom-1 bg-pink-500/15 border-y-2 border-pink-500 cursor-move z-10 rounded-xs group/regionA flex items-center justify-between"
                  title="Drag body to move clip • Drag edge handles to trim In/Out"
                >
                  {/* Left Trim Handle */}
                  <div
                    onMouseDown={(e) => handleMouseDownRegion(e, 'A', 'in')}
                    className="w-2.5 h-full bg-pink-500/80 hover:bg-pink-600 cursor-ew-resize rounded-l-xs flex items-center justify-center transition-colors"
                  >
                    <div className="w-0.5 h-4 bg-white rounded-full" />
                  </div>

                  <span className="text-[9px] font-mono font-bold text-pink-700 px-1 bg-white/70 rounded pointer-events-none">
                    VOCAL CHUNK ({(deckAOutSec - deckAInSec).toFixed(1)}s)
                  </span>

                  {/* Right Trim Handle */}
                  <div
                    onMouseDown={(e) => handleMouseDownRegion(e, 'A', 'out')}
                    className="w-2.5 h-full bg-pink-500/80 hover:bg-pink-600 cursor-ew-resize rounded-r-xs flex items-center justify-center transition-colors"
                  >
                    <div className="w-0.5 h-4 bg-white rounded-full" />
                  </div>
                </div>

                {/* Deck A Waveform Bars */}
                {Array.from({ length: 56 }).map((_, i) => {
                  const isInside = (i / 56) * totalTimelineSec >= deckAInSec && (i / 56) * totalTimelineSec <= deckAOutSec;
                  return (
                    <div
                      key={i}
                      style={{ height: `${20 + (i % 5) * 14}%` }}
                      className={`flex-1 rounded-sm transition-colors ${
                        isInside ? 'bg-pink-500' : 'bg-zinc-200'
                      }`}
                    />
                  );
                })}
              </div>

              {/* TRACK 2 (Deck B) WAVEFORM CANVAS */}
              <div className="h-20 relative flex items-end gap-0.5 py-1 border-t border-zinc-100">
                
                {/* DIRECT DRAGGABLE REGION HIGHLIGHT (Deck B) */}
                <div
                  style={{
                    left: `${(deckBInSec / totalTimelineSec) * 100}%`,
                    width: `${((deckBOutSec - deckBInSec) / totalTimelineSec) * 100}%`,
                  }}
                  onMouseDown={(e) => handleMouseDownRegion(e, 'B', 'body')}
                  className="absolute top-1 bottom-1 bg-zinc-900/15 border-y-2 border-zinc-900 cursor-move z-10 rounded-xs group/regionB flex items-center justify-between"
                  title="Drag body to move clip • Drag edge handles to trim In/Out"
                >
                  {/* Left Trim Handle */}
                  <div
                    onMouseDown={(e) => handleMouseDownRegion(e, 'B', 'in')}
                    className="w-2.5 h-full bg-zinc-800 hover:bg-zinc-950 cursor-ew-resize rounded-l-xs flex items-center justify-center transition-colors"
                  >
                    <div className="w-0.5 h-4 bg-white rounded-full" />
                  </div>

                  <span className="text-[9px] font-mono font-bold text-zinc-900 px-1 bg-white/70 rounded pointer-events-none">
                    GROOVE LOOP ({(deckBOutSec - deckBInSec).toFixed(1)}s)
                  </span>

                  {/* Right Trim Handle */}
                  <div
                    onMouseDown={(e) => handleMouseDownRegion(e, 'B', 'out')}
                    className="w-2.5 h-full bg-zinc-800 hover:bg-zinc-950 cursor-ew-resize rounded-r-xs flex items-center justify-center transition-colors"
                  >
                    <div className="w-0.5 h-4 bg-white rounded-full" />
                  </div>
                </div>

                {/* Deck B Waveform Bars */}
                {Array.from({ length: 56 }).map((_, i) => {
                  const isInside = (i / 56) * totalTimelineSec >= deckBInSec && (i / 56) * totalTimelineSec <= deckBOutSec;
                  return (
                    <div
                      key={i}
                      style={{ height: `${30 + (i % 4) * 16}%` }}
                      className={`flex-1 rounded-sm transition-colors ${
                        isInside ? 'bg-zinc-800' : 'bg-zinc-200'
                      }`}
                    />
                  );
                })}
              </div>

            </div>

          </div>

        </section>

        {/* SECTION 2: Control Toolbar & Generator */}
        <section className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            
            {/* Reference Clip Drop / Surprise */}
            <label className="flex-1 sm:flex-initial flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 cursor-pointer text-xs font-mono text-zinc-700 transition-colors shadow-xs" title="Reference arrangement style">
              <Headphones className="w-3.5 h-3.5 text-zinc-400" />
              <span className="truncate max-w-[140px]">{refFile ? refFile.name : blueprint.title}</span>
              <input
                type="file"
                accept="audio/*,video/*,.mp4,.mov,.webm,.wav,.mp3"
                className="hidden"
                onChange={handleRefUpload}
              />
            </label>

            <button
              type="button"
              onClick={handleSurpriseMe}
              className="p-2.5 rounded-xl bg-white hover:bg-pink-50 text-zinc-600 hover:text-pink-600 border border-zinc-200 transition-colors shadow-xs"
              title="Surprise Reference Style"
            >
              <Dices className="w-4 h-4" />
            </button>

            {/* Cut to the Chase Toggle */}
            <button
              type="button"
              onClick={() => setCutToTheChase((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono border transition-all ${
                cutToTheChase
                  ? 'bg-pink-50 border-pink-300 text-pink-600 font-bold'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-xs'
              }`}
              title="Skip intro and drop immediately into sweet spot"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>{cutToTheChase ? 'Instant Drop' : '5-Stage'}</span>
            </button>
          </div>

          {/* Big Reconstruct Trigger */}
          <button
            type="button"
            onClick={handleStartDeepReconstruction}
            disabled={isProcessing}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-xs uppercase font-mono px-8 py-3 rounded-xl shadow-md shadow-pink-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>{isProcessing ? 'Synthesizing...' : 'Reconstruct'}</span>
          </button>
        </section>

        {/* PROCESSING PROGRESS */}
        {isProcessing && (
          <div className="bg-zinc-50 border border-pink-200 rounded-2xl p-5 space-y-3 shadow-sm animate-in fade-in">
            <div className="flex justify-between text-[11px] font-mono text-pink-600 font-bold">
              <span className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <span>{RECONSTRUCTION_STAGES[currentStageIdx].label}</span>
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-pink-500 transition-all duration-300"
              />
            </div>
          </div>
        )}

        {/* SECTION 3: 3 Reconstructed Options (Audition Bar) */}
        {mashupReady && (
          <section id="previews-section" className="space-y-4 pt-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-500 px-1">
              <span>PREVIEW AUDITIONS (15s)</span>
              <span>SELECT TO LOAD MASTER</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 1, title: '01 • VIP Anthem Drop', label: 'Groove Key-Lock' },
                { id: 2, title: '02 • Call & Response', label: 'Vocal Gap Surgery' },
                { id: 3, title: '03 • Harmonic Pivot', label: 'BS-Roformer Vocal' },
              ].map((opt) => {
                const isPlaying = playingPreviewId === opt.id;
                const isSelected = selectedPreviewId === opt.id;

                return (
                  <div
                    key={opt.id}
                    className={`bg-zinc-50 border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all ${
                      isSelected
                        ? 'border-pink-500 ring-2 ring-pink-500/20 bg-pink-50/20 shadow-md'
                        : 'border-zinc-200/80 hover:border-zinc-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900">{opt.title}</span>
                      <span className="text-[9px] font-mono text-pink-600 bg-pink-100/60 px-2 py-0.5 rounded">
                        {opt.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-zinc-200/80 shadow-xs">
                      <button
                        type="button"
                        onClick={() => handleTogglePreviewPlay(opt.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isPlaying
                            ? 'bg-zinc-900 text-white'
                            : 'bg-pink-500 text-white hover:bg-pink-600 shadow-sm'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                          <span>{isPlaying ? `${previewProgress.toFixed(1)}s` : '0.0s'}</span>
                          <span>15.0s</span>
                        </div>
                        <div className="h-2 flex items-end gap-0.5 overflow-hidden">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div
                              key={i}
                              style={{ height: `${(i % 4 + 1) * 25}%` }}
                              className={`flex-1 rounded-sm ${
                                isPlaying && (i / 16) * 15 <= previewProgress ? 'bg-pink-500' : 'bg-zinc-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMakeFullSong(opt.id, cutToTheChase ? 30 : 60)}
                      className="w-full py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider bg-white hover:bg-pink-500 hover:text-white text-zinc-800 border border-zinc-200 transition-colors shadow-xs"
                    >
                      Load Master →
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 4: Master NLE Timeline & Studio Player (Light Mode Pink Theme) */}
        {fullSongReady && (
          <section id="full-player-section" className="bg-zinc-50 border border-zinc-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md animate-in fade-in duration-300">
            
            {/* Top Status & Controls Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-200/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                      MASTER V{refinementVersion}
                    </span>
                    {isMasteredRefined && (
                      <span className="text-[9px] font-mono text-pink-600 bg-pink-100 px-2 py-0.5 rounded-md border border-pink-200">
                        FEEDBACK REFINED
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {totalTimelineSec}s Total • Commercial -0.2 dB True Peak
                  </span>
                </div>
              </div>

              {/* Minimal Action Buttons */}
              <div className="flex items-center gap-2">
                
                {/* Extend +1 Min */}
                <button
                  type="button"
                  onClick={handleInfiniteExtendOneMin}
                  disabled={isExtending || isRefining}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 shadow-xs transition-colors disabled:opacity-40"
                  title="Extend track by +1 minute"
                >
                  <Plus className="w-3.5 h-3.5 text-pink-500" />
                  <span>+1 Min</span>
                </button>

                {/* Refine & Regenerate (Restart 0.0s) */}
                <button
                  type="button"
                  onClick={handleRefineAndMaster}
                  disabled={isRefining || isExtending}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 text-xs font-mono font-bold shadow-xs transition-all disabled:opacity-40"
                  title="Regenerate improved version from your feedback & restart playback from 0.0s"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{isRefining ? 'Regenerating...' : 'Refine'}</span>
                </button>

                {/* Export Region Clip */}
                <button
                  type="button"
                  onClick={handleExportCustomRegion}
                  disabled={isExportingRegion}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 shadow-xs transition-colors disabled:opacity-40"
                  title={`Export highlighted region (${clipDurationA.toFixed(1)}s)`}
                >
                  <Scissors className="w-3.5 h-3.5 text-pink-500" />
                  <span>Clip ({clipDurationA.toFixed(1)}s)</span>
                </button>

                {/* Full MP3 Export */}
                <button
                  type="button"
                  onClick={handleDownloadMp3}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-xs font-mono uppercase tracking-wider shadow-md shadow-pink-500/25 transition-all disabled:opacity-40"
                  title="Download full mastered MP3"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

              </div>
            </div>

            {/* FULL-WIDTH NLE TIMELINE WAVEFORM (LIGHT MODE PINK) */}
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                <span className="text-pink-600 font-bold">{fullProgress.toFixed(1)}s</span>
                <span>{Math.floor(totalTimelineSec / 60)}:{(totalTimelineSec % 60).toString().padStart(2, '0')}</span>
              </div>

              {/* Seamless Full-Width Waveform Container */}
              <div
                ref={masterWaveformRef}
                onClick={handleMasterScrubberSeek}
                className="h-28 bg-white rounded-2xl p-3 flex items-end gap-1 cursor-pointer overflow-hidden relative border border-zinc-200 shadow-inner transition-colors select-none"
                title="Click or drag to scrub playhead"
              >
                {/* SUBTLE TRANSLUCENT PASTEL PINK REGION HIGHLIGHT OVERLAY */}
                <div
                  style={{
                    left: `${(deckAInSec / totalTimelineSec) * 100}%`,
                    width: `${((deckAOutSec - deckAInSec) / totalTimelineSec) * 100}%`,
                  }}
                  className="absolute top-0 bottom-0 bg-pink-500/15 border-x-2 border-pink-500/80 pointer-events-none z-10"
                />

                {/* Scrub Playhead */}
                <div
                  style={{ left: `${(fullProgress / totalTimelineSec) * 100}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-zinc-900 z-20 pointer-events-none"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500 -translate-x-1/2 -translate-y-1/2 shadow-sm" />
                </div>

                {/* Drop Marker Flag */}
                <div
                  style={{ left: `${(blueprint.dropTime / totalTimelineSec) * 100}%` }}
                  className="absolute top-2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-mono bg-pink-500 text-white font-bold tracking-wider z-10 shadow-xs"
                >
                  DROP ({blueprint.dropTime}s)
                </div>

                {/* Waveform Bars */}
                {Array.from({ length: 56 }).map((_, i) => {
                  const isPast = (i / 56) * 100 <= (fullProgress / totalTimelineSec) * 100;
                  const isDrop = (i / 56) >= (blueprint.dropTime / totalTimelineSec) && (i / 56) <= ((blueprint.dropTime + 15) / totalTimelineSec);

                  return (
                    <div
                      key={i}
                      style={{ height: `${isDrop ? 75 + (i % 4) * 6 : 25 + (i % 5) * 8}%` }}
                      className={`flex-1 rounded-sm transition-colors ${
                        isPast
                          ? isDrop ? 'bg-pink-500' : 'bg-pink-400'
                          : 'bg-zinc-200 hover:bg-zinc-300'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Floating Circular Feedback Actions */}
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
                <span className="text-[10px]">Tap to feed AI live reaction:</span>

                <div className="flex items-center gap-2.5">
                  
                  {/* Hype Flame Button */}
                  <button
                    type="button"
                    onClick={handleHypeTap}
                    className="w-9 h-9 rounded-full bg-white hover:bg-pink-50 text-pink-500 border border-zinc-200 flex items-center justify-center shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all"
                    title={`Hype this moment (+1 score). Tally: ${hypeTaps.length}`}
                  >
                    <Flame className="w-4 h-4 fill-current text-pink-500" />
                  </button>

                  {/* Cold Freeze Button */}
                  <button
                    type="button"
                    onClick={handleColdTap}
                    className="w-9 h-9 rounded-full bg-white hover:bg-zinc-100 text-zinc-500 border border-zinc-200 flex items-center justify-center shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all"
                    title={`Cold / Dislike this transition (-1 score). Tally: ${negativeTaps.length}`}
                  >
                    <Snowflake className="w-4 h-4 text-zinc-500" />
                  </button>

                </div>
              </div>
            </div>

            {/* Bottom Playbar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleToggleFullPlay}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
                  isPlayingFull
                    ? 'bg-zinc-900 text-white'
                    : 'bg-pink-500 text-white hover:bg-pink-600 shadow-pink-500/25'
                }`}
                title={isPlayingFull ? 'Pause' : 'Play'}
              >
                {isPlayingFull ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              {refineActions.length > 0 && (
                <span className="text-[10px] font-mono text-pink-600 truncate max-w-md">
                  ✓ {refineActions[0]}
                </span>
              )}
            </div>

          </section>
        )}

      </main>

      {/* Ultra-Clean Footer */}
      <footer className="border-t border-zinc-100 py-4 px-6 text-center text-[10px] font-mono text-zinc-400">
        BAMBATA 2.0 // NLE TIMELINE &amp; GROOVE KEY-LOCK ENGINE
      </footer>

    </div>
  );
}
