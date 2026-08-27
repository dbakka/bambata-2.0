'use client';

import React from 'react';
import { Cpu, Terminal, CheckCircle2, Loader2, Sparkles, AudioWaveform as WaveformIcon } from 'lucide-react';
import { MashupJobStatus } from '../lib/types';

interface AsyncProcessingViewProps {
  jobStatus: MashupJobStatus | null;
}

export default function AsyncProcessingView({ jobStatus }: AsyncProcessingViewProps) {
  const percent = jobStatus?.progress_percent ?? 15;
  const stage = jobStatus?.current_stage_label ?? 'Initializing Serverless GPU Worker...';
  const logs = jobStatus?.logs ?? ['[00:00:01] Job submitted to Modal Serverless GPU Queue...'];

  const stages = [
    { label: 'Demucs v4 4-Stem Separation', desc: 'Isolating vocals, drums, bass, synths on NVIDIA A10G' },
    { label: 'pyrubberband Time-Stretching', desc: 'Phase-vocoder BPM alignment & Camelot key shifts' },
    { label: 'Drop Snippet Generation', desc: 'Rendering 3 x 15-second audition variations' },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-cyan-500/30 shadow-xl shadow-cyan-950/20 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Cpu className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span>Serverless GPU Audio Processing</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                A10G RUNNING
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Modal Serverless GPU • Zero Idle Cost Worker Pipeline
            </p>
          </div>
        </div>

        {/* Big Percentage Display */}
        <div className="text-right">
          <span className="text-3xl font-extrabold font-mono text-cyan-400">{percent}%</span>
          <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest">Pipeline Progress</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-cyan-300 font-medium">{stage}</span>
          <span className="text-slate-400">{percent < 100 ? 'Processing...' : 'Complete!'}</span>
        </div>
        <div className="w-full h-3 bg-[#0a0b10] rounded-full overflow-hidden border border-studio-border p-0.5">
          <div
            style={{ width: `${percent}%` }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-500 shadow-md shadow-cyan-500/50"
          />
        </div>
      </div>

      {/* 3 Step Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stages.map((st, i) => {
          const isDone = percent > (i + 1) * 30;
          const isCurrent = percent >= i * 30 && percent <= (i + 1) * 30;
          return (
            <div
              key={i}
              className={`p-4 rounded-xl border transition-all ${
                isDone
                  ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-200'
                  : isCurrent
                  ? 'bg-purple-950/30 border-purple-500/50 text-purple-200 shadow-lg shadow-purple-950/40'
                  : 'bg-[#0d0f17] border-studio-border text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Step 0{i + 1}</span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                )}
              </div>
              <h4 className="text-xs font-bold text-white mb-1">{st.label}</h4>
              <p className="text-[11px] text-slate-400 font-mono">{st.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Live Worker Terminal / Logs Stream */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Worker Log Output (Live Stream)</span>
          </span>
          <span className="text-[10px] text-emerald-400">● STDOUT ACTIVE</span>
        </div>
        <div className="bg-[#07080c] rounded-xl border border-studio-border p-4 font-mono text-xs text-slate-300 h-36 overflow-y-auto space-y-1.5 shadow-inner">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-cyan-500/60 select-none">&gt;</span>
              <span className={log.includes('ERROR') ? 'text-rose-400' : log.includes('successfully') ? 'text-emerald-300' : 'text-slate-300'}>
                {log}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
