/**
 * useAudioRecorder Hook
 * Manages audio recording using MediaRecorder API
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RecordingStatus } from '../types';
import {
  AudioQuality,
  requestMicrophonePermission,
  stopMediaStream,
  blobToFile,
  generateRecordingFilename,
  getExtensionFromMimeType,
  getQualityWithMimeType,
  getRecordingErrorMessage,
} from '../utils/audioRecordingUtils';

export interface UseAudioRecorderReturn {
  status: RecordingStatus;
  recordingTime: number;
  audioBlob: Blob | null;
  audioFile: File | null;
  error: string | null;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  discardRecording: () => void;
  isRecording: boolean;
  isPaused: boolean;
  isStopped: boolean;
  stream: MediaStream | null;
}

export function useAudioRecorder(quality: AudioQuality): UseAudioRecorderReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  /**
   * Start the recording timer
   */
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRecordingTime(elapsed);
    }, 1000);
  }, []);

  /**
   * Stop the recording timer
   */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Pause the recording timer
   */
  const pauseTimer = useCallback(() => {
    stopTimer();
    pausedTimeRef.current = recordingTime;
  }, [recordingTime, stopTimer]);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setStatus('recording');

      // Request microphone permission
      const stream = await requestMicrophonePermission();
      streamRef.current = stream;

      // Get quality with browser-compatible MIME type
      const qualityWithMimeType = getQualityWithMimeType(quality);

      // Create MediaRecorder
      const options = {
        mimeType: qualityWithMimeType.mimeType,
        audioBitsPerSecond: qualityWithMimeType.bitrate,
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: qualityWithMimeType.mimeType });
        setAudioBlob(blob);

        // Convert to File
        const extension = getExtensionFromMimeType(qualityWithMimeType.mimeType);
        const filename = generateRecordingFilename(extension);
        const file = blobToFile(blob, filename);
        setAudioFile(file);

        setStatus('stopped');
        stopTimer();
        stopMediaStream(streamRef.current);
        streamRef.current = null;
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        const errorMessage = 'An error occurred during recording. Please try again.';
        setError(errorMessage);
        setStatus('error');
        stopTimer();
        stopMediaStream(streamRef.current);
        streamRef.current = null;
      };

      // Start recording (collect data every 1 second)
      mediaRecorder.start(1000);
      startTimer();
    } catch (err) {
      const errorMessage = err instanceof Error ? getRecordingErrorMessage(err) : 'Failed to start recording';
      setError(errorMessage);
      setStatus('error');
      stopTimer();
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
  }, [quality, startTimer, stopTimer]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
      pauseTimer();
    }
  }, [pauseTimer]);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');
      startTimer();
    }
  }, [startTimer]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // Status will be set to 'stopped' in the onstop handler
    }
  }, []);

  /**
   * Discard recording and reset to initial state
   */
  const discardRecording = useCallback(() => {
    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop timer
    stopTimer();

    // Stop media stream
    stopMediaStream(streamRef.current);

    // Reset state
    setStatus('idle');
    setRecordingTime(0);
    setAudioBlob(null);
    setAudioFile(null);
    setError(null);

    // Reset refs
    mediaRecorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  }, [stopTimer]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopMediaStream(streamRef.current);
    };
  }, [stopTimer]);

  return {
    status,
    recordingTime,
    audioBlob,
    audioFile,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
    isRecording: status === 'recording',
    isPaused: status === 'paused',
    isStopped: status === 'stopped',
    stream: streamRef.current,
  };
}
