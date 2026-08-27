'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Maximize2
} from 'lucide-react';
import { webAudioEngine, ReferenceBlueprint } from '../lib/webAudioEngine';

interface ReconstructionStage {
  step: number;
  label: string;
  percent: number;
}

const RECONSTRUCTION_STAGES: ReconstructionStage[] = [
  { step: 1, label: 'Stem Separation', percent: 25 },
  { step: 2, label: 'Hero Vocal Isolation', percent: 50 },
  { step: 3, label: 'Phrase Quantization', percent: 75 },
  { step: 4, label: 'Master Bus Glue', percent: 100 },
];

export default function DJStudioPage() {
  // Track 1 & Track 2 States
  const [track1File, setTrack1File] = useState<File | null>(null);
  const [track1Name, setTrack1Name] = useState<string>('Fred again.. - Turn On The Lights');
  const [track2File, setTrack2File] = useState<File | null>(null);
  const [track2Name, setTrack2Name] = useState<string>('Mau P - Drugs From Amsterdam');

  // Pre-Flight Compatibility State
  const [isCompatible, setIsCompatible] = useState<boolean>(true);
  const [compatibilityReason, setCompatibilityReason] = useState<string>('Pivot Key 9A • 126 BPM');

  // Cut to the Chase Macro State
  const [cutToTheChase, setCutToTheChase] = useState<boolean>(false);

  // Reference Clip State
  const [refFile, setRefFile] = useState<File | null>(null);
  const [blueprint, setBlueprint] = useState<ReferenceBlueprint>(webAudioEngine.referenceBlueprint);

  // Single Track Preview State
  const [playingSingle, setPlayingSingle] = useState<string | null>(null);
  const [singleProgress, setSingleProgress] = useState<number>(0);

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
  const [trackDurationSec, setTrackDurationSec] = useState<number>(60);
  const [isExtending, setIsExtending] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isMasteredRefined, setIsMasteredRefined] = useState<boolean>(false);
  const [refinementVersion, setRefinementVersion] = useState<number>(1);
  const [refineActions, setRefineActions] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isExportingRegion, setIsExportingRegion] = useState<boolean>(false);

  // Region Selection State
  const [regionStartSec, setRegionStartSec] = useState<number>(7.6);
  const [regionEndSec, setRegionEndSec] = useState<number>(30.5);

  // Live Feedback Taps & Skipped Zones
  const [hypeTaps, setHypeTaps] = useState<number[]>([]);
  const [negativeTaps, setNegativeTaps] = useState<number[]>([]);
  const [skippedZones, setSkippedZones] = useState<[number, number][]>([]);

  const waveformRef = useRef<HTMLDivElement | null>(null);

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

  const togglePlaySingle = (key: string, file: File | null) => {
    if (playingSingle === key) {
      webAudioEngine.stop();
      setPlayingSingle(null);
      setSingleProgress(0);
    } else {
      webAudioEngine.stop();
      setPlayingSingle(key);
      setSingleProgress(0);

      webAudioEngine.playSingleTrack(
        file || '',
        key,
        (t) => setSingleProgress(t),
        () => {
          setPlayingSingle(null);
          setSingleProgress(0);
        }
      );
    }
  };

  const handleStartDeepReconstruction = () => {
    webAudioEngine.stop();
    webAudioEngine.isCutToTheChase = cutToTheChase;
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
    setTrackDurationSec(dur);
    setRegionStartSec(0);
    setRegionEndSec(Math.min(30, dur));
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
        trackDurationSec,
        fullProgress,
        (curr) => setFullProgress(curr),
        () => {
          setIsPlayingFull(false);
          setFullProgress(0);
        }
      );
    }
  };

  const handleScrubberSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = Math.round(ratio * trackDurationSec * 10) / 10;
    
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

  const handleSetRegionStart = () => {
    setRegionStartSec(Math.min(fullProgress, regionEndSec - 2));
  };

  const handleSetRegionEnd = () => {
    setRegionEndSec(Math.max(fullProgress, regionStartSec + 2));
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
    const newLength = trackDurationSec + 60;
    
    setTimeout(() => {
      setTrackDurationSec(newLength);
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

      setTrackDurationSec(result.newDuration);
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
      const blobUrl = await webAudioEngine.generateDownloadableWav(selectedPreviewId, trackDurationSec);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `BAMBATA_${trackDurationSec}s_V${refinementVersion}.mp3`;
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
      const blobUrl = await webAudioEngine.exportRegionWav(regionStartSec, regionEndSec);
      const a = document.createElement('a');
      a.href = blobUrl;
      const clipDur = (regionEndSec - regionStartSec).toFixed(1);
      a.download = `BAMBATA_Clip_${regionStartSec.toFixed(1)}s_${clipDur}s.wav`;
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
    setIsProcessing(false);
    setIsMasteredRefined(false);
    setRefinementVersion(1);
    setRefineActions([]);
    setHypeTaps([]);
    setNegativeTaps([]);
    setSkippedZones([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const regionDuration = Math.max(1, regionEndSec - regionStartSec);

  return (
    <div className="min-h-screen bg-[#07080b] text-[#eceff8] flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-300 font-sans tracking-tight">
      
      {/* Sleek Minimalist Studio Header */}
      <header className="border-b border-white/[0.06] py-4 px-6 sm:px-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-black font-black text-sm shadow-md shadow-cyan-500/20">
              B
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-sm font-extrabold tracking-widest uppercase text-white">BAMBATA 2.0</span>
              <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                {compatibilityReason}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(mashupReady || fullSongReady) && (
              <button
                type="button"
                onClick={handleResetAll}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Reset session"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Primary Studio Workspace */}
      <main className="max-w-5xl mx-auto px-6 py-8 w-full space-y-8 flex-1">
        
        {/* SECTION 1: Dual-Deck Inputs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Deck A (Left Deck - Hero Vocal) */}
          <div className="bg-[#0e0f17] border border-white/[0.08] hover:border-cyan-500/30 rounded-2xl p-5 space-y-4 transition-colors relative group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-400">
                  DECK A • HERO VOCAL
                </span>
              </div>
              <button
                type="button"
                onClick={() => togglePlaySingle('track_1', track1File)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  playingSingle === 'track_1'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/10 hover:bg-cyan-400 hover:text-black text-slate-300'
                }`}
                title={playingSingle === 'track_1' ? 'Pause Deck A' : 'Audition Deck A'}
              >
                {playingSingle === 'track_1' ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>
            </div>

            <label className="border border-dashed border-white/10 hover:border-cyan-400/40 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer bg-[#080910] transition-colors">
              <div className="flex items-center gap-3 truncate">
                <FileAudio className="w-4 h-4 text-cyan-400/70 flex-shrink-0" />
                <span className="text-xs text-slate-300 font-medium truncate">
                  {track1Name}
                </span>
              </div>
              <Upload className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 flex-shrink-0" />
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a"
                className="hidden"
                onChange={handleTrack1Upload}
              />
            </label>
          </div>

          {/* Deck B (Right Deck - Rhythm & Bass) */}
          <div className="bg-[#0e0f17] border border-white/[0.08] hover:border-purple-500/30 rounded-2xl p-5 space-y-4 transition-colors relative group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-purple-400">
                  DECK B • GROOVE &amp; BASS
                </span>
              </div>
              <button
                type="button"
                onClick={() => togglePlaySingle('track_2', track2File)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  playingSingle === 'track_2'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/10 hover:bg-purple-400 hover:text-black text-slate-300'
                }`}
                title={playingSingle === 'track_2' ? 'Pause Deck B' : 'Audition Deck B'}
              >
                {playingSingle === 'track_2' ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>
            </div>

            <label className="border border-dashed border-white/10 hover:border-purple-400/40 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer bg-[#080910] transition-colors">
              <div className="flex items-center gap-3 truncate">
                <FileAudio className="w-4 h-4 text-purple-400/70 flex-shrink-0" />
                <span className="text-xs text-slate-300 font-medium truncate">
                  {track2Name}
                </span>
              </div>
              <Upload className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 flex-shrink-0" />
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a"
                className="hidden"
                onChange={handleTrack2Upload}
              />
            </label>
          </div>

        </section>

        {/* SECTION 2: Control Toolbar & Generator */}
        <section className="bg-[#0b0c13] border border-white/[0.06] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            
            {/* Reference Clip Drop / Surprise */}
            <label className="flex-1 sm:flex-initial flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] cursor-pointer text-xs font-mono text-slate-300 transition-colors" title="Reference arrangement style">
              <Headphones className="w-3.5 h-3.5 text-slate-400" />
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
              className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-purple-500/20 text-slate-400 hover:text-purple-300 border border-white/[0.08] transition-colors"
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
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'
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
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-extrabold text-xs uppercase font-mono px-8 py-3 rounded-xl shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>{isProcessing ? 'Synthesizing...' : 'Reconstruct'}</span>
          </button>
        </section>

        {/* PROCESSING PROGRESS */}
        {isProcessing && (
          <div className="bg-[#0b0c13] border border-cyan-500/30 rounded-2xl p-5 space-y-3 animate-in fade-in">
            <div className="flex justify-between text-[11px] font-mono text-cyan-300">
              <span className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>{RECONSTRUCTION_STAGES[currentStageIdx].label}</span>
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-cyan-400 transition-all duration-300"
              />
            </div>
          </div>
        )}

        {/* SECTION 3: 3 Reconstructed Options (Audition Bar) */}
        {mashupReady && (
          <section id="previews-section" className="space-y-4 pt-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span>PREVIEW AUDITIONS (15s)</span>
              <span>SELECT TO LOAD MASTER</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 1, title: '01 • VIP Anthem Drop', label: 'Lead Vocal Lock' },
                { id: 2, title: '02 • Call & Response', label: 'Vocal Gap Surgery' },
                { id: 3, title: '03 • Harmonic Pivot', label: 'Key Blend 9A' },
              ].map((opt) => {
                const isPlaying = playingPreviewId === opt.id;
                const isSelected = selectedPreviewId === opt.id;

                return (
                  <div
                    key={opt.id}
                    className={`bg-[#0c0d15] border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all ${
                      isSelected
                        ? 'border-cyan-400 ring-1 ring-cyan-400/50 bg-[#0f111c]'
                        : 'border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{opt.title}</span>
                      <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded">
                        {opt.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 bg-[#080910] p-2.5 rounded-xl border border-white/[0.04]">
                      <button
                        type="button"
                        onClick={() => handleTogglePreviewPlay(opt.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isPlaying
                            ? 'bg-rose-500 text-white'
                            : 'bg-cyan-400 text-black hover:bg-cyan-300'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>{isPlaying ? `${previewProgress.toFixed(1)}s` : '0.0s'}</span>
                          <span>15.0s</span>
                        </div>
                        <div className="h-2 flex items-end gap-0.5 overflow-hidden">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div
                              key={i}
                              style={{ height: `${(i % 4 + 1) * 25}%` }}
                              className={`flex-1 rounded-sm ${
                                isPlaying && (i / 16) * 15 <= previewProgress ? 'bg-cyan-400' : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMakeFullSong(opt.id, cutToTheChase ? 30 : 60)}
                      className="w-full py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider bg-white/[0.06] hover:bg-cyan-400 hover:text-black text-slate-200 transition-colors"
                    >
                      Load Full Master →
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 4: Master NLE Timeline & Studio Player */}
        {fullSongReady && (
          <section id="full-player-section" className="bg-[#0b0c13] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in duration-300">
            
            {/* Top Status & Controls Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white uppercase tracking-wider">
                      MASTER V{refinementVersion}
                    </span>
                    {isMasteredRefined && (
                      <span className="text-[9px] font-mono text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                        FEEDBACK CORRECTED
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {trackDurationSec}s Total • Commercial -0.2 dB True Peak
                  </span>
                </div>
              </div>

              {/* Minimal Icon Action Buttons */}
              <div className="flex items-center gap-2">
                
                {/* Extend +1 Min */}
                <button
                  type="button"
                  onClick={handleInfiniteExtendOneMin}
                  disabled={isExtending || isRefining}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-300 transition-colors disabled:opacity-40"
                  title="Extend track by +1 minute"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                  <span>+1 Min</span>
                </button>

                {/* Refine & Regenerate (Restart 0.0s) */}
                <button
                  type="button"
                  onClick={handleRefineAndMaster}
                  disabled={isRefining || isExtending}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400/20 to-rose-500/20 hover:from-amber-400/30 hover:to-rose-500/30 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold transition-all disabled:opacity-40"
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-300 transition-colors disabled:opacity-40"
                  title={`Export highlighted region (${regionDuration.toFixed(1)}s)`}
                >
                  <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Clip ({regionDuration.toFixed(1)}s)</span>
                </button>

                {/* Full MP3 Export */}
                <button
                  type="button"
                  onClick={handleDownloadMp3}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs font-mono uppercase tracking-wider shadow-md shadow-cyan-400/20 transition-all disabled:opacity-40"
                  title="Download full mastered MP3"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

              </div>
            </div>

            {/* FULL-WIDTH NLE TIMELINE WAVEFORM */}
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span className="text-cyan-400 font-bold">{fullProgress.toFixed(1)}s</span>
                <span>{Math.floor(trackDurationSec / 60)}:{(trackDurationSec % 60).toString().padStart(2, '0')}</span>
              </div>

              {/* Seamless Full-Width Waveform Container */}
              <div
                ref={waveformRef}
                onClick={handleScrubberSeek}
                className="h-28 bg-[#07080e] rounded-2xl p-3 flex items-end gap-1 cursor-pointer overflow-hidden relative border border-white/[0.04] hover:border-white/10 transition-colors select-none"
                title="Click or drag to scrub playhead"
              >
                {/* SUBTLE TRANSLUCENT REGION HIGHLIGHT OVERLAY */}
                <div
                  style={{
                    left: `${(regionStartSec / trackDurationSec) * 100}%`,
                    width: `${((regionEndSec - regionStartSec) / trackDurationSec) * 100}%`,
                  }}
                  className="absolute top-0 bottom-0 bg-white/[0.07] border-x border-cyan-400/60 pointer-events-none z-10 backdrop-blur-[1px]"
                />

                {/* Scrub Playhead */}
                <div
                  style={{ left: `${(fullProgress / trackDurationSec) * 100}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-lg shadow-cyan-400 z-20 pointer-events-none"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* Drop Marker Flag */}
                <div
                  style={{ left: `${(blueprint.dropTime / trackDurationSec) * 100}%` }}
                  className="absolute top-2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-mono bg-rose-500/80 text-white font-bold tracking-wider z-10"
                >
                  DROP ({blueprint.dropTime}s)
                </div>

                {/* Waveform Bars */}
                {Array.from({ length: 56 }).map((_, i) => {
                  const isPast = (i / 56) * 100 <= (fullProgress / trackDurationSec) * 100;
                  const isDrop = (i / 56) >= (blueprint.dropTime / trackDurationSec) && (i / 56) <= ((blueprint.dropTime + 15) / trackDurationSec);

                  return (
                    <div
                      key={i}
                      style={{ height: `${isDrop ? 75 + (i % 4) * 6 : 25 + (i % 5) * 8}%` }}
                      className={`flex-1 rounded-sm transition-colors ${
                        isPast
                          ? isDrop ? 'bg-gradient-to-t from-rose-500 to-amber-300' : 'bg-cyan-400'
                          : 'bg-white/[0.08] hover:bg-white/20'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Region Marker Setting Buttons */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSetRegionStart}
                    className="hover:text-cyan-300 transition-colors"
                  >
                    [ Mark Start ({regionStartSec.toFixed(1)}s)
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleSetRegionEnd}
                    className="hover:text-cyan-300 transition-colors"
                  >
                    Mark End ({regionEndSec.toFixed(1)}s) ]
                  </button>
                </div>

                {/* FLOATING CIRCULAR FEEDBACK BUTTONS */}
                <div className="flex items-center gap-2">
                  
                  {/* Hype Flame Button */}
                  <button
                    type="button"
                    onClick={handleHypeTap}
                    className="w-8 h-8 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    title={`Hype this moment (+1 score). Tally: ${hypeTaps.length}`}
                  >
                    <Flame className="w-4 h-4 fill-current" />
                  </button>

                  {/* Cold Freeze Button */}
                  <button
                    type="button"
                    onClick={handleColdTap}
                    className="w-8 h-8 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    title={`Cold / Dislike this transition (-1 score). Tally: ${negativeTaps.length}`}
                  >
                    <Snowflake className="w-4 h-4" />
                  </button>

                </div>
              </div>
            </div>

            {/* Bottom Playbar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleToggleFullPlay}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                  isPlayingFull
                    ? 'bg-rose-500 text-white shadow-rose-500/30'
                    : 'bg-cyan-400 text-black hover:bg-cyan-300 shadow-cyan-400/30'
                }`}
                title={isPlayingFull ? 'Pause' : 'Play'}
              >
                {isPlayingFull ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              {refineActions.length > 0 && (
                <span className="text-[10px] font-mono text-amber-400/90 truncate max-w-md">
                  ✓ {refineActions[0]}
                </span>
              )}
            </div>

          </section>
        )}

      </main>

      {/* Ultra-Clean Footer */}
      <footer className="border-t border-white/[0.04] py-4 px-6 text-center text-[10px] font-mono text-slate-600">
        BAMBATA 2.0 // DSP ENGINE
      </footer>

    </div>
  );
}
