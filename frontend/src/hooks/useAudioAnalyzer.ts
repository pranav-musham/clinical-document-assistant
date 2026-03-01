/**
 * useAudioAnalyzer Hook
 * Provides real-time audio analysis for waveform visualization
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseAudioAnalyzerReturn {
  analyserNode: AnalyserNode | null;
  audioContext: AudioContext | null;
  frequencyData: Uint8Array | null;
  volumeLevel: number;
  startAnalyzing: (stream: MediaStream) => void;
  stopAnalyzing: () => void;
  isAnalyzing: boolean;
}

export function useAudioAnalyzer(fftSize: number = 256): UseAudioAnalyzerReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Start analyzing audio from a media stream
   */
  const startAnalyzing = useCallback((stream: MediaStream) => {
    try {
      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      // Create frequency data array
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      frequencyDataRef.current = dataArray;

      setIsAnalyzing(true);

      // Start animation loop for continuous analysis
      const analyze = () => {
        if (!analyserRef.current || !frequencyDataRef.current) {
          return;
        }

        // Get frequency data
        analyserRef.current.getByteFrequencyData(frequencyDataRef.current as any);

        // Calculate average volume level (0-1)
        const sum = Array.from(frequencyDataRef.current).reduce((acc, value) => acc + value, 0);
        const average = sum / frequencyDataRef.current.length / 255;
        setVolumeLevel(average);

        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(analyze);
      };

      // Start the animation loop
      analyze();
    } catch (error) {
      console.error('Failed to start audio analysis:', error);
      setIsAnalyzing(false);
    }
  }, [fftSize]);

  /**
   * Stop analyzing audio
   */
  const stopAnalyzing = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Reset refs
    analyserRef.current = null;
    frequencyDataRef.current = null;

    setIsAnalyzing(false);
    setVolumeLevel(0);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopAnalyzing();
    };
  }, [stopAnalyzing]);

  return {
    analyserNode: analyserRef.current,
    audioContext: audioContextRef.current,
    frequencyData: frequencyDataRef.current,
    volumeLevel,
    startAnalyzing,
    stopAnalyzing,
    isAnalyzing,
  };
}
