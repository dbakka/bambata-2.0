'use client';

import React from 'react';
import { Youtube, ExternalLink, Sparkles, Music, ArrowUpRight, PlusCircle } from 'lucide-react';
import { RecommendedTrack } from '../lib/types';

interface RecommendationCarouselProps {
  recommendations: RecommendedTrack[];
  masterBpm: number;
  masterKey: string;
  onSelectTrackAsReference: (url: string) => void;
}

export default function RecommendationCarousel({
  recommendations,
  masterBpm,
  masterKey,
  onSelectTrackAsReference,
}: RecommendationCarouselProps) {
  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-purple-500/30 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Youtube className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              5. Retention Loop: Next Track Recommendations
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Harmonically matched via YouTube Data API based on your master key ({masterKey}) & tempo ({masterBpm} BPM).
          </p>
        </div>
      </div>

      {/* 3 Recommended Track Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {recommendations.map((track, idx) => (
          <div
            key={idx}
            className="bg-[#0e1018] rounded-xl border border-studio-border hover:border-purple-500/50 p-5 flex flex-col justify-between space-y-4 transition-all group"
          >
            {/* Thumbnail / Header */}
            <div className="space-y-3">
              <div className="relative h-32 rounded-lg overflow-hidden bg-slate-900 border border-white/5">
                <img
                  src={track.thumbnail_url}
                  alt={track.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/90 text-purple-300 border border-purple-500/40">
                  {track.camelot_key} • {track.bpm} BPM
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors">
                  {track.title}
                </h3>
                <span className="text-xs text-slate-400 font-mono block mt-1">
                  {track.artist}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans bg-[#131624] p-2.5 rounded-lg border border-white/5">
                {track.compatibility_reason}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <a
                href={track.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-mono text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-studio-border transition-all"
              >
                <span>YouTube</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <button
                type="button"
                onClick={() => onSelectTrackAsReference(track.youtube_url)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-mono font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Remix This</span>
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
