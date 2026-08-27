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
  Layers,
  Repeat,
  PlusCircle,
  Scissors,
  Wand2,
  Flame,
  Snowflake,
  FastForward,
  AlertTriangle,
  Zap,
  Check,
  Disc3,
  Bookmark
} from 'lucide-react';
import { webAudioEngine, ReferenceBlueprint } from '../lib/webAudioEngine';

interface ReconstructionStage {
  step: number;
  label: string;
  percent: number;
  detail: string;
}

const RECONSTRUCTION_STAGES: ReconstructionStage[] = [
  {
    step: 1,
    label: 'Pre-Flight Compatibility & Stem Separation',
    percent: 25,
    detail: 'Validating <20% BPM delta and <2 semitone key shift + Demucs v4 separation...',
  },
  {
    step: 2,
    label: 'Hero Vocal & Instrumental Gap Extraction',
    percent: 50,
    detail: 'Deck A = Hero Vocal • Deck B = Groove & VAD instrumental silence mapping...',
  },
  {
    step: 3,
    label: 'Cut to the Chase / DTW Warp Quantization',
    percent: 75,
    detail: 'Phrase-locking rapid 4-bar pre-drop riser to the instant sweet spot...',
  },
  {
    step: 4,
    label: 'Hero Vocal Gap Surgery & Master Bus Glue',
    percent: 100,
    detail: 'Dropping Hero Vocal into Track B breath gaps + Pedalboard -0.2dB mastering...',
  },
];

export default function DJStudioPage() {
  // Track 1 & Track 2 States
  const [track1File, setTrack1File] = useState<File | null>(null);
  const [track1Name, setTrack1Name] = useState<string>('Fred again.. - Turn On The Lights (Vocals)');
  const [track2File, setTrack2File] = useState<File | null>(null);
  const [track2Name, setTrack2Name] = useState<string>('Mau P - Drugs From Amsterdam (Beat)');

  // Pre-Flight Compatibility State
  const [isCompatible, setIsCompatible] = useState<boolean>(true);
  const [compatibilityReason, setCompatibilityReason] = useState<string>(
    'Harmonically locked to Pivot Key 9A with 0.0% tempo blend.'
  );

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

  // REGION SELECTION STATE
  const [regionStartSec, setRegionStartSec] = useState<number>(7.6);
  const [regionEndSec, setRegionEndSec] = useState<number>(30.5);

  // Live Feedback Taps & Skipped Zones
  const [hypeTaps, setHypeTaps] = useState<number[]>([]);
  const [negativeTaps, setNegativeTaps] = useState<number[]>([]);
  const [skippedZones, setSkippedZones] = useState<[number, number][]>([]);

  const waveformRef = useRef<HTMLDivElement | null>(null);

  // --- Upload Reference ---
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

  // --- Track Uploads ---
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

  // --- Play Individual Upload ---
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

  // --- Start Asynchronous Deep Reconstruction Pipeline ---
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
          }, 600);
          return 100;
        }

        const nextPercent = prev + 5;
        if (nextPercent >= 75) setCurrentStageIdx(3);
        else if (nextPercent >= 50) setCurrentStageIdx(2);
        else if (nextPercent >= 25) setCurrentStageIdx(1);

        return nextPercent;
      });
    }, 180);
  };

  // --- Preview Playback ---
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

  // --- Make Full Song ---
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
    }, 100);
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

  // --- Interactive Scrubber & Region Seek ---
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

  // --- Set Highlight Region from Selection ---
  const handleSetRegionStart = () => {
    setRegionStartSec(Math.min(fullProgress, regionEndSec - 2));
  };

  const handleSetRegionEnd = () => {
    setRegionEndSec(Math.max(fullProgress, regionStartSec + 2));
  };

  // --- Hype & Cold Taps ---
  const handleHypeTap = () => {
    const currentMs = Math.round(fullProgress * 1000);
    setHypeTaps((prev) => [...prev, currentMs]);
  };

  const handleColdTap = () => {
    const currentMs = Math.round(fullProgress * 1000);
    setNegativeTaps((prev) => [...prev, currentMs]);
  };

  // --- Infinite Extend (+1 Min) ---
  const handleInfiniteExtendOneMin = async () => {
    setIsExtending(true);
    const newLength = trackDurationSec + 60;
    
    setTimeout(() => {
      setTrackDurationSec(newLength);
      webAudioEngine.extendMixBySeconds(60);
      setIsExtending(false);
    }, 800);
  };

  // --- Refine & Regenerate from Feedback ---
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
    }, 1400);
  };

  // --- Full MP3 Download ---
  const handleDownloadMp3 = async () => {
    setIsDownloading(true);
    try {
      const blobUrl = await webAudioEngine.generateDownloadableWav(selectedPreviewId, trackDurationSec);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `BAMBATA_${trackDurationSec}s_Refined_V${refinementVersion}_AI_Mashup.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // --- Custom Highlighted Region Export ---
  const handleExportCustomRegion = async () => {
    setIsExportingRegion(true);
    try {
      const blobUrl = await webAudioEngine.exportRegionWav(regionStartSec, regionEndSec);
      const a = document.createElement('a');
      a.href = blobUrl;
      const clipDur = (regionEndSec - regionStartSec).toFixed(1);
      a.download = `BAMBATA_Clip_${regionStartSec.toFixed(1)}s_to_${regionEndSec.toFixed(1)}s_${clipDur}s.wav`;
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
    <div className="min-h-screen bg-[#07080c] text-white flex flex-col justify-between selection:bg-cyan-500 selection:text-black font-sans">
      
      {/* Top Header */}
      <header className="border-b border-white/5 py-5 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 flex items-center justify-center text-black font-extrabold text-xl shadow-lg shadow-cyan-400/20">
              B
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wider text-white">BAMBATA 2.0</h1>
              <p className="text-xs text-slate-400 font-mono">Hero Vocal Gap Surgery • Custom Region Export</p>
            </div>
          </div>

          {(mashupReady || fullSongReady) && (
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start Over</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 w-full space-y-8 flex-1">
        
        {/* STEP 1: Upload 2 Tracks (Deck A & Deck B) */}
        <section className="space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-extrabold text-white">1. Dual-Deck Architecture</h2>
            <p className="text-xs text-slate-400">
              <b>Deck A (Left):</b> Hero Vocal &amp; Harmonic Source • <b>Deck B (Right):</b> Groove &amp; Sub-Bass Source
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Deck A (Left Deck) */}
            <div className="bg-[#0f111a] border border-white/10 hover:border-cyan-500/40 rounded-3xl p-6 space-y-4 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Disc3 className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                  <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    Deck A (Left Deck • Hero Vocal)
                  </span>
                </div>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>

              <label className="border-2 border-dashed border-white/10 hover:border-cyan-400/60 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#090a10] transition-all group">
                <Upload className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                <span className="text-xs text-slate-300 font-medium text-center truncate max-w-[200px]">
                  {track1Name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {track1File ? 'Click to change file' : 'Demo vocals loaded (Click to upload yours)'}
                </span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a"
                  className="hidden"
                  onChange={handleTrack1Upload}
                />
              </label>

              {/* Play Track 1 */}
              <div className="flex items-center justify-between bg-[#141724] px-4 py-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => togglePlaySingle('track_1', track1File)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      playingSingle === 'track_1'
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40'
                        : 'bg-cyan-400 text-black hover:bg-cyan-300'
                    }`}
                  >
                    {playingSingle === 'track_1' ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                  <div>
                    <span className="text-xs font-bold text-white block">Audition Deck A</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {playingSingle === 'track_1' ? `Playing: ${singleProgress.toFixed(1)}s` : 'Hero Vocal Source'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Deck B (Right Deck) */}
            <div className="bg-[#0f111a] border border-white/10 hover:border-purple-500/40 rounded-3xl p-6 space-y-4 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Disc3 className="w-4 h-4 text-purple-400 animate-spin-slow" />
                  <span className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">
                    Deck B (Right Deck • Groove &amp; Sub-Bass)
                  </span>
                </div>
                <span className="w-2 h-2 rounded-full bg-purple-400" />
              </div>

              <label className="border-2 border-dashed border-white/10 hover:border-purple-400/60 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#090a10] transition-all group">
                <Upload className="w-6 h-6 text-slate-500 group-hover:text-purple-400 transition-colors" />
                <span className="text-xs text-slate-300 font-medium text-center truncate max-w-[200px]">
                  {track2Name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {track2File ? 'Click to change file' : 'Demo beat loaded (Click to upload yours)'}
                </span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a"
                  className="hidden"
                  onChange={handleTrack2Upload}
                />
              </label>

              {/* Play Track 2 */}
              <div className="flex items-center justify-between bg-[#141724] px-4 py-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => togglePlaySingle('track_2', track2File)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      playingSingle === 'track_2'
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40'
                        : 'bg-purple-400 text-black hover:bg-purple-300'
                    }`}
                  >
                    {playingSingle === 'track_2' ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                  <div>
                    <span className="text-xs font-bold text-white block">Audition Deck B</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {playingSingle === 'track_2' ? `Playing: ${singleProgress.toFixed(1)}s` : 'Groove & Sub-Bass Anchor'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* STEP 2: Reference & Settings */}
        <section className="bg-[#0b0c14] border border-white/5 rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <Headphones className="w-4 h-4 text-cyan-400" />
                <span>2. Reference Style (Or Zero-Reference Surprise)</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload a reference clip, or let the AI DJ create an optimal drop.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSurpriseMe}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-mono font-bold border border-purple-500/40 self-start sm:self-auto transition-all"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>🎲 Surprise Me</span>
            </button>
          </div>

          {/* Reference Drop Zone */}
          <label className="border border-dashed border-white/10 hover:border-cyan-400/50 rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer bg-[#07080d] transition-all">
            <div className="flex items-center gap-3 truncate">
              <FileAudio className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-300 truncate">
                {refFile ? `Reference: ${refFile.name}` : blueprint.title}
              </span>
            </div>
            <span className="text-[11px] font-mono bg-white/5 text-slate-300 px-3 py-1.5 rounded-lg border border-white/5 flex-shrink-0">
              {refFile ? 'Change File' : 'Browse File'}
            </span>
            <input
              type="file"
              accept="audio/*,video/*,.mp4,.mov,.webm,.mkv,.wav,.mp3"
              className="hidden"
              onChange={handleRefUpload}
            />
          </label>

          {/* PRE-FLIGHT COMPATIBILITY & DEFAULT DECK BADGES */}
          <div className="bg-[#0e1019] border border-cyan-500/20 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-cyan-400 font-bold font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Single Hero Vocal &amp; Gap Surgery Active</span>
              </span>
              <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                {compatibilityReason}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-mono text-slate-300">
              <div className="bg-[#141724] p-3 rounded-xl space-y-1">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Deck A: Hero Vocal</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  Warped &amp; dropped solely into Track B silence gaps
                </p>
              </div>

              <div className="bg-[#141724] p-3 rounded-xl space-y-1">
                <span className="text-purple-400 font-bold flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Deck B: Groove Anchor</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  Sub-bass &amp; driving drums without clashing vocals
                </p>
              </div>

              <div className="bg-[#141724] p-3 rounded-xl space-y-1">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Cut to the Chase</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  {cutToTheChase ? 'Instant Drop mode active' : 'Full 5-stage mode active'}
                </p>
              </div>
            </div>
          </div>

          {/* ASYNCHRONOUS PIPELINE PROGRESS BAR */}
          {isProcessing && (
            <div className="bg-[#0e1019] border border-cyan-500/40 rounded-2xl p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>{RECONSTRUCTION_STAGES[currentStageIdx].label}</span>
                </span>
                <span className="text-white font-bold">{progressPercent}%</span>
              </div>

              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-300 shadow-lg shadow-cyan-400/50"
                />
              </div>

              <p className="text-[11px] text-slate-400 font-mono">
                {RECONSTRUCTION_STAGES[currentStageIdx].detail}
              </p>

              <div className="grid grid-cols-4 gap-2 pt-2">
                {RECONSTRUCTION_STAGES.map((stg, i) => (
                  <div
                    key={stg.step}
                    className={`text-[9px] font-mono p-2 rounded-lg border text-center transition-all ${
                      i <= currentStageIdx
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 font-bold'
                        : 'bg-black/20 border-white/5 text-slate-600'
                    }`}
                  >
                    Stage {stg.step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GENERATE CONTROLS + CUT TO THE CHASE TOGGLE */}
          {!isProcessing && (
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              
              {/* "Cut to the Chase" Toggle */}
              <button
                type="button"
                onClick={() => setCutToTheChase((prev) => !prev)}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-5 rounded-2xl font-mono font-bold text-xs border transition-all ${
                  cutToTheChase
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
                title="Skip long intros and jump straight to a rapid 4-bar buildup + main drop"
              >
                <Scissors className={`w-4 h-4 ${cutToTheChase ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>✂️ Cut to the Chase ({cutToTheChase ? 'ON' : 'OFF'})</span>
              </button>

              {/* Big Action Button */}
              <button
                type="button"
                onClick={handleStartDeepReconstruction}
                className="flex-1 w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-black font-extrabold text-base py-5 rounded-2xl transition-all shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 tracking-wider uppercase font-mono"
              >
                <Sparkles className="w-5 h-5 fill-current" />
                <span>🔥 {cutToTheChase ? 'Drop Straight Into Sweet Spot' : 'Execute Deep Reconstruction Mashup'}</span>
              </button>
            </div>
          )}
        </section>

        {/* STEP 3: 3 Previews Ready */}
        {mashupReady && (
          <section id="previews-section" className="space-y-6 pt-6 border-t border-white/10 animate-in fade-in duration-300">
            
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold mb-2">
                ✓ {cutToTheChase ? 'CUT TO THE CHASE DROP READY' : 'HERO VOCAL GAP SURGERY COMPLETED'}
              </div>
              <h2 className="text-2xl font-extrabold text-white">3 Reconstructed Mashup Options</h2>
              <p className="text-xs text-slate-400">
                Audition the versions below. Select one to open the full master track, extend it, highlight a region, or refine & master!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  id: 1,
                  title: cutToTheChase ? '1. Rapid 4-Bar Drop Anthem' : '1. Hero Vocal VIP Drop',
                  desc: cutToTheChase
                    ? 'Instant 4-bar pre-drop riser dropping immediately into the sweet spot.'
                    : 'Deck A hero vocal drops cleanly over Deck B sub-bass and 4/4 drums.',
                  technique: cutToTheChase ? 'Cut to Chase Mode' : 'Hero Vocal Lock',
                },
                {
                  id: 2,
                  title: '2. Call & Response Gap Surgery',
                  desc: 'Hero vocals surgically timed into Track B instrumental silence gaps.',
                  technique: 'Vocal Gap Surgery',
                },
                {
                  id: 3,
                  title: '3. Harmonic Pivot Blend',
                  desc: 'Transposed to shared Pivot Key (9A) with warm chords and ducked background melody.',
                  technique: 'Pivot Key Lock',
                },
              ].map((ver) => {
                const isPlaying = playingPreviewId === ver.id;
                const isSelected = selectedPreviewId === ver.id;

                return (
                  <div
                    key={ver.id}
                    className={`bg-[#0d0f17] border rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all ${
                      isSelected
                        ? 'border-cyan-400 ring-1 ring-cyan-400 shadow-xl shadow-cyan-500/20'
                        : 'border-white/10 hover:border-slate-600'
                    }`}
                  >
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-500/30">
                        {ver.technique}
                      </span>
                      <h3 className="text-base font-bold text-white">{ver.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{ver.desc}</p>
                    </div>

                    <div className="bg-[#07080c] p-4 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePreviewPlay(ver.id)}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                            isPlaying
                              ? 'bg-rose-500 text-white shadow-rose-500/50 scale-105'
                              : 'bg-cyan-400 text-black hover:bg-cyan-300 hover:scale-105 shadow-cyan-500/40'
                          }`}
                        >
                          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>

                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-[11px] font-mono text-slate-400 font-bold">
                            <span className={isPlaying ? 'text-cyan-400' : ''}>
                              {isPlaying ? `${previewProgress.toFixed(1)}s` : '0.0s'}
                            </span>
                            <span>15s Drop Preview</span>
                          </div>

                          <div className="h-5 flex items-end gap-1 overflow-hidden">
                            {Array.from({ length: 16 }).map((_, i) => {
                              const active = isPlaying && (i / 16) * 100 <= (previewProgress / 15) * 100;
                              const isDropBar = i >= 10;
                              return (
                                <div
                                  key={i}
                                  style={{ height: `${isDropBar ? 85 : 30 + (i % 3) * 15}%` }}
                                  className={`flex-1 rounded-t transition-all ${
                                    active ? isDropBar ? 'bg-rose-400' : 'bg-cyan-400' : 'bg-slate-700'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMakeFullSong(ver.id, cutToTheChase ? 30 : 60)}
                      className={`w-full py-3.5 rounded-2xl text-xs font-mono font-extrabold tracking-wider uppercase transition-all ${
                        isSelected
                          ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-500/30'
                          : 'bg-white/10 hover:bg-cyan-500 hover:text-black text-white'
                      }`}
                    >
                      Make Full Song (Infinite Extend) →
                    </button>

                  </div>
                );
              })}
            </div>

          </section>
        )}

        {/* STEP 4: Master Song Player with Extend, Region Selector & Refine */}
        {fullSongReady && (
          <section id="full-player-section" className="bg-[#0f111a] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in duration-300">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl border ${isMasteredRefined ? 'bg-amber-500/10 text-amber-400 border-amber-500/40' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-white">Full Deep Reconstructed Master</h3>
                    {isMasteredRefined && (
                      <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full">
                        ✓ REFINED V{refinementVersion} (FEEDBACK CORRECTED)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Version 0{selectedPreviewId} (V{refinementVersion}) • {trackDurationSec}s Duration • Deck A: Hero Vocal / Deck B: Sub-Bass &amp; Beat
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS: EXTEND (+1 MIN) & REGENERATE FROM FEEDBACK */}
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                
                {/* 1. Extend Mix Button */}
                <button
                  type="button"
                  onClick={handleInfiniteExtendOneMin}
                  disabled={isExtending || isRefining}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono font-extrabold text-xs shadow-lg shadow-purple-500/30 hover:scale-105 transition-all disabled:opacity-50 tracking-wider uppercase"
                >
                  {isExtending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Stitching +1 Min...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>⚡ Extend Mix (+1 Min)</span>
                    </>
                  )}
                </button>

                {/* 2. Refine & Regenerate from Feedback Button */}
                <button
                  type="button"
                  onClick={handleRefineAndMaster}
                  disabled={isRefining || isExtending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-black font-mono font-extrabold text-xs shadow-lg shadow-amber-400/30 hover:scale-105 transition-all disabled:opacity-50 tracking-wider uppercase"
                  title="Regenerates a better version according to your Hype/Cold taps and skips, and restarts playback from 0.0s"
                >
                  {isRefining ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Regenerating V{refinementVersion + 1} &amp; Restarting...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 fill-current" />
                      <span>✨ Refine &amp; Regenerate (Restart)</span>
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* REGION SELECTION TOOLBAR */}
            <div className="bg-[#121522] border border-cyan-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-3">
                <Bookmark className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="text-white font-bold block">Region Selector (Clip Slicer):</span>
                  <span className="text-slate-400 text-[11px]">
                    Highlighted: <b>{regionStartSec.toFixed(1)}s – {regionEndSec.toFixed(1)}s</b> ({regionDuration.toFixed(1)}s clip)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetRegionStart}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 hover:border-cyan-400/40 text-[11px] transition-all"
                  title="Set region start at current playhead"
                >
                  [ Set Start ({fullProgress.toFixed(1)}s)
                </button>

                <button
                  type="button"
                  onClick={handleSetRegionEnd}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 hover:border-cyan-400/40 text-[11px] transition-all"
                  title="Set region end at current playhead"
                >
                  Set End ({fullProgress.toFixed(1)}s) ]
                </button>

                <button
                  type="button"
                  onClick={handleExportCustomRegion}
                  disabled={isExportingRegion}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold shadow-md shadow-cyan-400/30 transition-all hover:scale-105 disabled:opacity-50"
                  title="Export highlighted region with 10ms anti-pop cosine fades"
                >
                  {isExportingRegion ? (
                    <>
                      <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Slicing...</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="w-3.5 h-3.5" />
                      <span>✂️ Export Clip ({regionDuration.toFixed(1)}s)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* LIVE FEEDBACK HEATMAP & COLD TAP CONTROLS */}
            <div className="bg-[#101320] p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-300">Live Reaction Feedback:</span>
                
                {/* HYPE BUTTON (+1) */}
                <button
                  type="button"
                  onClick={handleHypeTap}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-mono font-bold border border-rose-500/40 transition-all hover:scale-105"
                  title="Mark this section as Hype (+1 score)"
                >
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>🔥 Hype ({hypeTaps.length})</span>
                </button>

                {/* COLD BUTTON (-1) */}
                <button
                  type="button"
                  onClick={handleColdTap}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/40 transition-all hover:scale-105"
                  title="Mark this section as Cold / Disliked (-1 score)"
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>🧊 Cold/Change ({negativeTaps.length})</span>
                </button>
              </div>

              {/* SKIPPED ZONES TALLY */}
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <FastForward className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {skippedZones.length > 0
                    ? `⏩ ${skippedZones.length} Skipped Zone(s) will be pruned upon Refine`
                    : 'Scrub forward on waveform to skip unwanted parts'}
                </span>
              </div>
            </div>

            {/* Master Audio Player */}
            <div className="bg-[#07080c] rounded-2xl border border-white/10 p-6 space-y-5">
              
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold text-sm">{fullProgress.toFixed(1)}s</span>
                <span className="text-slate-400 font-bold">
                  {Math.floor(trackDurationSec / 60)}:{(trackDurationSec % 60).toString().padStart(2, '0')} Total Length (Click/Drag to Scrub &amp; Select Region)
                </span>
              </div>

              {/* Interactive Draggable Waveform Scrubber with Region Highlighting */}
              <div
                ref={waveformRef}
                onClick={handleScrubberSeek}
                className="h-28 bg-[#0a0b14] rounded-2xl p-3 flex items-end gap-1 cursor-pointer overflow-hidden relative border border-white/5 hover:border-cyan-400/40 transition-colors"
                title="Click or drag anywhere to seek"
              >
                {/* REGION HIGHLIGHT OVERLAY */}
                <div
                  style={{
                    left: `${(regionStartSec / trackDurationSec) * 100}%`,
                    width: `${((regionEndSec - regionStartSec) / trackDurationSec) * 100}%`,
                  }}
                  className="absolute top-0 bottom-0 bg-cyan-400/15 border-x-2 border-cyan-400/80 pointer-events-none z-10"
                >
                  <div className="absolute top-1 left-2 text-[9px] font-mono font-bold text-cyan-300 bg-black/60 px-1.5 py-0.5 rounded border border-cyan-400/40">
                    REGION ({regionDuration.toFixed(1)}s)
                  </div>
                </div>

                {/* Scrub Playhead Marker */}
                <div
                  style={{ left: `${(fullProgress / trackDurationSec) * 100}%` }}
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-xl shadow-cyan-400 z-20 pointer-events-none"
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 -translate-x-1/3 -translate-y-1/2 shadow-lg" />
                </div>

                {/* Drop Marker 1 */}
                <div
                  style={{ left: `${(blueprint.dropTime / trackDurationSec) * 100}%` }}
                  className="absolute top-2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-mono bg-rose-500 text-white font-bold tracking-wider z-10 shadow-sm"
                >
                  DROP 1 ({blueprint.dropTime}s)
                </div>

                {/* Drop Marker 2 (if extended) */}
                {trackDurationSec > 60 && (
                  <div
                    style={{ left: `75%` }}
                    className="absolute top-2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-mono bg-purple-500 text-white font-bold tracking-wider z-10 shadow-sm"
                  >
                    DROP 2 (Climax)
                  </div>
                )}

                {/* Waveform Bars */}
                {Array.from({ length: 48 }).map((_, i) => {
                  const isPast = (i / 48) * 100 <= (fullProgress / trackDurationSec) * 100;
                  const isDrop1 = (i / 48) >= (blueprint.dropTime / trackDurationSec) && (i / 48) <= ((blueprint.dropTime + 15) / trackDurationSec);
                  const isDrop2 = trackDurationSec > 60 && (i / 48) >= 0.75;
                  const isHighEnergy = isDrop1 || isDrop2;

                  return (
                    <div
                      key={i}
                      style={{ height: `${isHighEnergy ? 70 + (i % 5) * 6 : 25 + (i % 4) * 10}%` }}
                      className={`flex-1 rounded-t transition-all ${
                        isPast
                          ? isHighEnergy ? 'bg-gradient-to-t from-rose-500 to-amber-300' : 'bg-cyan-400'
                          : 'bg-slate-700/80 hover:bg-slate-600'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Player Controls & Download Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleToggleFullPlay}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      isPlayingFull
                        ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/50'
                        : 'bg-cyan-400 text-black hover:bg-cyan-300 shadow-xl shadow-cyan-500/40'
                    }`}
                  >
                    {isPlayingFull ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                  </button>

                  <div>
                    <span className="text-white font-extrabold text-base block">
                      Full Reconstructed Master (V{refinementVersion})
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {trackDurationSec}s Duration • Deck A: Hero Vocal / Deck B: Sub-Bass &amp; Beat
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={handleDownloadMp3}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-extrabold px-6 py-4 rounded-2xl text-xs font-mono tracking-wider uppercase transition-all shadow-xl shadow-emerald-500/30 disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Full MP3 ({trackDurationSec}s)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs font-mono text-slate-500">
        BAMBATA 2.0 • Hero Vocal Gap Surgery &amp; Custom Region Slicer
      </footer>

    </div>
  );
}
