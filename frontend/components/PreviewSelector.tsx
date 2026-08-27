'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle, Volume2, Sparkles, ArrowRight, Zap, Music2 } from 'lucide-react';
import { PreviewOption } from '../lib/types';
import { webAudioEngine } from '../lib/webAudioEngine';

interface PreviewSelectorProps {
  previews: PreviewOption[];
  selectedPreviewId: number;
  onSelectPreview: (id: number) => void;
  onTriggerFinalRender: () => void;
  isRenderingFinal: boolean;
}

export default function PreviewSelector({
  previews,
  selectedPreviewId,
  onSelectPreview,
  onTriggerFinalRender,
  isRenderingFinal,
}: PreviewSelectorProps) {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      webAudioEngine.stop();
    };
  }, []);

  const handleTogglePlay = (id: number) => {
    if (playingId === id) {
      webAudioEngine.stop();
      setPlayingId(null);
      setProgress(0);
    } else {
      setPlayingId(id);
      setProgress(0);
      webAudioEngine.playPreview(
        id,
        15,
        (currTime) => setProgress(currTime),
        () => {
          setPlayingId(null);
          setProgress(0);
        }
      );
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/30 shadow-2xl animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500 text-black">
              REAL AUDIO AUDITION
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-wide">
              3. Listen & Pick Your Favorite Drop
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Click the big Play buttons below to audition 3 real 15-second drop mashup variations.
          </p>
        </div>
      </div>

      {/* 3 Large, Clean Audition Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {previews.map((option) => {
          const isSelected = selectedPreviewId === option.preview_id;
          const isPlaying = playingId === option.preview_id;
          const progressPercent = (progress / 15) * 100;

          return (
            <div
              key={option.preview_id}
              onClick={() => onSelectPreview(option.preview_id)}
              className={`rounded-2xl p-6 border transition-all cursor-pointer flex flex-col justify-between space-y-5 ${
                isSelected
                  ? 'bg-gradient-to-b from-[#161a2e] to-[#0f1220] border-cyan-400 ring-2 ring-cyan-400 shadow-2xl shadow-cyan-500/20'
                  : 'bg-[#0a0c13] border-white/10 hover:border-slate-600 hover:bg-[#0e111a]'
              }`}
            >
              {/* Header & Tag */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase font-bold tracking-widest text-cyan-400">
                    Option 0{option.preview_id}
                  </span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isSelected ? 'bg-cyan-400 border-cyan-300 text-black' : 'border-slate-600'
                  }`}>
                    {isSelected && <CheckCircle className="w-5 h-5 fill-black text-cyan-400" />}
                  </div>
                </div>

                <h3 className="text-base font-bold text-white leading-tight">{option.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{option.description}</p>
              </div>

              {/* Big Interactive Audio Player Card */}
              <div className="bg-[#05060a] p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePlay(option.preview_id);
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                      isPlaying
                        ? 'bg-rose-500 text-white shadow-rose-500/50 scale-105'
                        : 'bg-cyan-400 text-black hover:bg-cyan-300 hover:scale-105 shadow-cyan-500/40'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 font-bold">
                      <span className={isPlaying ? 'text-cyan-400' : ''}>{isPlaying ? `${progress.toFixed(1)}s` : '0.0s'}</span>
                      <span>15.0s Drop</span>
                    </div>

                    {/* Animated Waveform Visualizer */}
                    <div className="h-6 flex items-end gap-1 overflow-hidden">
                      {Array.from({ length: 18 }).map((_, bIdx) => {
                        const isBarActive = isPlaying && (bIdx / 18) * 100 <= progressPercent;
                        const barHeight = 30 + Math.sin(bIdx * 0.6 + (isPlaying ? progress * 6 : 0)) * 30 + (bIdx % 2) * 20;
                        return (
                          <div
                            key={bIdx}
                            style={{ height: `${Math.min(100, Math.max(15, barHeight))}%` }}
                            className={`flex-1 rounded-t transition-all duration-75 ${
                              isBarActive
                                ? 'bg-cyan-400 shadow-sm shadow-cyan-400/80'
                                : 'bg-slate-700/60'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Stem Pill Badges */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {option.stem_breakdown.map((stem, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 text-slate-300 border border-white/5"
                    >
                      {stem}
                    </span>
                  ))}
                </div>
              </div>

              {/* Select Button */}
              <button
                type="button"
                onClick={() => onSelectPreview(option.preview_id)}
                className={`w-full py-3 rounded-xl text-xs font-mono font-bold transition-all ${
                  isSelected
                    ? 'bg-cyan-500 text-black font-extrabold shadow-md shadow-cyan-500/30'
                    : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {isSelected ? '✓ Selected for Master Mix' : 'Choose This Version'}
              </button>

            </div>
          );
        })}
      </div>

      {/* CTA: Trigger Final Master Render */}
      <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-slate-400 font-mono">
          Ready to export: <span className="text-cyan-300 font-bold">Option 0{selectedPreviewId}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            webAudioEngine.stop();
            onTriggerFinalRender();
          }}
          disabled={isRenderingFinal}
          className="flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-black font-extrabold px-8 py-4 rounded-2xl text-sm transition-all shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:opacity-50 tracking-wider uppercase font-mono"
        >
          {isRenderingFinal ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Generating Master MP3...</span>
            </>
          ) : (
            <>
              <span>Generate Full Master MP3</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

    </div>
  );
}
