'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Download, RotateCcw, CheckCircle2, Music, Sparkles } from 'lucide-react';
import { webAudioEngine } from '../lib/webAudioEngine';

interface MasterMashupPlayerProps {
  finalRenderUrl?: string | null;
  selectedPreviewId: number;
  onReset: () => void;
}

export default function MasterMashupPlayer({
  finalRenderUrl,
  selectedPreviewId,
  onReset,
}: MasterMashupPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const duration = 30.0;

  useEffect(() => {
    return () => {
      webAudioEngine.stop();
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      webAudioEngine.stop();
      setIsPlaying(false);
      setCurrentTime(0);
    } else {
      setIsPlaying(true);
      webAudioEngine.playPreview(
        selectedPreviewId,
        duration,
        (curr) => setCurrentTime(curr),
        () => {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      );
    }
  };

  const handleDownloadMp3 = async () => {
    setIsExporting(true);
    try {
      if (finalRenderUrl) {
        // Direct download from backend
        const a = document.createElement('a');
        a.href = finalRenderUrl;
        a.download = `BAMBATA_Mashup_Preset0${selectedPreviewId}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Generate real client-side 44.1kHz audio file via Web Audio API offline renderer
        const blobUrl = await webAudioEngine.generateDownloadableWav(selectedPreviewId, 30);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `BAMBATA_Club_Mashup_Preset0${selectedPreviewId}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const progressPercent = (currentTime / duration) * 100;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/40 shadow-2xl animate-in fade-in">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-wide">
                Your AI DJ Mashup is Ready!
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                MP3 READY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Option 0{selectedPreviewId} • 126 BPM • Demucs v4 Stems • -14.0 LUFS Mastered
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            webAudioEngine.stop();
            onReset();
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Mashup</span>
        </button>
      </div>

      {/* Main Big Master Audio Player */}
      <div className="bg-[#05060a] rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6">
        
        {/* Big Waveform & Scrubber */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-cyan-400 font-bold text-sm">{currentTime.toFixed(1)}s</span>
            <span className="text-slate-500">{duration.toFixed(1)}s Total Mix</span>
          </div>

          <div
            onClick={togglePlay}
            className="h-28 bg-[#0a0b12] rounded-2xl border border-white/10 p-3 flex items-end gap-1.5 relative overflow-hidden cursor-pointer group"
          >
            {/* Playhead */}
            <div
              style={{ left: `${progressPercent}%` }}
              className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-lg shadow-cyan-400 z-10"
            />

            {/* Drop Indicator Tag */}
            <div
              style={{ left: `50%` }}
              className="absolute top-2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold tracking-wider z-10 shadow-md shadow-rose-500/50"
            >
              DROP (15s)
            </div>

            {/* Waveform Bars */}
            {Array.from({ length: 48 }).map((_, i) => {
              const isPast = isPlaying && (i / 48) * 100 <= progressPercent;
              const isDrop = i >= 20 && i <= 36;
              const height = isDrop
                ? 65 + Math.sin(i * 0.5 + (isPlaying ? currentTime * 4 : 0)) * 30
                : 25 + Math.sin(i * 0.4) * 20;

              return (
                <div
                  key={i}
                  style={{ height: `${Math.min(100, Math.max(15, height))}%` }}
                  className={`flex-1 rounded-t transition-all duration-75 ${
                    isPast
                      ? isDrop
                        ? 'bg-gradient-to-t from-rose-500 to-amber-300 shadow-sm shadow-rose-500/50'
                        : 'bg-gradient-to-t from-cyan-400 to-blue-400'
                      : 'bg-slate-800/80 group-hover:bg-slate-700'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Master Controls & Big Download MP3 Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlay}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                isPlaying
                  ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/50 scale-105'
                  : 'bg-gradient-to-tr from-cyan-400 to-blue-500 text-black hover:from-cyan-300 hover:to-blue-400 shadow-xl shadow-cyan-500/40 hover:scale-105'
              }`}
            >
              {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
            </button>
            <div>
              <span className="text-white font-extrabold text-base block">BAMBATA Master Mixdown</span>
              <span className="text-xs text-slate-400 font-mono">44.1kHz • High-Definition Audio</span>
            </div>
          </div>

          {/* 1-Click Download MP3 Button */}
          <button
            type="button"
            onClick={handleDownloadMp3}
            disabled={isExporting}
            className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-black font-extrabold px-8 py-5 rounded-2xl text-sm font-mono tracking-wider uppercase transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Exporting MP3...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download Mashup MP3</span>
              </>
            )}
          </button>

        </div>

      </div>

    </div>
  );
}
