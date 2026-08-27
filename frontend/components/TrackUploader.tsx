'use client';

import React from 'react';
import { Upload, Music2, Layers, Check, ArrowRight, Mic2, Drum } from 'lucide-react';
import { TrackMetadata } from '../lib/types';

interface TrackUploaderProps {
  trackA: TrackMetadata;
  trackB: TrackMetadata;
  setTrackA: React.Dispatch<React.SetStateAction<TrackMetadata>>;
  setTrackB: React.Dispatch<React.SetStateAction<TrackMetadata>>;
  onStartProcessing: () => void;
  isProcessing: boolean;
}

export default function TrackUploader({
  trackA,
  trackB,
  setTrackA,
  setTrackB,
  onStartProcessing,
  isProcessing,
}: TrackUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isTrackA: boolean) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const name = file.name.replace(/\.[^/.]+$/, '');
      if (isTrackA) {
        setTrackA((prev) => ({
          ...prev,
          name,
          file,
        }));
      } else {
        setTrackB((prev) => ({
          ...prev,
          name,
          file,
        }));
      }
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-studio-border">
      
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>3. Dual Track Ingestion & Role Assignment</span>
        </h2>
        <p className="text-xs text-slate-400">
          Upload 2 raw audio tracks (WAV/MP3). Demucs v4 will isolate stems on the serverless GPU.
        </p>
      </div>

      {/* Dual Upload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Track A: Acapella / Lead Vocals */}
        <div className="bg-[#0e1018] rounded-xl p-5 border border-cyan-500/20 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Mic2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">TRACK A (Lead / Acapella)</span>
                <span className="text-[11px] text-cyan-400/80 font-mono">Vocals & Top-line Hook</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
              {trackA.camelot} ({trackA.bpm} BPM)
            </span>
          </div>

          <label className="border-2 border-dashed border-studio-border hover:border-cyan-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#0a0b10] transition-all group">
            <Upload className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span className="text-xs text-slate-300 font-medium text-center">
              {trackA.file ? trackA.file.name : trackA.name}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {trackA.file ? `${(trackA.file.size / (1024 * 1024)).toFixed(1)} MB` : 'Click or Drag WAV / MP3'}
            </span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, true)}
            />
          </label>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block">Original Key</label>
              <input
                type="text"
                value={trackA.key}
                onChange={(e) => setTrackA((prev) => ({ ...prev, key: e.target.value }))}
                className="w-full bg-[#141724] border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 block">Original BPM</label>
              <input
                type="number"
                value={trackA.bpm}
                onChange={(e) => setTrackA((prev) => ({ ...prev, bpm: parseFloat(e.target.value) || 128 }))}
                className="w-full bg-[#141724] border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Track B: Beat / Instrumental */}
        <div className="bg-[#0e1018] rounded-xl p-5 border border-purple-500/20 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Drum className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">TRACK B (Beat / Rhythm)</span>
                <span className="text-[11px] text-purple-400/80 font-mono">Drums & Sub Bass Foundation</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
              {trackB.camelot} ({trackB.bpm} BPM)
            </span>
          </div>

          <label className="border-2 border-dashed border-studio-border hover:border-purple-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#0a0b10] transition-all group">
            <Upload className="w-6 h-6 text-slate-500 group-hover:text-purple-400 transition-colors" />
            <span className="text-xs text-slate-300 font-medium text-center">
              {trackB.file ? trackB.file.name : trackB.name}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {trackB.file ? `${(trackB.file.size / (1024 * 1024)).toFixed(1)} MB` : 'Click or Drag WAV / MP3'}
            </span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, false)}
            />
          </label>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block">Original Key</label>
              <input
                type="text"
                value={trackB.key}
                onChange={(e) => setTrackB((prev) => ({ ...prev, key: e.target.value }))}
                className="w-full bg-[#141724] border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 block">Original BPM</label>
              <input
                type="number"
                value={trackB.bpm}
                onChange={(e) => setTrackB((prev) => ({ ...prev, bpm: parseFloat(e.target.value) || 126 }))}
                className="w-full bg-[#141724] border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

      </div>

      {/* CTA Button */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onStartProcessing}
          disabled={isProcessing}
          className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-black font-extrabold px-8 py-4 rounded-xl text-sm transition-all shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 tracking-wider uppercase font-mono"
        >
          <span>Launch Serverless GPU Pipeline</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
