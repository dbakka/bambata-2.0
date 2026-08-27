'use client';

import React, { useState } from 'react';
import {
  Sliders,
  X,
  Play,
  Pause,
  Zap,
  Flame,
  Volume2,
  Filter,
  Layers,
  Sparkles,
  Check,
  RotateCcw,
  Activity
} from 'lucide-react';
import { webAudioEngine } from '../lib/webAudioEngine';

export interface TransitionConfig {
  start_ms: number;
  end_ms: number;
  crossfade_curve: 'linear' | 'exponential' | 'cut';
  eq_swap: {
    drop_outgoing_bass_at_ms: number;
    bring_in_incoming_bass_at_ms: number;
    melody_swap_at_ms: number;
    vocal_swap_at_ms: number;
  };
  effects: {
    outgoing_filter: 'none' | 'high-pass-sweep' | 'low-pass-sweep' | 'echo-out';
    incoming_filter: 'none' | 'high-pass-sweep' | 'low-pass-sweep';
    filter_cutoff_start_hz: number;
    filter_cutoff_end_hz: number;
    pre_drop_silence_ms: number;
  };
  stem_volumes: {
    track_a_vocals: number;
    track_a_melody: number;
    track_a_bass: number;
    track_a_drums: number;
    track_b_vocals: number;
    track_b_melody: number;
    track_b_bass: number;
    track_b_drums: number;
  };
}

interface TransitionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: TransitionConfig) => void;
  initialConfig?: Partial<TransitionConfig>;
  track1Name: string;
  track2Name: string;
  totalDurationMs?: number;
}

export default function TransitionEditorModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  track1Name,
  track2Name,
  totalDurationMs = 30000,
}: TransitionEditorModalProps) {
  // Config state
  const [curve, setCurve] = useState<'linear' | 'exponential' | 'cut'>(
    initialConfig?.crossfade_curve || 'exponential'
  );
  const [startMs, setStartMs] = useState<number>(initialConfig?.start_ms || 8000);
  const [endMs, setEndMs] = useState<number>(initialConfig?.end_ms || 22000);

  // EQ / Stem Swap Points
  const [dropBassA, setDropBassA] = useState<number>(
    initialConfig?.eq_swap?.drop_outgoing_bass_at_ms || 15000
  );
  const [bringBassB, setBringBassB] = useState<number>(
    initialConfig?.eq_swap?.bring_in_incoming_bass_at_ms || 15000
  );
  const [melodySwap, setMelodySwap] = useState<number>(
    initialConfig?.eq_swap?.melody_swap_at_ms || 15000
  );
  const [vocalSwap, setVocalSwap] = useState<number>(
    initialConfig?.eq_swap?.vocal_swap_at_ms || 20000
  );

  // Effects & Filters
  const [outgoingFilter, setOutgoingFilter] = useState<'none' | 'high-pass-sweep' | 'low-pass-sweep' | 'echo-out'>(
    initialConfig?.effects?.outgoing_filter || 'high-pass-sweep'
  );
  const [preDropSilenceMs, setPreDropSilenceMs] = useState<number>(
    initialConfig?.effects?.pre_drop_silence_ms || 350
  );

  // Stem Volumes
  const [volVocalsA, setVolVocalsA] = useState<number>(1.2);
  const [volBassB, setVolBassB] = useState<number>(1.1);

  // Audition Playback State
  const [isPlayingAudition, setIsPlayingAudition] = useState<boolean>(false);
  const [auditionProgress, setAuditionProgress] = useState<number>(0);

  if (!isOpen) return null;

  const handleAuditionToggle = () => {
    if (isPlayingAudition) {
      webAudioEngine.stop();
      setIsPlayingAudition(false);
      setAuditionProgress(0);
    } else {
      setIsPlayingAudition(true);
      webAudioEngine.referenceDropTime = dropBassA / 1000.0;
      webAudioEngine.playMashupPreview(
        1,
        15,
        outgoingFilter === 'high-pass-sweep' ? 'High-pass sweep' : '',
        (curr) => setAuditionProgress(curr),
        () => {
          setIsPlayingAudition(false);
          setAuditionProgress(0);
        }
      );
    }
  };

  const handleSave = () => {
    webAudioEngine.stop();
    setIsPlayingAudition(false);

    const fullConfig: TransitionConfig = {
      start_ms: startMs,
      end_ms: endMs,
      crossfade_curve: curve,
      eq_swap: {
        drop_outgoing_bass_at_ms: dropBassA,
        bring_in_incoming_bass_at_ms: bringBassB,
        melody_swap_at_ms: melodySwap,
        vocal_swap_at_ms: vocalSwap,
      },
      effects: {
        outgoing_filter: outgoingFilter,
        incoming_filter: 'none',
        filter_cutoff_start_hz: 180,
        filter_cutoff_end_hz: 3500,
        pre_drop_silence_ms: preDropSilenceMs,
      },
      stem_volumes: {
        track_a_vocals: volVocalsA,
        track_a_melody: 0.8,
        track_a_bass: 1.0,
        track_a_drums: 1.0,
        track_b_vocals: 0.0,
        track_b_melody: 0.8,
        track_b_bass: volBassB,
        track_b_drums: 1.0,
      },
    };

    onSave(fullConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0e1018] border border-cyan-500/40 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-400 text-black">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-white">Custom Transition Editor</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                  SPOTIFY DJ MODE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Granular crossfade, stem EQ swaps, and filter sweeps between Track 1 and Track 2
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              webAudioEngine.stop();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Transition Zone Timeline */}
        <div className="bg-[#07080d] p-4 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-cyan-400 font-bold">Overlap Zone: {(startMs/1000).toFixed(1)}s → {(endMs/1000).toFixed(1)}s</span>
            <span className="text-rose-400 font-bold">⚡ Bass Swap @ {(dropBassA/1000).toFixed(1)}s</span>
          </div>

          <div className="h-14 bg-[#0a0c14] rounded-xl border border-white/5 p-1 relative overflow-hidden flex flex-col justify-between">
            {/* Outgoing Track A Bar */}
            <div
              style={{ width: `${(dropBassA / 30000) * 100}%` }}
              className="h-5 rounded bg-cyan-500/40 text-cyan-200 text-[9px] font-mono font-bold flex items-center px-2 truncate"
            >
              Track 1: {track1Name.slice(0, 20)}... (Bass Drops @ {(dropBassA/1000).toFixed(1)}s)
            </div>

            {/* Incoming Track B Bar */}
            <div
              style={{
                marginLeft: `${(bringBassB / 30000) * 100}%`,
                width: `${100 - (bringBassB / 30000) * 100}%`,
              }}
              className="h-5 rounded bg-purple-500/60 text-purple-100 text-[9px] font-mono font-bold flex items-center px-2 truncate"
            >
              Track 2: {track2Name.slice(0, 20)}... (Bass In @ {(bringBassB/1000).toFixed(1)}s)
            </div>
          </div>
        </div>

        {/* 3 Transition Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* TOOL 1: Volume Crossfade Curve */}
          <div className="bg-[#121522] p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <Volume2 className="w-4 h-4" />
              <span>1. Crossfade Curve</span>
            </div>

            <div className="space-y-2">
              {[
                { id: 'exponential', label: 'Exponential (Equal Power)', desc: 'Constant energy club blend' },
                { id: 'linear', label: 'Linear', desc: 'Even continuous fade' },
                { id: 'cut', label: 'Hard Cut', desc: 'Instant switch at drop' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCurve(c.id as any)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                    curve === c.id
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 font-bold'
                      : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <div>{c.label}</div>
                  <span className="text-[10px] opacity-70 block">{c.desc}</span>
                </button>
              ))}
            </div>

            {/* Vocal Volume Boost */}
            <div className="space-y-1 pt-2 border-t border-white/5">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>Vocals Gain:</span>
                <span className="text-cyan-400">{volVocalsA.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={volVocalsA}
                onChange={(e) => setVolVocalsA(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          {/* TOOL 2: Stem EQ Swap (Lows, Mids, Highs) */}
          <div className="bg-[#121522] p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>2. Stem EQ Swap Point</span>
            </div>

            <div className="space-y-3">
              {/* Drop Track A Bass Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-300">
                  <span>Cut Track A Bass:</span>
                  <span className="text-purple-300">{(dropBassA/1000).toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="25000"
                  step="500"
                  value={dropBassA}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setDropBassA(val);
                    setBringBassB(val); // Sync incoming bass
                  }}
                  className="w-full accent-purple-400"
                />
              </div>

              {/* Bring in Track B Bass Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-300">
                  <span>Drop Track B Bass:</span>
                  <span className="text-emerald-400">{(bringBassB/1000).toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="25000"
                  step="500"
                  value={bringBassB}
                  onChange={(e) => setBringBassB(parseInt(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>

              {/* Track B Sub Bass Boost */}
              <div className="space-y-1 pt-2 border-t border-white/5">
                <div className="flex justify-between text-[11px] font-mono text-slate-300">
                  <span>Sub Bass Power:</span>
                  <span className="text-purple-400">{volBassB.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.8"
                  step="0.1"
                  value={volBassB}
                  onChange={(e) => setVolBassB(parseFloat(e.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>
            </div>
          </div>

          {/* TOOL 3: Filter Sweeps & Drop Gap */}
          <div className="bg-[#121522] p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <Filter className="w-4 h-4" />
              <span>3. Filter & Tension</span>
            </div>

            <div className="space-y-2">
              {[
                { id: 'high-pass-sweep', label: 'High-Pass Sweep (Tension)' },
                { id: 'echo-out', label: '1/8th Echo-Out Delay' },
                { id: 'none', label: 'No Filter' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOutgoingFilter(f.id as any)}
                  className={`w-full text-left p-2 rounded-xl border text-xs transition-all ${
                    outgoingFilter === f.id
                      ? 'bg-rose-500/20 text-rose-200 border-rose-400 font-bold'
                      : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Pre-Drop Silence Gap Slider */}
            <div className="space-y-1 pt-2 border-t border-white/5">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>Pre-Drop Breath Pause:</span>
                <span className="text-rose-400">{preDropSilenceMs}ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="800"
                step="50"
                value={preDropSilenceMs}
                onChange={(e) => setPreDropSilenceMs(parseInt(e.target.value))}
                className="w-full accent-rose-400"
              />
              <span className="text-[10px] text-slate-500 font-mono block">
                1-beat silence gap right before the bass drops
              </span>
            </div>
          </div>

        </div>

        {/* Audition Player & Save Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/10">
          
          {/* Live Audition Button */}
          <button
            type="button"
            onClick={handleAuditionToggle}
            className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-xs font-mono font-bold transition-all shadow-lg ${
              isPlayingAudition
                ? 'bg-rose-500 text-white shadow-rose-500/40 scale-105'
                : 'bg-[#181c2e] hover:bg-[#20253d] text-cyan-300 border border-cyan-500/30'
            }`}
          >
            {isPlayingAudition ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlayingAudition ? `Auditioning (${auditionProgress.toFixed(1)}s)...` : '▶ Audition Custom Blend'}</span>
          </button>

          {/* Save & Apply */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                webAudioEngine.stop();
                onClose();
              }}
              className="px-5 py-3 rounded-2xl text-xs font-mono text-slate-400 hover:text-white bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold px-8 py-3.5 rounded-2xl text-xs font-mono uppercase tracking-wider shadow-xl shadow-cyan-500/30 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply Transition</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
