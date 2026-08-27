'use client';

import React from 'react';
import { Sparkles, Brain, Sliders, Music, Compass } from 'lucide-react';
import { ReferenceAnalysis } from '../lib/types';

interface CreativeBrainInputProps {
  prompt: string;
  setPrompt: (p: string) => void;
  referenceAnalysis: ReferenceAnalysis | null;
}

export default function CreativeBrainInput({
  prompt,
  setPrompt,
  referenceAnalysis,
}: CreativeBrainInputProps) {
  const presets = [
    { label: '1-Min Club Drop', text: '1-minute punchy club edit with high-energy acapella drop' },
    { label: 'Smooth Vocal Blend', text: 'Smooth melodic vocal transition maintaining deep bass groove' },
    { label: 'Festival Banger', text: 'Aggressive 4-bar buildup with heavy stutter vocal climax' },
    { label: 'Afrobeats / Amapiano Fusion', text: 'Warm log-drum polyrhythms backing soulful top-line vocal' },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5 border border-studio-border">
      
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              2. The Brain: Creative Direction & Camelot Harmonic Engine
            </h2>
            <p className="text-xs text-slate-400">
              Gemini LLM automatically aligns BPM, calculates Camelot semitone key shifts, and arranges stem automations.
            </p>
          </div>
        </div>
      </div>

      {/* Text Prompt Input */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
          Creative Goal / Mashup Prompt
        </label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your desired mashup structure, energy flow, and vocal/drum routing..."
          className="w-full bg-[#0d0f17] border border-studio-border rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans resize-none"
        />
      </div>

      {/* Prompt Preset Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          Quick Preset Blueprints:
        </span>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPrompt(preset.text)}
              className="px-3 py-1.5 rounded-lg bg-[#141724] hover:bg-purple-950/50 hover:text-purple-300 text-slate-300 border border-studio-border text-xs transition-all font-medium flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Harmonic Alignment Preview Bar */}
      {referenceAnalysis && (
        <div className="bg-[#0e1018] p-4 rounded-xl border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-purple-400" />
            <div>
              <span className="text-white font-semibold block">Camelot Grid Transposition:</span>
              <span className="text-slate-400">Targeting {referenceAnalysis.bpm} BPM @ {referenceAnalysis.key_info.camelot_code} ({referenceAnalysis.key_info.key_name})</span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px]">
              Harmonic Resonance: 100%
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
