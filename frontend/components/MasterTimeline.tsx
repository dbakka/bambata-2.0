'use client';

import React from 'react';
import {
  Check,
  Wand2,
  Scissors,
  Download,
  AlertCircle,
  Loader2,
  Flame,
  Snowflake,
  Play,
  Pause,
} from 'lucide-react';
import { useMasterRender } from '../hooks/useMasterRender';
import { useMasterWaveSurfer } from '../hooks/useMasterWaveSurfer';

export interface MasterTimelineProps {
  renderHook: ReturnType<typeof useMasterRender>;
  waveSurferHook: ReturnType<typeof useMasterWaveSurfer>;
  containerRef: React.RefObject<HTMLDivElement>;
  selectedPreviewId: number;
  onExportRegion: () => void;
  onDownloadFull: () => void;
  isExportingRegion: boolean;
  isDownloading: boolean;
}

export const MasterTimeline: React.FC<MasterTimelineProps> = ({
  renderHook,
  waveSurferHook,
  containerRef,
  selectedPreviewId,
  onExportRegion,
  onDownloadFull,
  isExportingRegion,
  isDownloading,
}) => {
  const masterClipDuration = Math.max(
    0.5,
    waveSurferHook.masterRegion[1] - waveSurferHook.masterRegion[0]
  );

  return (
    <section id="full-player-section" className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-300">
      {/* Master Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                MASTER V{renderHook.refinementVersion}
              </span>
              {renderHook.isMasteredRefined && (
                <span className="text-[9px] font-mono text-pink-600 bg-pink-100 px-2 py-0.5 rounded-md border border-pink-200">
                  FEEDBACK REFINED
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {waveSurferHook.masterDurationSec.toFixed(1)}s Decoded Audio • Spotify Pedalboard Master
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => renderHook.extendOneMin(selectedPreviewId, waveSurferHook.masterDurationSec)}
            disabled={renderHook.isExtending || renderHook.isRefining || renderHook.isGenerating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 shadow-xs transition-colors disabled:opacity-40"
            title="Extend track by +1 minute"
          >
            <span>{renderHook.isExtending ? 'Extending...' : '+1 Min'}</span>
          </button>

          <button
            type="button"
            onClick={() => renderHook.refineAndMaster(selectedPreviewId)}
            disabled={renderHook.isRefining || renderHook.isExtending || renderHook.isGenerating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 text-xs font-mono font-bold shadow-xs transition-all disabled:opacity-40"
            title="Regenerate improved version from your feedback & restart playback from 0.0s"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{renderHook.isRefining ? 'Regenerating...' : 'Refine'}</span>
          </button>

          {/* Region Clip Export Button with Dynamic Duration Readout */}
          <button
            type="button"
            onClick={onExportRegion}
            disabled={isExportingRegion || renderHook.isGenerating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 shadow-xs transition-colors disabled:opacity-40"
            title={`Export highlighted region (${masterClipDuration.toFixed(1)}s)`}
          >
            <Scissors className="w-3.5 h-3.5 text-pink-500" />
            <span>Clip ({masterClipDuration.toFixed(1)}s)</span>
          </button>

          {/* Full WAV Export */}
          <button
            type="button"
            onClick={onDownloadFull}
            disabled={isDownloading || renderHook.isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-xs font-mono uppercase tracking-wider shadow-md shadow-pink-500/25 transition-all disabled:opacity-40"
            title="Download full mastered WAV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* REAL WAVESURFER MASTER TIMELINE CANVAS OR MULTI-STAGE LOADING STATE */}
      <div className="space-y-3">
        <div className="flex justify-between text-[11px] font-mono text-zinc-500">
          <span className="text-pink-600 font-bold">{waveSurferHook.masterProgressSec.toFixed(1)}s</span>
          <span>{waveSurferHook.masterDurationSec.toFixed(1)}s</span>
        </div>

        {/* Wavesurfer Container, Loading Spinner, or Error Card */}
        <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 min-h-[120px] flex items-center justify-center">
          {renderHook.error ? (
            <div className="p-5 w-full bg-rose-50/90 border border-rose-200 rounded-xl flex flex-col items-center justify-center space-y-2.5 text-center animate-in fade-in">
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-mono font-bold text-rose-900">Master Rendering Failed</p>
                <p className="text-[10px] font-mono text-rose-600 max-w-md">{renderHook.error}</p>
              </div>
              <button
                type="button"
                onClick={() => renderHook.makeFullSong(selectedPreviewId, 60)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-mono text-[11px] font-bold transition-all shadow-xs"
              >
                Retry Master Render
              </button>
            </div>
          ) : renderHook.isGenerating ? (
            <div className="w-full p-4 sm:p-5 space-y-3.5 select-none animate-in fade-in">
              {/* Header Label + Percentage */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-pink-500 animate-spin flex-shrink-0" />
                  <span className="text-xs font-mono font-bold text-zinc-900 animate-pulse">
                    {renderHook.stageText}
                  </span>
                </div>
                <span className="text-xs font-mono font-extrabold text-pink-600 bg-pink-50 border border-pink-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                  {renderHook.progressPercent}%
                </span>
              </div>

              {/* Highly Visible Animated Progress Bar */}
              <div className="h-2.5 bg-zinc-200/90 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div
                  style={{ width: `${renderHook.progressPercent}%` }}
                  className="h-full bg-pink-500 rounded-full shadow-sm shadow-pink-500/50 transition-all duration-300 ease-out"
                />
              </div>

              {/* 3 Step Milestone Checkpoints */}
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                <div
                  className={`p-2 rounded-xl border text-[9px] font-mono text-center transition-all ${
                    renderHook.progressPercent >= 30
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                      : renderHook.progressPercent > 0
                      ? 'bg-pink-50 text-pink-700 border-pink-200 font-bold animate-pulse'
                      : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                  }`}
                >
                  {renderHook.progressPercent >= 30 ? '✓ 01 Extracted' : '01 • Acapellas (0-30%)'}
                </div>

                <div
                  className={`p-2 rounded-xl border text-[9px] font-mono text-center transition-all ${
                    renderHook.progressPercent >= 70
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                      : renderHook.progressPercent >= 30
                      ? 'bg-pink-50 text-pink-700 border-pink-200 font-bold animate-pulse'
                      : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                  }`}
                >
                  {renderHook.progressPercent >= 70 ? '✓ 02 Synced' : '02 • Sync & FX (30-70%)'}
                </div>

                <div
                  className={`p-2 rounded-xl border text-[9px] font-mono text-center transition-all ${
                    renderHook.progressPercent >= 100
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                      : renderHook.progressPercent >= 70
                      ? 'bg-pink-50 text-pink-700 border-pink-200 font-bold animate-pulse'
                      : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                  }`}
                >
                  {renderHook.progressPercent >= 100 ? '✓ 03 Mastered' : '03 • Final WAV (70-100%)'}
                </div>
              </div>

              <div className="text-center">
                <span className="text-[9px] font-mono text-zinc-400">
                  Formant-Preserved Key Lock • 44.1kHz 16-bit • Spotify -0.2 dB TP Limiter
                </span>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className="w-full h-[100px] overflow-hidden" />
          )}
        </div>

        {/* Feedback Taps */}
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
          <span className="text-[10px]">Tap to feed AI live reaction:</span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => renderHook.addHypeTap(waveSurferHook.masterProgressSec)}
              className="w-9 h-9 rounded-full bg-white hover:bg-pink-50 text-pink-500 border border-zinc-200 flex items-center justify-center shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all"
              title={`Hype this moment (+1 score). Tally: ${renderHook.hypeTaps.length}`}
            >
              <Flame className="w-4 h-4 fill-current text-pink-500" />
            </button>

            <button
              type="button"
              onClick={() => renderHook.addNegativeTap(waveSurferHook.masterProgressSec)}
              className="w-9 h-9 rounded-full bg-white hover:bg-zinc-100 text-zinc-500 border border-zinc-200 flex items-center justify-center shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all"
              title={`Cold / Dislike this transition (-1 score). Tally: ${renderHook.negativeTaps.length}`}
            >
              <Snowflake className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Master Transport Playbar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={waveSurferHook.toggleMasterPlay}
          disabled={renderHook.isGenerating}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            waveSurferHook.isMasterPlaying
              ? 'bg-zinc-900 text-white'
              : 'bg-pink-500 text-white hover:bg-pink-600 shadow-pink-500/25'
          } disabled:opacity-40`}
          title={waveSurferHook.isMasterPlaying ? 'Pause Master' : 'Play Master'}
        >
          {waveSurferHook.isMasterPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        {renderHook.refineActions.length > 0 && (
          <span className="text-[10px] font-mono text-pink-600 truncate max-w-md">
            ✓ {renderHook.refineActions[0]}
          </span>
        )}
      </div>
    </section>
  );
};
