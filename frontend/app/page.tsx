'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Play,
  Pause,
  Download,
  Sparkles,
  FileAudio,
  RotateCcw,
  Dices,
  Headphones,
  Scissors,
  Wand2,
  Flame,
  Snowflake,
  Check,
  Volume2,
  VolumeX,
  Lock,
  SlidersHorizontal,
  Link,
  Sparkle,
  Loader2,
  Wand,
  Music,
  Gauge,
  Activity,
  Layers,
  Sliders,
  AlertCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { webAudioEngine, ReferenceBlueprint } from '../lib/webAudioEngine';
import { useMultiTrackAudio } from '../hooks/useMultiTrackAudio';
import { useMasterWaveSurfer } from '../hooks/useMasterWaveSurfer';

const CAMELOT_KEYS = [
  '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B',
  '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B',
  '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B',
];

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

  // Multi-Track WaveSurfer Containers
  const deckAContainerRef = useRef<HTMLDivElement | null>(null);
  const deckBContainerRef = useRef<HTMLDivElement | null>(null);
  const track3ContainerRef = useRef<HTMLDivElement | null>(null);
  const masterContainerRef = useRef<HTMLDivElement | null>(null);

  // Synchronized Multi-Track Hook with Serato Sync, Volume Faders & Metadata
  const {
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
    setRegionsDirectly,
  } = useMultiTrackAudio(
    deckAContainerRef,
    deckBContainerRef,
    track3ContainerRef,
    track1File,
    track2File
  );

  // Master WaveSurfer Hook & Multi-Stage Generation State
  const [masterAudioUrl, setMasterAudioUrl] = useState<string | null>(null);
  const [isMasterGenerating, setIsMasterGenerating] = useState<boolean>(false);
  const [masterProgressPercent, setMasterProgressPercent] = useState<number>(0);
  const [masterStageText, setMasterStageText] = useState<string>('Extracting Acapellas (0-30%)...');
  const [masterError, setMasterError] = useState<string | null>(null);

  const handleMasterLoadError = useCallback((err: any) => {
    console.warn('Master WaveSurfer load error:', err);
    setIsMasterGenerating(false);
    setMasterError(err?.message || 'Could not decode master audio buffer.');
  }, []);

  const {
    isMasterPlaying,
    isMasterReady,
    masterProgressSec,
    masterDurationSec,
    masterRegion,
    toggleMasterPlay,
    seekMaster,
  } = useMasterWaveSurfer(masterContainerRef, masterAudioUrl, 60, handleMasterLoadError);

  // Automatically complete progress bar and show waveform once Master WaveSurfer is ready
  useEffect(() => {
    if (isMasterReady) {
      setMasterProgressPercent(100);
      const readyTimer = setTimeout(() => {
        setIsMasterGenerating(false);
        setMasterError(null);
      }, 300);
      return () => clearTimeout(readyTimer);
    }
  }, [isMasterReady, masterAudioUrl]);

  // Status & Key Anchor
  const [compatibilityReason, setCompatibilityReason] = useState<string>('Absolute Groove Key-Lock: Deck B Anchor');

  // AI Phrase Suggestion
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [aiSuggestionMsg, setAiSuggestionMsg] = useState<string | null>(null);

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

  // Processing & Audition States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [mashupReady, setMashupReady] = useState<boolean>(false);

  // Previews (Crossfader DJ Techniques)
  const [playingPreviewId, setPlayingPreviewId] = useState<number | null>(null);
  const [previewProgress, setPreviewProgress] = useState<number>(0);
  const [selectedPreviewId, setSelectedPreviewId] = useState<number>(1);

  // Master Song
  const [fullSongReady, setFullSongReady] = useState<boolean>(false);
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

  // Global Spacebar Keybinding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'SELECT') {
        e.preventDefault();
        if (fullSongReady && isMasterReady) {
          toggleMasterPlay();
        } else {
          toggleGlobalPlay();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullSongReady, isMasterReady, toggleMasterPlay, toggleGlobalPlay]);

  // Reference Upload Handler
  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        alert('Upload failed: File exceeds the 50MB size limit.');
        e.target.value = '';
        return;
      }
      setRefFile(file);
      try {
        const analyzed = await webAudioEngine.analyzeAndListenToReference(file);
        setBlueprint(analyzed);
      } catch (err: any) {
        console.warn('Reference analysis error:', err);
        alert(err?.message || 'Upload failed: Track exceeds the 10-minute duration limit.');
        setRefFile(null);
        e.target.value = '';
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
      if (file.size > 50 * 1024 * 1024) {
        alert('Upload failed: File exceeds the 50MB size limit.');
        e.target.value = '';
        return;
      }
      setTrack1File(file);
      setTrack1Name(file.name);
      try {
        const buffer = await webAudioEngine.loadFileToBuffer(file);
        webAudioEngine.track1Buffer = buffer;
      } catch (err: any) {
        console.warn('Could not decode Track 1:', err);
        alert(err?.message || 'Upload failed: Track exceeds the 10-minute duration limit.');
        setTrack1File(null);
        e.target.value = '';
      }
    }
  };

  const handleTrack2Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        alert('Upload failed: File exceeds the 50MB size limit.');
        e.target.value = '';
        return;
      }
      setTrack2File(file);
      setTrack2Name(file.name);
      try {
        const buffer = await webAudioEngine.loadFileToBuffer(file);
        webAudioEngine.track2Buffer = buffer;
      } catch (err: any) {
        console.warn('Could not decode Track 2:', err);
        alert(err?.message || 'Upload failed: Track exceeds the 10-minute duration limit.');
        setTrack2File(null);
        e.target.value = '';
      }
    }
  };

  // AI Assistant: Auto-detect Drops & Vocals
  const handleAutoDetectBestPhrases = async () => {
    setIsSuggesting(true);
    setAiSuggestionMsg('AI analyzing drop onsets & vocal phrase hooks...');

    try {
      const res = await fetch('/api/v1/mashup/suggest-regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bpm_a: deckABpm || 126.0,
          bpm_b: deckBBpm || 126.0,
          duration_a_s: durationA || 180.0,
          duration_b_s: durationB || 240.0,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRegionsDirectly(
          data.deck_a.start_s,
          data.deck_a.end_s,
          data.deck_b.start_s,
          data.deck_b.end_s
        );
        setAiSuggestionMsg(data.suggestion_strategy);
      } else {
        const barSec = (60.0 / (deckBBpm || 126.0)) * 4.0;
        const startA = Math.round(barSec * 4.0 * 10) / 10;
        const endA = Math.round((startA + barSec * 12.0) * 10) / 10;
        const startB = Math.round(barSec * 8.0 * 10) / 10;
        const endB = Math.round((startB + barSec * 16.0) * 10) / 10;
        setRegionsDirectly(startA, endA, startB, endB);
        setAiSuggestionMsg(`AI Phrase Lock: 12-bar Vocal Hook (${startA}s–${endA}s) + 16-bar Drop (${startB}s–${endB}s).`);
      }
    } catch (e) {
      const barSec = (60.0 / (deckBBpm || 126.0)) * 4.0;
      const startA = Math.round(barSec * 4.0 * 10) / 10;
      const endA = Math.round((startA + barSec * 12.0) * 10) / 10;
      const startB = Math.round(barSec * 8.0 * 10) / 10;
      const endB = Math.round((startB + barSec * 16.0) * 10) / 10;
      setRegionsDirectly(startA, endA, startB, endB);
      setAiSuggestionMsg(`AI Phrase Lock: 12-bar Vocal Hook (${startA}s–${endA}s) + 16-bar Drop (${startB}s–${endB}s).`);
    } finally {
      setIsSuggesting(false);
      setTimeout(() => setAiSuggestionMsg(null), 6000);
    }
  };

  // Render Mashup Execution
  const handleStartDeepReconstruction = () => {
    webAudioEngine.stop();
    webAudioEngine.isCutToTheChase = cutToTheChase;
    webAudioEngine.isManualMode = true;
    webAudioEngine.manualDeckARegion = deckARegion;
    webAudioEngine.manualDeckBRegion = deckBRegion;

    setIsProcessing(true);
    setMashupReady(false);
    setFullSongReady(false);
    setMasterAudioUrl(null);
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

      webAudioEngine.manualDeckARegion = deckARegion;
      webAudioEngine.manualDeckBRegion = deckBRegion;
      webAudioEngine.isManualMode = true;

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

  // Helper for Asynchronous Background Job Polling
  const pollAsyncJob = useCallback(
    (
      jobId: string,
      onStageUpdate: (stage: string, progress: number) => void,
      onComplete: (audioUrl: string) => void,
      onError: (err: any) => void
    ) => {
      let attempts = 0;
      const maxAttempts = 60; // 2.5 minutes timeout (60 * 2.5s)

      const intervalId = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(intervalId);
          setIsMasterGenerating(false);
          setMasterError('Background rendering job timed out after 150 seconds.');
          onError(new Error('Background rendering job timed out after 150 seconds.'));
          return;
        }

        try {
          const res = await fetch(`/api/v1/mashup/jobs/${jobId}/status`);
          if (res.ok) {
            const data = await res.json();
            const pct = data.progress || 50;
            setMasterProgressPercent(pct);

            if (data.stage_text) {
              onStageUpdate(data.stage_text, pct);
            } else if (pct < 30) {
              onStageUpdate('Extracting Acapellas (0-30%)...', pct);
            } else if (pct < 70) {
              onStageUpdate('Applying Sync & Crossfader FX (30-70%)...', pct);
            } else {
              onStageUpdate('Encoding Final WAV & Spotify Pedalboard Glue (70-100%)...', pct);
            }

            if (data.status === 'complete' && data.audio_url) {
              clearInterval(intervalId);
              setMasterProgressPercent(100);
              onComplete(data.audio_url);
            } else if (data.status === 'failed' || data.status === 'error') {
              clearInterval(intervalId);
              setIsMasterGenerating(false);
              setMasterError(data.error || data.message || 'Background processing encountered a DSP error.');
              onError(new Error(data.error || data.message || 'Background processing encountered a DSP error.'));
            }
          }
        } catch (pollErr) {
          console.warn('Job status polling error:', pollErr);
        }
      }, 2500);

      return () => clearInterval(intervalId);
    },
    []
  );

  const handleMakeFullSong = async (id: number, duration: number = 60) => {
    webAudioEngine.stop();
    setSelectedPreviewId(id);
    const dur = cutToTheChase ? 30 : duration;
    setFullSongReady(true);
    setIsMasterGenerating(true);
    setMasterError(null);
    setMasterProgressPercent(18);
    setMasterStageText('Extracting Acapellas (0-30%)...');

    webAudioEngine.manualDeckARegion = deckARegion;
    webAudioEngine.manualDeckBRegion = deckBRegion;
    webAudioEngine.isManualMode = true;

    setTimeout(() => {
      document.getElementById('full-player-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);

    try {
      setTimeout(() => {
        setMasterProgressPercent(58);
        setMasterStageText('Applying Sync & Crossfader FX (30-70%)...');
      }, 350);

      setTimeout(() => {
        setMasterProgressPercent(88);
        setMasterStageText('Encoding Final WAV & Spotify Pedalboard Glue (70-100%)...');
      }, 700);

      const blobUrl = await webAudioEngine.generateDownloadableWav(id, dur);
      setMasterAudioUrl(blobUrl);
    } catch (err: any) {
      console.warn('Error generating master audio buffer:', err);
      setMasterError(err?.message || 'Master DSP audio synthesis failed.');
      setIsMasterGenerating(false);
    }
  };

  const handleHypeTap = () => {
    const currentMs = Math.round(masterProgressSec * 1000);
    setHypeTaps((prev) => [...prev, currentMs]);
  };

  const handleColdTap = () => {
    const currentMs = Math.round(masterProgressSec * 1000);
    setNegativeTaps((prev) => [...prev, currentMs]);
  };

  const handleInfiniteExtendOneMin = async () => {
    setIsExtending(true);
    setIsMasterGenerating(true);
    setMasterError(null);
    setMasterProgressPercent(20);
    setMasterStageText('Extracting Extended Slices (0-30%)...');

    try {
      setTimeout(() => {
        setMasterProgressPercent(60);
        setMasterStageText('Applying Sync & Crossfader FX (30-70%)...');
      }, 250);

      setTimeout(() => {
        setMasterProgressPercent(88);
        setMasterStageText('Encoding Extended Master WAV (70-100%)...');
      }, 500);

      webAudioEngine.extendMixBySeconds(60);
      const extendedUrl = await webAudioEngine.generateDownloadableWav(selectedPreviewId, masterDurationSec + 60);
      setMasterAudioUrl(extendedUrl);
    } catch (e: any) {
      console.warn('Extend error:', e);
      setMasterError(e?.message || 'Extend synthesis failed.');
      setIsMasterGenerating(false);
    } finally {
      setIsExtending(false);
    }
  };

  const handleRefineAndMaster = async () => {
    webAudioEngine.stop();
    setIsRefining(true);
    setIsMasterGenerating(true);
    setMasterError(null);
    setMasterProgressPercent(20);
    setMasterStageText('Extracting Acapellas (0-30%)...');

    try {
      const result = webAudioEngine.refineAndRegenerateFromFeedback({
        hypeTaps,
        negativeTaps,
        skippedZones,
      });

      setRefinementVersion(result.iteration);
      setRefineActions(result.actionsTaken);
      setIsMasteredRefined(true);

      setTimeout(() => {
        setMasterProgressPercent(60);
        setMasterStageText('Applying Sync & Crossfader FX (30-70%)...');
      }, 250);

      setTimeout(() => {
        setMasterProgressPercent(88);
        setMasterStageText('Encoding Final WAV & Spotify Pedalboard Glue (70-100%)...');
      }, 500);

      const blobUrl = await webAudioEngine.generateDownloadableWav(selectedPreviewId, result.newDuration);
      setMasterAudioUrl(blobUrl);
    } catch (err: any) {
      console.warn('Refine client DSP error:', err);
      setMasterError(err?.message || 'Master DSP audio synthesis failed.');
      setIsMasterGenerating(false);
    } finally {
      setIsRefining(false);
      setHypeTaps([]);
      setNegativeTaps([]);
      setSkippedZones([]);
    }
  };

  const handleDownloadMp3 = async () => {
    setIsDownloading(true);
    try {
      const blobUrl = await webAudioEngine.generateDownloadableWav(selectedPreviewId, masterDurationSec);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `BAMBATA_${masterDurationSec.toFixed(0)}s_V${refinementVersion}.mp3`;
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
      const clipStart = masterRegion[0];
      const clipEnd = masterRegion[1];
      const blobUrl = await webAudioEngine.exportRegionWav(clipStart, clipEnd);
      const a = document.createElement('a');
      a.href = blobUrl;
      const clipDur = (clipEnd - clipStart).toFixed(1);
      a.download = `BAMBATA_Clip_${clipStart.toFixed(1)}s_${clipDur}s.wav`;
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
    setMasterAudioUrl(null);
    setPlayingPreviewId(null);
    setIsProcessing(false);
    setIsMasteredRefined(false);
    setRefinementVersion(1);
    setRefineActions([]);
    setHypeTaps([]);
    setNegativeTaps([]);
    setSkippedZones([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clipDurationA = Math.max(0.5, deckARegion[1] - deckARegion[0]);
  const clipDurationB = Math.max(0.5, deckBRegion[1] - deckBRegion[0]);
  const masterClipDuration = Math.max(0.5, masterRegion[1] - masterRegion[0]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-pink-500/20 selection:text-pink-600 font-sans">
      
      {/* Studio Header */}
      <header className="border-b border-zinc-200/80 py-3 px-6 sm:px-10 bg-white/95 backdrop-blur sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-pink-500/25">
              B
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-sm font-extrabold tracking-widest uppercase text-zinc-900">BAMBATA 2.0</span>
              <span className="text-[10px] font-mono text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-md border border-pink-200 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-pink-600" />
                {compatibilityReason}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Global Transport Master Play/Pause Button */}
            <button
              type="button"
              onClick={toggleGlobalPlay}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono text-xs font-bold transition-all shadow-xs ${
                isGlobalPlaying || isPlayingA || isPlayingB
                  ? 'bg-zinc-900 text-white shadow-zinc-900/20'
                  : 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-500/25'
              }`}
              title="Toggle global synchronized playback for both decks (Spacebar)"
            >
              {isGlobalPlaying || isPlayingA || isPlayingB ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
              <span>{isGlobalPlaying || isPlayingA || isPlayingB ? 'Pause Master' : 'Play Both Decks'}</span>
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

      {/* Main Studio Workspace */}
      <main className="max-w-6xl mx-auto px-6 py-6 w-full space-y-6 flex-1">
        
        {/* SECTION 1: Dual-Deck Upload Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Deck A Input Card */}
          <div className="flex flex-col gap-4 bg-zinc-50 p-6 rounded-xl border border-zinc-200 shadow-sm w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-pink-600">
                  DECK A • HERO VOCAL (SERATO SYNC)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center gap-2.5 truncate">
                <FileAudio className="w-4 h-4 text-pink-500 flex-shrink-0" />
                <span className="text-xs font-medium text-zinc-800 truncate" title={track1Name}>
                  {track1Name}
                </span>
              </div>

              <label className="inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-medium text-xs font-mono px-4 py-2 rounded-full cursor-pointer transition-colors shadow-xs flex-shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a"
                  className="hidden"
                  onChange={handleTrack1Upload}
                />
              </label>
            </div>
          </div>

          {/* Deck B Input Card */}
          <div className="flex flex-col gap-4 bg-zinc-50 p-6 rounded-xl border border-zinc-200 shadow-sm w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-700">
                  DECK B • GROOVE &amp; BASS (MASTER KEY)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center gap-2.5 truncate">
                <FileAudio className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="text-xs font-medium text-zinc-800 truncate" title={track2Name}>
                  {track2Name}
                </span>
              </div>

              <label className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-900 text-white font-medium text-xs font-mono px-4 py-2 rounded-full cursor-pointer transition-colors shadow-xs flex-shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a"
                  className="hidden"
                  onChange={handleTrack2Upload}
                />
              </label>
            </div>
          </div>

        </section>

        {/* SECTION 2: PERMANENT 3-TRACK NLE TIMELINE STUDIO */}
        <section className="bg-white border border-zinc-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          
          {/* Top Timeline Info Bar & AI Suggestion Button */}
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-pink-500" />
                NLE Multi-Track Studio (3 Tracks)
              </span>
              <span className="text-[10px] font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                {masterDuration.toFixed(1)}s Span
              </span>
            </div>

            <div className="flex items-center gap-3">
              
              {/* AI Auto-Detect Drops & Vocals */}
              <button
                type="button"
                onClick={handleAutoDetectBestPhrases}
                disabled={isSuggesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 text-xs font-mono font-bold shadow-xs transition-all disabled:opacity-50"
                title="Use AI to auto-detect optimal vocal hook and groove drop phrases"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                <span>{isSuggesting ? 'Detecting...' : '✨ Auto-Detect Drops/Vocals'}</span>
              </button>

              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-pink-600 font-medium">
                  Vocal: {deckARegion[0].toFixed(1)}s → {deckARegion[1].toFixed(1)}s ({clipDurationA.toFixed(1)}s)
                </span>
                <span className="text-zinc-300">•</span>
                <span className="text-zinc-700 font-medium">
                  Groove: {deckBRegion[0].toFixed(1)}s → {deckBRegion[1].toFixed(1)}s ({clipDurationB.toFixed(1)}s)
                </span>
              </div>
            </div>
          </div>

          {/* AI Suggestion Feedback Pill */}
          {aiSuggestionMsg && (
            <div className="bg-pink-50/70 border border-pink-200 text-pink-700 text-xs font-mono px-3.5 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
              <Sparkle className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
              <span className="truncate">{aiSuggestionMsg}</span>
            </div>
          )}

          {/* Stacked NLE Workspace: Headers + Timelines */}
          <div className="flex rounded-2xl border border-zinc-200 bg-zinc-50 overflow-hidden shadow-inner divide-x divide-zinc-200">
            
            {/* LEFT COLUMN: Track Headers (~310px) */}
            <div className="w-80 sm:w-96 bg-zinc-100/70 flex flex-col justify-between p-4 divide-y divide-zinc-200 select-none">
              
              {/* TRACK 1 (Deck A) Header Card */}
              <div className="flex flex-col gap-3 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-pink-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                    DECK A • HERO VOCAL
                  </span>
                  <span className="text-[9px] font-mono text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full font-bold">
                    {isAcapellaIsolated ? 'ACAPELLA CLEAN' : 'BS-ROFORMER'}
                  </span>
                </div>

                {/* Deck A Analyzed Metadata Readout Badges */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-pink-100/70 border border-pink-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between font-mono text-xs">
                    <span className="text-pink-700 font-medium">BPM:</span>
                    <span className="font-bold text-pink-900">{isAnalyzingA ? '...' : deckABpm.toFixed(1)}</span>
                  </div>
                  <div className="flex-1 bg-pink-100/70 border border-pink-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between font-mono text-xs">
                    <span className="text-pink-700 font-medium">KEY:</span>
                    <span className="font-bold text-pink-900">{isAnalyzingA ? '...' : deckAKey}</span>
                  </div>
                </div>

                {/* Track Headers: Title, Play, Mute, and Solo in horizontal flex row */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={togglePlayA}
                    className="bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2 rounded-full transition-colors flex items-center justify-center gap-2 shadow-xs"
                    title={isPlayingA ? 'Pause Deck A' : 'Play Deck A'}
                  >
                    {isPlayingA ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                    <span className="text-xs font-mono">{isPlayingA ? 'Pause' : 'Play'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleMuteA}
                    className={`bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 px-3 py-1.5 rounded-full font-medium text-xs font-mono flex items-center gap-1.5 transition-all ${
                      isMutedA ? '!bg-rose-500 !text-white !border-rose-600' : ''
                    }`}
                    title="Mute Deck A audio"
                  >
                    {isMutedA ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    <span>MUTE</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleSoloA}
                    className={`bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 px-3 py-1.5 rounded-full font-medium text-xs font-mono flex items-center gap-1.5 transition-all ${
                      isSoloA ? '!bg-amber-400 !text-zinc-950 !border-amber-500' : ''
                    }`}
                    title="Solo Deck A audio"
                  >
                    <Headphones className="w-3 h-3" />
                    <span>SOLO</span>
                  </button>
                </div>

                {/* Deck A Volume Fader (0-100%) */}
                <div className="pt-1">
                  <div className="flex justify-between text-sm text-zinc-600 font-medium mb-1">
                    <span className="font-mono text-xs">Deck A Volume:</span>
                    <span className="text-pink-600 font-mono text-xs font-bold">{volumeA}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volumeA}
                    onChange={(e) => handleVolumeAChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                </div>

                {/* Deck A Vocal Clarity (HPF 20Hz - 400Hz) */}
                <div>
                  <div className="flex justify-between text-sm text-zinc-600 font-medium mb-1">
                    <span className="font-mono text-xs">Vocal Clarity (HPF):</span>
                    <span className="text-pink-600 font-mono text-xs font-bold">{isolationClarityA}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isolationClarityA}
                    onChange={(e) => handleIsolationClarityChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                </div>

                {/* Prominent BS-Roformer Acapella Isolation Trigger */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={isolateAcapellaWithRoformer}
                    disabled={isExtractingVocal}
                    className={`w-full bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2 rounded-full transition-colors flex items-center justify-center gap-2 shadow-xs text-xs font-mono ${
                      isAcapellaIsolated ? '!bg-emerald-600 !text-white' : ''
                    } disabled:opacity-50`}
                    title="Extract studio-grade acapella using BS-Roformer neural pipeline"
                  >
                    {isExtractingVocal ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>⏳ Isolating Acapella...</span>
                      </>
                    ) : isAcapellaIsolated ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>✓ Acapella Isolated</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>✨ Isolate Acapella (BS-Roformer)</span>
                      </>
                    )}
                  </button>

                  {/* Vocal Extraction Error Toast */}
                  {vocalExtractError && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-mono text-amber-900 flex items-center justify-between gap-1 animate-in fade-in">
                      <span className="flex items-center gap-1.5 truncate">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span className="truncate">{vocalExtractError}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setVocalExtractError(null)}
                        className="text-amber-700 hover:text-amber-950 font-bold px-1.5"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Deck A Serato Sync Control Center */}
                <div className="bg-white border border-zinc-200 rounded-xl p-3 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase flex items-center gap-1.5">
                      <Music className="w-3 h-3 text-pink-500" />
                      Serato Harmonic &amp; Tempo Sync
                    </span>
                  </div>

                  {/* Key Row with Dedicated Sync Key Button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-mono text-zinc-500">Key:</label>
                      <select
                        value={deckAKey}
                        onChange={(e) => setDeckAKey(e.target.value)}
                        className="border border-zinc-300 rounded px-2 py-1 w-20 text-center font-mono font-bold text-xs text-zinc-800 bg-zinc-50 focus:outline-pink-500"
                      >
                        {CAMELOT_KEYS.map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={syncKeyToDeckB}
                      className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 px-3 py-1.5 rounded-full font-medium text-xs font-mono flex items-center gap-1 shadow-2xs"
                      title="Harmonically pitch-shift Deck A to match Deck B's Key"
                    >
                      <Music className="w-3 h-3 text-pink-500" />
                      <span>Sync Key</span>
                    </button>
                  </div>

                  {/* BPM Row with Dedicated Sync BPM Button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-mono text-zinc-500">BPM:</label>
                      <input
                        type="number"
                        min="60"
                        max="180"
                        step="0.5"
                        value={deckABpm}
                        onChange={(e) => setDeckABpm(parseFloat(e.target.value) || 126.0)}
                        className="border border-zinc-300 rounded px-2 py-1 w-20 text-center font-mono font-bold text-xs text-zinc-800 bg-zinc-50 focus:outline-pink-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={syncBpmToDeckB}
                      className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 px-3 py-1.5 rounded-full font-medium text-xs font-mono flex items-center gap-1 shadow-2xs"
                      title="Time-stretch Deck A playback rate (ratio) to match Deck B's BPM"
                    >
                      <Gauge className="w-3 h-3 text-pink-500" />
                      <span>Sync BPM</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TRACK 2 (Deck B) Header Card */}
              <div className="flex flex-col gap-3 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                    DECK B • GROOVE &amp; BASS
                  </span>
                  <span className="text-[9px] font-mono text-zinc-700 bg-zinc-200 px-2 py-0.5 rounded-full font-bold">
                    KEY ANCHOR
                  </span>
                </div>

                {/* Deck B Analyzed Metadata Badges */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-200/80 border border-zinc-300/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between font-mono text-xs">
                    <span className="text-zinc-500">BPM:</span>
                    <span className="font-bold text-zinc-800">{isAnalyzingB ? '...' : deckBBpm.toFixed(1)}</span>
                  </div>
                  <div className="flex-1 bg-zinc-200/80 border border-zinc-300/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between font-mono text-xs">
                    <span className="text-zinc-500">KEY:</span>
                    <span className="font-bold text-zinc-800">{isAnalyzingB ? '...' : deckBKey}</span>
                  </div>
                </div>

                {/* Track Headers: Title, Play, Mute, and Solo in horizontal flex row */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={togglePlayB}
                    className="bg-zinc-800 hover:bg-zinc-900 text-white font-medium px-4 py-2 rounded-full transition-colors flex items-center justify-center gap-2 shadow-xs"
                    title={isPlayingB ? 'Pause Deck B' : 'Play Deck B'}
                  >
                    {isPlayingB ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                    <span className="text-xs font-mono">{isPlayingB ? 'Pause' : 'Play'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleMuteB}
                    className={`bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 px-3 py-1.5 rounded-full font-medium text-xs font-mono flex items-center gap-1.5 transition-all ${
                      isMutedB ? '!bg-rose-500 !text-white !border-rose-600' : ''
                    }`}
                    title="Mute Deck B audio"
                  >
                    {isMutedB ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    <span>MUTE</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleSoloB}
                    className={`bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 px-3 py-1.5 rounded-full font-medium text-xs font-mono flex items-center gap-1.5 transition-all ${
                      isSoloB ? '!bg-amber-400 !text-zinc-950 !border-amber-500' : ''
                    }`}
                    title="Solo Deck B audio"
                  >
                    <Headphones className="w-3 h-3" />
                    <span>SOLO</span>
                  </button>
                </div>

                {/* Deck B Volume Fader (0-100%) */}
                <div className="pt-1">
                  <div className="flex justify-between text-sm text-zinc-600 font-medium mb-1">
                    <span className="font-mono text-xs">Deck B Volume:</span>
                    <span className="text-zinc-900 font-mono text-xs font-bold">{volumeB}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volumeB}
                    onChange={(e) => handleVolumeBChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-800"
                  />
                </div>

                {/* Real-Time Vocal Suppression Slider (1.5kHz Notch) */}
                <div>
                  <div className="flex justify-between text-sm text-zinc-600 font-medium mb-1">
                    <span className="font-mono text-xs">Vocal Suppress (Notch):</span>
                    <span className="text-zinc-800 font-mono text-xs font-bold">{vocalSuppressB}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={vocalSuppressB}
                    onChange={(e) => handleVocalSuppressChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-800"
                  />
                </div>
              </div>

              {/* TRACK 3 (Selection Bus Mashup Preview) Header Card */}
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-pink-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-600 animate-pulse" />
                    TRACK 3 • MASHUP BUS
                  </span>
                  <span className="text-[9px] font-mono text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full font-bold">
                    SELECTION
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={togglePlayTrack3}
                    className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2 rounded-full transition-colors flex items-center justify-center gap-2 shadow-xs text-xs font-mono"
                    title={isPlayingTrack3 ? 'Pause Mashup Bus' : 'Audition Mashup Bus Selection'}
                  >
                    {isPlayingTrack3 ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                    <span>{isPlayingTrack3 ? 'Pause Preview' : 'Audition Mix'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsKeySyncOn((prev) => !prev)}
                    className={`bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 px-4 py-2 rounded-full font-medium text-xs font-mono flex items-center gap-1.5 transition-all ${
                      isKeySyncOn ? '!bg-pink-50 !text-pink-700 !border-pink-300 shadow-xs' : ''
                    }`}
                    title="Real-time harmonic key & BPM lock"
                  >
                    <Link className="w-3.5 h-3.5 text-pink-500" />
                    <span>Sync</span>
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Real Wavesurfer Canvases */}
            <div className="flex-1 relative flex flex-col justify-between p-3 select-none overflow-hidden bg-white">
              
              {/* Timecode Scale */}
              <div className="flex justify-between text-[9px] font-mono text-zinc-400 pb-1 border-b border-zinc-100">
                <span>0.0s</span>
                <span>{(masterDuration * 0.25).toFixed(1)}s</span>
                <span>{(masterDuration * 0.5).toFixed(1)}s</span>
                <span>{(masterDuration * 0.75).toFixed(1)}s</span>
                <span>{masterDuration.toFixed(1)}s</span>
              </div>

              {/* DECK A REAL WAVESURFER */}
              <div className="py-1.5">
                <div className="flex justify-between text-[9px] font-mono font-bold text-pink-600 pb-1">
                  <span>DECK A VOCAL STEM (DRAG TO TRIM HOOK)</span>
                  <span>{currentTimeA.toFixed(1)}s</span>
                </div>
                <div ref={deckAContainerRef} className="w-full h-[70px] rounded-lg overflow-hidden bg-zinc-50 border border-zinc-100" />
              </div>

              {/* DECK B REAL WAVESURFER */}
              <div className="py-1.5 border-t border-zinc-100">
                <div className="flex justify-between text-[9px] font-mono font-bold text-zinc-700 pb-1">
                  <span>DECK B GROOVE &amp; BASS (DRAG TO TRIM DROP)</span>
                  <span>{currentTimeB.toFixed(1)}s</span>
                </div>
                <div ref={deckBContainerRef} className="w-full h-[70px] rounded-lg overflow-hidden bg-zinc-50 border border-zinc-100" />
              </div>

              {/* TRACK 3 MASHUP PREVIEW REAL WAVESURFER (WITH PROCESSING OVERLAY) */}
              <div className="py-1.5 border-t border-zinc-100 relative">
                <div className="flex justify-between text-[9px] font-mono font-bold text-pink-700 pb-1">
                  <span>TRACK 3 MASHUP PREVIEW BUS (LAYERED ACTIVE REGIONS)</span>
                  <span>{currentTimeTrack3.toFixed(1)}s</span>
                </div>

                <div className="relative">
                  {isProcessingFX && (
                    <div className="absolute inset-0 bg-pink-50/80 backdrop-blur-[1px] rounded-lg z-10 flex items-center justify-center gap-2 select-none border border-pink-200/60 animate-in fade-in">
                      <Loader2 className="w-3.5 h-3.5 text-pink-500 animate-spin" />
                      <span className="text-[10px] font-mono font-bold text-pink-700">
                        ⏳ Slicing Region &amp; Applying FX Mixdown...
                      </span>
                    </div>
                  )}
                  <div ref={track3ContainerRef} className="w-full h-[60px] rounded-lg overflow-hidden bg-pink-50/40 border border-pink-100" />
                </div>
              </div>

            </div>

          </div>

        </section>

        {/* SECTION 3: Control Toolbar & Render Mashup Trigger */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            
            {/* Reference Clip Drop */}
            <label className="flex-1 sm:flex-initial flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 cursor-pointer text-xs font-mono text-zinc-700 transition-colors shadow-xs" title="Reference arrangement style">
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
              className="p-2.5 rounded-xl bg-zinc-50 hover:bg-pink-50 text-zinc-600 hover:text-pink-600 border border-zinc-200 transition-colors shadow-xs"
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
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-xs'
              }`}
              title="Skip intro and drop immediately into sweet spot"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>{cutToTheChase ? 'Instant Drop' : '5-Stage'}</span>
            </button>
          </div>

          {/* Render Mashup Action Button (Submits Exact Region Coordinates) */}
          <button
            type="button"
            onClick={handleStartDeepReconstruction}
            disabled={isProcessing}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-pink-500 hover:bg-pink-600 text-white font-medium text-xs font-mono px-8 py-3 rounded-full shadow-md shadow-pink-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>{isProcessing ? 'Synthesizing...' : `Render Mashup (${clipDurationA.toFixed(1)}s + ${clipDurationB.toFixed(1)}s)`}</span>
          </button>
        </section>

        {/* Processing Progress Bar */}
        {isProcessing && (
          <div className="bg-white border border-pink-200 rounded-2xl p-5 space-y-3 shadow-xs animate-in fade-in">
            <div className="flex justify-between text-[11px] font-mono text-pink-600 font-bold">
              <span className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <span>{RECONSTRUCTION_STAGES[currentStageIdx].label}</span>
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-pink-500 transition-all duration-300"
              />
            </div>
          </div>
        )}

        {/* SECTION 4: 3 Crossfader DJ Technique Preview Variations */}
        {mashupReady && (
          <section id="previews-section" className="space-y-4 pt-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-500 px-1">
              <span>PREVIEW AUDITIONS (15s CROSSFADER TECHNIQUES)</span>
              <span>SELECT TO LOAD MASTER</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 1, title: '01 • Direct Blend', label: '-4dB Mid Pocket', desc: 'Exact timeline blend with -4dB notch cut at 1.5kHz on Deck B to carve vocal pocket.' },
                { id: 2, title: '02 • Energy Drive', label: '+4% Club Speed', desc: 'Direct blend accelerated with global +4% playback rate (1.04x speed) for peak energy.' },
                { id: 3, title: '03 • Bass Swap', label: 'HPF Bass Kill', desc: 'Steep 250Hz HPF on Deck A; Deck B bass dipped -6dB for 4 bars before drop, returning at drop.' },
              ].map((opt) => {
                const isPlaying = playingPreviewId === opt.id;
                const isSelected = selectedPreviewId === opt.id;

                return (
                  <div
                    key={opt.id}
                    className={`bg-white border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all ${
                      isSelected
                        ? 'border-pink-500 ring-2 ring-pink-500/20 bg-pink-50/20 shadow-md'
                        : 'border-zinc-200 hover:border-zinc-300 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900">{opt.title}</span>
                        <span className="text-[9px] font-mono text-pink-600 bg-pink-100 px-2 py-0.5 rounded font-bold">
                          {opt.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono pt-1">{opt.desc}</p>
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 shadow-xs">
                      <button
                        type="button"
                        onClick={() => handleTogglePreviewPlay(opt.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isPlaying
                            ? 'bg-zinc-900 text-white'
                            : 'bg-pink-500 text-white hover:bg-pink-600 shadow-xs'
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
                      className="w-full py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider bg-zinc-50 hover:bg-pink-500 hover:text-white text-zinc-800 border border-zinc-200 transition-colors shadow-xs"
                    >
                      Load Master →
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 5: REAL WAVESURFER MASTER TIMELINE & TRANSPORT */}
        {fullSongReady && (
          <section id="full-player-section" className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-300">
            
            {/* Master Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-100 pb-4">
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
                    {masterDurationSec.toFixed(1)}s Decoded Audio • Spotify Pedalboard Master
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInfiniteExtendOneMin}
                  disabled={isExtending || isRefining || isMasterGenerating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 shadow-xs transition-colors disabled:opacity-40"
                  title="Extend track by +1 minute"
                >
                  <span>{isExtending ? 'Extending...' : '+1 Min'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRefineAndMaster}
                  disabled={isRefining || isExtending || isMasterGenerating}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 text-xs font-mono font-bold shadow-xs transition-all disabled:opacity-40"
                  title="Regenerate improved version from your feedback & restart playback from 0.0s"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{isRefining ? 'Regenerating...' : 'Refine'}</span>
                </button>

                {/* Region Clip Export Button with Dynamic Duration Readout */}
                <button
                  type="button"
                  onClick={handleExportCustomRegion}
                  disabled={isExportingRegion || isMasterGenerating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 shadow-xs transition-colors disabled:opacity-40"
                  title={`Export highlighted region (${masterClipDuration.toFixed(1)}s)`}
                >
                  <Scissors className="w-3.5 h-3.5 text-pink-500" />
                  <span>Clip ({masterClipDuration.toFixed(1)}s)</span>
                </button>

                {/* Full MP3 Export */}
                <button
                  type="button"
                  onClick={handleDownloadMp3}
                  disabled={isDownloading || isMasterGenerating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-xs font-mono uppercase tracking-wider shadow-md shadow-pink-500/25 transition-all disabled:opacity-40"
                  title="Download full mastered MP3"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

              </div>
            </div>

            {/* REAL WAVESURFER MASTER TIMELINE CANVAS OR MULTI-STAGE LOADING STATE */}
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                <span className="text-pink-600 font-bold">{masterProgressSec.toFixed(1)}s</span>
                <span>{masterDurationSec.toFixed(1)}s</span>
              </div>

              {/* Genuine Wavesurfer Container, Loading Spinner, or Error Card */}
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 min-h-[120px] flex items-center justify-center">
                {masterError ? (
                  <div className="p-5 w-full bg-rose-50/90 border border-rose-200 rounded-xl flex flex-col items-center justify-center space-y-2.5 text-center animate-in fade-in">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-mono font-bold text-rose-900">Master Rendering Failed</p>
                      <p className="text-[10px] font-mono text-rose-600 max-w-md">{masterError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMakeFullSong(selectedPreviewId, cutToTheChase ? 30 : 60)}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-mono text-[11px] font-bold transition-all shadow-xs"
                    >
                      Retry Master Render
                    </button>
                  </div>
                ) : isMasterGenerating ? (
                  <div className="w-full p-4 sm:p-5 space-y-3.5 select-none animate-in fade-in">
                    {/* Header Label + Percentage */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-pink-500 animate-spin flex-shrink-0" />
                        <span className="text-xs font-mono font-bold text-zinc-900 animate-pulse">
                          {masterStageText}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-extrabold text-pink-600 bg-pink-50 border border-pink-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        {masterProgressPercent}%
                      </span>
                    </div>

                    {/* Highly Visible Animated Progress Bar */}
                    <div className="h-2.5 bg-zinc-200/90 rounded-full overflow-hidden p-0.5 shadow-inner">
                      <div
                        style={{ width: `${masterProgressPercent}%` }}
                        className="h-full bg-pink-500 rounded-full shadow-sm shadow-pink-500/50 transition-all duration-300 ease-out"
                      />
                    </div>

                    {/* 3 Step Milestone Checkpoints */}
                    <div className="grid grid-cols-3 gap-2 pt-0.5">
                      <div
                        className={`p-2 rounded-xl border text-[9px] font-mono text-center transition-all ${
                          masterProgressPercent >= 30
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                            : masterProgressPercent > 0
                            ? 'bg-pink-50 text-pink-700 border-pink-200 font-bold animate-pulse'
                            : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                        }`}
                      >
                        {masterProgressPercent >= 30 ? '✓ 01 Extracted' : '01 • Acapellas (0-30%)'}
                      </div>

                      <div
                        className={`p-2 rounded-xl border text-[9px] font-mono text-center transition-all ${
                          masterProgressPercent >= 70
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                            : masterProgressPercent >= 30
                            ? 'bg-pink-50 text-pink-700 border-pink-200 font-bold animate-pulse'
                            : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                        }`}
                      >
                        {masterProgressPercent >= 70 ? '✓ 02 Synced' : '02 • Sync & FX (30-70%)'}
                      </div>

                      <div
                        className={`p-2 rounded-xl border text-[9px] font-mono text-center transition-all ${
                          masterProgressPercent >= 100
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                            : masterProgressPercent >= 70
                            ? 'bg-pink-50 text-pink-700 border-pink-200 font-bold animate-pulse'
                            : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                        }`}
                      >
                        {masterProgressPercent >= 100 ? '✓ 03 Mastered' : '03 • Final WAV (70-100%)'}
                      </div>
                    </div>

                    <div className="text-center">
                      <span className="text-[9px] font-mono text-zinc-400">
                        Formant-Preserved Key Lock • 44.1kHz 16-bit • Spotify -0.2 dB TP Limiter
                      </span>
                    </div>
                  </div>
                ) : (
                  <div ref={masterContainerRef} className="w-full h-[100px] overflow-hidden" />
                )}
              </div>

              {/* Feedback Taps */}
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
                <span className="text-[10px]">Tap to feed AI live reaction:</span>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleHypeTap}
                    className="w-9 h-9 rounded-full bg-white hover:bg-pink-50 text-pink-500 border border-zinc-200 flex items-center justify-center shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all"
                    title={`Hype this moment (+1 score). Tally: ${hypeTaps.length}`}
                  >
                    <Flame className="w-4 h-4 fill-current text-pink-500" />
                  </button>

                  <button
                    type="button"
                    onClick={handleColdTap}
                    className="w-9 h-9 rounded-full bg-white hover:bg-zinc-100 text-zinc-500 border border-zinc-200 flex items-center justify-center shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all"
                    title={`Cold / Dislike this transition (-1 score). Tally: ${negativeTaps.length}`}
                  >
                    <Snowflake className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Master Transport Playbar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={toggleMasterPlay}
                disabled={isMasterGenerating}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
                  isMasterPlaying
                    ? 'bg-zinc-900 text-white'
                    : 'bg-pink-500 text-white hover:bg-pink-600 shadow-pink-500/25'
                } disabled:opacity-40`}
                title={isMasterPlaying ? 'Pause Master' : 'Play Master'}
              >
                {isMasterPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
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

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 py-3.5 px-6 text-center text-[10px] font-mono text-zinc-400 bg-white">
        BAMBATA 2.0 // SERATO-STYLE SYNC &amp; CROSSFADER DJ TECHNIQUES
      </footer>

    </div>
  );
}
