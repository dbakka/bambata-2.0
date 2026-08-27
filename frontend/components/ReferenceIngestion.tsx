'use client';

import React, { useState } from 'react';
import { Youtube, Video, Link2, Sparkles, Upload, Flame, CheckCircle, FileVideo } from 'lucide-react';
import { ReferenceAnalysis } from '../lib/types';

interface ReferenceIngestionProps {
  onAnalysisComplete: (analysis: ReferenceAnalysis) => void;
  analysis: ReferenceAnalysis | null;
  isLoading: boolean;
  onAnalyzeUrl: (url: string) => Promise<void>;
  onAnalyzeVideoFile: (file: File) => Promise<void>;
}

export default function ReferenceIngestion({
  onAnalysisComplete,
  analysis,
  isLoading,
  onAnalyzeUrl,
  onAnalyzeVideoFile,
}: ReferenceIngestionProps) {
  const [tab, setTab] = useState<'link' | 'video'>('link');
  const [url, setUrl] = useState('https://www.youtube.com/watch?v=wXhTHyIgQ_U');
  const [videoFileName, setVideoFileName] = useState<string | null>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAnalyzeUrl(url.trim());
    }
  };

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFileName(file.name);
      onAnalyzeVideoFile(file);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl">
      
      {/* Top Selector: Link vs Video Upload */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-2">
            <span>1. Choose Reference Style</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              TIKTOK • YT • VIDEO
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            BAMBATA extracts the drop, tempo & energy curve from any video, screen recording, or social link.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-[#0e1018] p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setTab('link')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === 'link'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Social Link</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('video')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === 'video'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video / Screen Recording</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Social Media Link (TikTok, YouTube, IG) */}
      {tab === 'link' ? (
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste TikTok, YouTube, or Instagram link..."
                className="w-full bg-[#0a0b10] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold px-8 py-4 rounded-2xl text-sm transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Extracting Audio...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Analyze Reference</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-500 font-mono">Presets:</span>
            <button
              type="button"
              onClick={() => {
                setUrl('https://www.tiktok.com/@producer/video/mashup-demo');
                onAnalyzeUrl('https://www.tiktok.com/@producer/video/mashup-demo');
              }}
              className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-all"
            >
              📱 TikTok Club Viral Mashup
            </button>
            <button
              type="button"
              onClick={() => {
                setUrl('https://www.youtube.com/watch?v=wXhTHyIgQ_U');
                onAnalyzeUrl('https://www.youtube.com/watch?v=wXhTHyIgQ_U');
              }}
              className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-all"
            >
               Mau P - Amsterdam (126 BPM)
            </button>
          </div>
        </form>
      ) : (
        /* Mode 2: Screen Recording / Video File Drop */
        <div className="space-y-4">
          <label className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-[#0a0b10] hover:bg-[#0e111a] transition-all group">
            <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <FileVideo className="w-8 h-8" />
            </div>
            <div className="text-center">
              <span className="text-sm font-bold text-white block">
                {videoFileName ? `Selected: ${videoFileName}` : 'Drop Screen Recording or Video File Here'}
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                Supports .mp4, .mov, .webm, .mkv, screen recordings, or audio files
              </span>
            </div>
            <span className="px-4 py-1.5 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Auto Audio Extraction
            </span>
            <input
              type="file"
              accept="video/*,audio/*,.mp4,.mov,.mkv,.webm,.wav,.mp3"
              className="hidden"
              onChange={handleFileDrop}
            />
          </label>
        </div>
      )}

      {/* Reference Analysis Summary */}
      {analysis && (
        <div className="bg-[#0b0d14] rounded-2xl p-5 border border-white/10 space-y-4 animate-in fade-in">
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                Audio Extracted & Reverse-Engineered
              </span>
            </div>
            <span className="text-xs text-slate-400 truncate max-w-xs">{analysis.video_title}</span>
          </div>

          {/* Simple Metrics Badges */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-[#121520] p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">Target BPM</span>
              <span className="text-lg font-bold font-mono text-cyan-400">{analysis.bpm} BPM</span>
            </div>
            <div className="bg-[#121520] p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">Camelot Key</span>
              <span className="text-lg font-bold font-mono text-purple-400">{analysis.key_info.camelot_code}</span>
            </div>
            <div className="bg-[#121520] p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">Drop Point</span>
              <span className="text-lg font-bold font-mono text-rose-400 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 fill-rose-400" />
                {analysis.primary_drop_time}s
              </span>
            </div>
          </div>

          {/* Clean Segment Visualizer */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Energy Structure ({analysis.duration_seconds}s)</span>
              <span className="text-rose-400">⚡ Drop @ {analysis.primary_drop_time}s</span>
            </div>
            <div className="w-full h-8 bg-[#06070a] rounded-xl border border-white/10 p-1 flex gap-1 items-center overflow-hidden">
              {analysis.segments.map((seg, idx) => {
                const widthPercent = ((seg.end_time - seg.start_time) / analysis.duration_seconds) * 100;
                const isDrop = seg.label === 'drop';
                return (
                  <div
                    key={idx}
                    style={{ width: `${widthPercent}%` }}
                    className={`h-full rounded-md flex items-center justify-center text-[9px] font-mono font-bold uppercase ${
                      isDrop
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40'
                        : seg.label === 'build'
                        ? 'bg-amber-500/30 text-amber-300'
                        : 'bg-cyan-950 text-cyan-300'
                    }`}
                  >
                    <span className="truncate">{seg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
