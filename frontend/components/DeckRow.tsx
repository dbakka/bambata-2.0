'use client';

import React from 'react';
import {
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Headphones,
  Sparkles,
  Check,
  AlertTriangle,
  Loader2,
  Music,
  Gauge,
  FileAudio,
} from 'lucide-react';
import { useDeckAudio } from '../hooks/useDeckAudio';

const CAMELOT_KEYS = [
  '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B',
  '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B',
  '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B',
];

export interface DeckRowProps {
  deck: 'A' | 'B';
  trackTitle: string;
  trackFile: File | null;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  audio: ReturnType<typeof useDeckAudio>;
}

export const DeckRow: React.FC<DeckRowProps> = ({
  deck,
  trackTitle,
  trackFile,
  onFileUpload,
  audio,
}) => {
  const isDeckA = deck === 'A';

  return (
    <div className="flex flex-col gap-4 bg-zinc-50 p-6 rounded-xl border border-zinc-200 shadow-sm w-full">
      {/* Deck Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isDeckA ? 'bg-pink-500' : 'bg-zinc-700'}`} />
          <span className={`text-xs font-mono font-bold tracking-wider uppercase ${isDeckA ? 'text-pink-600' : 'text-zinc-700'}`}>
            {isDeckA ? 'DECK A • HERO VOCAL (SERATO SYNC)' : 'DECK B • GROOVE & BASS (MASTER KEY)'}
          </span>
        </div>
      </div>

      {/* File Upload Selector Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl p-3 shadow-2xs">
        <div className="flex items-center gap-2.5 truncate">
          <FileAudio className={`w-4 h-4 ${isDeckA ? 'text-pink-500' : 'text-zinc-600'} flex-shrink-0`} />
          <span className="text-xs font-medium text-zinc-800 truncate" title={trackTitle}>
            {trackTitle}
          </span>
        </div>

        <label className={`inline-flex items-center gap-2 ${isDeckA ? 'bg-pink-500 hover:bg-pink-600' : 'bg-zinc-800 hover:bg-zinc-900'} text-white font-medium text-xs font-mono px-4 py-2 rounded-full cursor-pointer transition-colors shadow-xs flex-shrink-0`}>
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a"
            onChange={onFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Track Header Card Box */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-mono font-bold uppercase tracking-wider ${isDeckA ? 'text-pink-600' : 'text-zinc-700'} flex items-center gap-2`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isDeckA ? 'bg-pink-500' : 'bg-zinc-600'}`} />
            {isDeckA ? 'DECK A • HERO VOCAL' : 'DECK B • GROOVE & BASS'}
          </span>
          <span className={`text-[9px] font-mono ${isDeckA ? 'text-pink-600 bg-pink-100' : 'text-zinc-700 bg-zinc-200'} px-2 py-0.5 rounded-full font-bold`}>
            {isDeckA ? (audio.isAcapellaIsolated ? 'ACAPELLA CLEAN' : 'BS-ROFORMER') : 'KEY ANCHOR'}
          </span>
        </div>

        {/* Analyzed Metadata Readout Badges */}
        <div className="flex items-center gap-2">
          <div className={`flex-1 ${isDeckA ? 'bg-pink-100/70 border-pink-200' : 'bg-zinc-200/80 border-zinc-300/80'} border rounded-lg px-2.5 py-1.5 flex items-center justify-between font-mono text-xs`}>
            <span className={isDeckA ? 'text-pink-700 font-medium' : 'text-zinc-500'}>BPM:</span>
            <span className={`font-bold ${isDeckA ? 'text-pink-900' : 'text-zinc-800'}`}>
              {audio.isAnalyzing ? '...' : audio.bpm.toFixed(1)}
            </span>
          </div>
          <div className={`flex-1 ${isDeckA ? 'bg-pink-100/70 border-pink-200' : 'bg-zinc-200/80 border-zinc-300/80'} border rounded-lg px-2.5 py-1.5 flex items-center justify-between font-mono text-xs`}>
            <span className={isDeckA ? 'text-pink-700 font-medium' : 'text-zinc-500'}>KEY:</span>
            <span className={`font-bold ${isDeckA ? 'text-pink-900' : 'text-zinc-800'}`}>
              {audio.isAnalyzing ? '...' : audio.camelotKey}
            </span>
          </div>
        </div>

        {/* Track Headers: Title, Play, Mute, and Solo in horizontal flex row */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={audio.togglePlay}
            className={`${isDeckA ? 'bg-pink-500 hover:bg-pink-600' : 'bg-zinc-800 hover:bg-zinc-900'} text-white font-medium px-4 py-2 rounded-full transition-colors flex items-center justify-center gap-2 shadow-xs`}
            title={audio.isPlaying ? `Pause Deck ${deck}` : `Play Deck ${deck}`}
          >
            {audio.isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            <span className="text-xs font-mono">{audio.isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={audio.toggleMute}
            className={`bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 px-3 py-1.5 rounded-full font-medium text-xs font-mono flex items-center gap-1.5 transition-all ${
              audio.isMuted ? '!bg-rose-500 !text-white !border-rose-600' : ''
            }`}
            title={`Mute Deck ${deck} audio`}
          >
            {audio.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            <span>MUTE</span>
          </button>

          <button
            type="button"
            onClick={audio.toggleSolo}
            className={`bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 px-3 py-1.5 rounded-full font-medium text-xs font-mono flex items-center gap-1.5 transition-all ${
              audio.isSolo ? '!bg-amber-400 !text-zinc-950 !border-amber-500' : ''
            }`}
            title={`Solo Deck ${deck} audio`}
          >
            <Headphones className="w-3 h-3" />
            <span>SOLO</span>
          </button>
        </div>

        {/* Volume Fader (0-100%) */}
        <div className="pt-1">
          <div className="flex justify-between text-sm text-zinc-600 font-medium mb-1">
            <span className="font-mono text-xs">Deck {deck} Volume:</span>
            <span className={`${isDeckA ? 'text-pink-600' : 'text-zinc-900'} font-mono text-xs font-bold`}>{audio.volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={audio.volume}
            onChange={(e) => audio.handleVolumeChange(parseInt(e.target.value))}
            className={`w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer ${isDeckA ? 'accent-pink-500' : 'accent-zinc-800'}`}
          />
        </div>

        {/* Filter Slider (HPF / Notch) */}
        <div>
          <div className="flex justify-between text-sm text-zinc-600 font-medium mb-1">
            <span className="font-mono text-xs">
              {isDeckA ? 'Vocal Clarity (HPF):' : 'Vocal Suppress (Notch):'}
            </span>
            <span className={`${isDeckA ? 'text-pink-600' : 'text-zinc-800'} font-mono text-xs font-bold`}>{audio.filterVal}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={audio.filterVal}
            onChange={(e) => audio.handleFilterChange(parseInt(e.target.value))}
            className={`w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer ${isDeckA ? 'accent-pink-500' : 'accent-zinc-800'}`}
          />
        </div>

        {/* Deck A Specific Features: Acapella Extraction & Serato Sync */}
        {isDeckA && (
          <>
            {/* Prominent BS-Roformer Acapella Isolation Trigger */}
            <div className="pt-1">
              <button
                type="button"
                onClick={audio.extractAcapella}
                disabled={audio.isExtractingVocal}
                className={`w-full bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2 rounded-full transition-colors flex items-center justify-center gap-2 shadow-xs text-xs font-mono ${
                  audio.isAcapellaIsolated ? '!bg-emerald-600 !text-white' : ''
                } disabled:opacity-50`}
                title="Extract studio-grade acapella using BS-Roformer neural pipeline"
              >
                {audio.isExtractingVocal ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>⏳ {audio.extractionProgress}% • {audio.extractionStage}</span>
                  </>
                ) : audio.isAcapellaIsolated ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>✓ Acapella Isolated</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>✨ Isolate Acapella (BS-Roformer)</span>
                  </>
                )}
              </button>

              {/* Vocal Extraction Error Toast */}
              {audio.vocalExtractError && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-mono text-amber-900 flex items-center justify-between gap-1 animate-in fade-in">
                  <span className="flex items-center gap-1.5 truncate">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="truncate">{audio.vocalExtractError}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="text-amber-700 hover:text-amber-950 font-bold px-1.5"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Deck A Serato Sync Control Center */}
            <div className="bg-white border border-zinc-200 rounded-xl p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase flex items-center gap-1.5">
                  <Music className="w-3 h-3 text-pink-500" />
                  Serato Harmonic &amp; Tempo Sync
                </span>
              </div>

              {/* Key Row with Dedicated Sync Key Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-mono text-zinc-500">Key:</label>
                  <select
                    value={audio.camelotKey}
                    onChange={(e) => audio.setCamelotKey(e.target.value)}
                    className="border border-zinc-300 rounded px-2 py-1 w-20 text-center font-mono font-bold text-xs text-zinc-800 bg-zinc-50 focus:outline-pink-500"
                  >
                    {CAMELOT_KEYS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={audio.syncKey}
                  className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 px-3 py-1.5 rounded-full font-medium text-xs font-mono flex items-center gap-1 shadow-2xs"
                  title="Harmonically pitch-shift Deck A to match Deck B's Key"
                >
                  <Music className="w-3 h-3 text-pink-500" />
                  <span>Sync Key</span>
                </button>
              </div>

              {/* BPM Row with Dedicated Sync BPM Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-mono text-zinc-500">BPM:</label>
                  <input
                    type="number"
                    min="60"
                    max="180"
                    step="0.5"
                    value={audio.bpm}
                    onChange={(e) => audio.setBpm(parseFloat(e.target.value) || 126.0)}
                    className="border border-zinc-300 rounded px-2 py-1 w-20 text-center font-mono font-bold text-xs text-zinc-800 bg-zinc-50 focus:outline-pink-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={audio.syncBpm}
                  className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 px-3 py-1.5 rounded-full font-medium text-xs font-mono flex items-center gap-1 shadow-2xs"
                  title="Time-stretch Deck A playback rate (ratio) to match Deck B's BPM"
                >
                  <Gauge className="w-3 h-3 text-pink-500" />
                  <span>Sync BPM</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
