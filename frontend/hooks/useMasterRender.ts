'use client';

import { useState, useCallback } from 'react';
import { webAudioEngine } from '../lib/webAudioEngine';

export interface UseMasterRenderProps {
  deckARegion: [number, number];
  deckBRegion: [number, number];
}

export function useMasterRender({ deckARegion, deckBRegion }: UseMasterRenderProps) {
  const [masterAudioUrl, setMasterAudioUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [stageText, setStageText] = useState<string>('Extracting Acapellas (0-30%)...');
  const [error, setError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isExtending, setIsExtending] = useState<boolean>(false);
  const [isMasteredRefined, setIsMasteredRefined] = useState<boolean>(false);
  const [refinementVersion, setRefinementVersion] = useState<number>(1);
  const [refineActions, setRefineActions] = useState<string[]>([]);
  const [fullSongReady, setFullSongReady] = useState<boolean>(false);

  // Live Reaction Taps
  const [hypeTaps, setHypeTaps] = useState<number[]>([]);
  const [negativeTaps, setNegativeTaps] = useState<number[]>([]);
  const [skippedZones, setSkippedZones] = useState<[number, number][]>([]);

  // Make Full Song
  const makeFullSong = useCallback(async (id: number = 1, duration: number = 60, cutToTheChase: boolean = false) => {
    webAudioEngine.stop();
    const dur = cutToTheChase ? 30 : duration;
    setFullSongReady(true);
    setIsGenerating(true);
    setError(null);
    setProgressPercent(20);
    setStageText('Extracting Acapellas (0-30%)...');

    webAudioEngine.manualDeckARegion = deckARegion;
    webAudioEngine.manualDeckBRegion = deckBRegion;
    webAudioEngine.isManualMode = true;

    try {
      setTimeout(() => {
        setProgressPercent(60);
        setStageText('Applying Sync & Crossfader FX (30-70%)...');
      }, 250);

      setTimeout(() => {
        setProgressPercent(88);
        setStageText('Encoding Final WAV & Spotify Pedalboard Glue (70-100%)...');
      }, 500);

      const blobUrl = await webAudioEngine.generateDownloadableWav(id, dur);
      setMasterAudioUrl(blobUrl);
    } catch (err: any) {
      console.error('[MasterRender] Master generation error:', err);
      setError(err?.message || 'Master DSP audio synthesis failed.');
      setIsGenerating(false);
      setProgressPercent(0);
    }
  }, [deckARegion, deckBRegion]);

  // Refine & Master
  const refineAndMaster = useCallback(async (selectedPreviewId: number = 1) => {
    webAudioEngine.stop();
    setIsRefining(true);
    setIsGenerating(true);
    setError(null);
    setProgressPercent(20);
    setStageText('Analyzing Live Reaction Taps & Slicing Acapellas (0-30%)...');

    try {
      const result = webAudioEngine.refineAndRegenerateFromFeedback({
        hypeTaps,
        negativeTaps,
        skippedZones,
      });

      setRefinementVersion(result.iteration);
      setRefineActions(result.actionsTaken);
      setIsMasteredRefined(true);

      setTimeout(() => {
        setProgressPercent(60);
        setStageText('Applying Sync & Crossfader FX (30-70%)...');
      }, 250);

      setTimeout(() => {
        setProgressPercent(88);
        setStageText('Encoding Final WAV & Spotify Pedalboard Glue (70-100%)...');
      }, 500);

      const blobUrl = await webAudioEngine.generateDownloadableWav(selectedPreviewId, result.newDuration);
      setMasterAudioUrl(blobUrl);
    } catch (err: any) {
      console.error('[MasterRender] Refine error:', err);
      setError(err?.message || 'Master DSP audio synthesis failed.');
      setIsGenerating(false);
      setProgressPercent(0);
    } finally {
      setIsRefining(false);
      setHypeTaps([]);
      setNegativeTaps([]);
      setSkippedZones([]);
    }
  }, [hypeTaps, negativeTaps, skippedZones]);

  // Infinite Extend (+1 Min)
  const extendOneMin = useCallback(async (selectedPreviewId: number = 1, currentDurationSec: number = 60) => {
    setIsExtending(true);
    setIsGenerating(true);
    setError(null);
    setProgressPercent(20);
    setStageText('Extracting Extended Slices (0-30%)...');

    try {
      setTimeout(() => {
        setProgressPercent(60);
        setStageText('Applying Sync & Crossfader FX (30-70%)...');
      }, 250);

      setTimeout(() => {
        setProgressPercent(88);
        setStageText('Encoding Extended Master WAV (70-100%)...');
      }, 500);

      webAudioEngine.extendMixBySeconds(60);
      const extendedUrl = await webAudioEngine.generateDownloadableWav(selectedPreviewId, currentDurationSec + 60);
      setMasterAudioUrl(extendedUrl);
    } catch (e: any) {
      console.error('[MasterRender] Extend error:', e);
      setError(e?.message || 'Extend synthesis failed.');
      setIsGenerating(false);
      setProgressPercent(0);
    } finally {
      setIsExtending(false);
    }
  }, []);

  // Live Taps
  const addHypeTap = useCallback((currentSec: number) => {
    setHypeTaps((prev) => [...prev, Math.round(currentSec * 1000)]);
  }, []);

  const addNegativeTap = useCallback((currentSec: number) => {
    setNegativeTaps((prev) => [...prev, Math.round(currentSec * 1000)]);
  }, []);

  return {
    masterAudioUrl,
    setMasterAudioUrl,
    isGenerating,
    setIsGenerating,
    progressPercent,
    setProgressPercent,
    stageText,
    setStageText,
    error,
    setError,
    isRefining,
    isExtending,
    isMasteredRefined,
    refinementVersion,
    refineActions,
    fullSongReady,
    setFullSongReady,
    hypeTaps,
    negativeTaps,
    skippedZones,
    makeFullSong,
    refineAndMaster,
    extendOneMin,
    addHypeTap,
    addNegativeTap,
  };
}
