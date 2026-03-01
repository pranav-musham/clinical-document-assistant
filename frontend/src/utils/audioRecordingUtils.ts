/**
 * Audio Recording Utilities
 * Helper functions and configurations for browser-based audio recording
 */

export interface AudioQuality {
  name: string;
  description: string;
  bitrate: number;
  sampleRate: number;
  mimeType: string;
  estimatedSizeMB: number; // Per minute of recording
}

export interface RecordingSupport {
  supported: boolean;
  mimeTypes: string[];
  errors: string[];
}

/**
 * Audio quality presets for recording
 */
export const QUALITY_PRESETS: Record<'low' | 'medium' | 'high', AudioQuality> = {
  low: {
    name: 'Low',
    description: 'Space Saving - 64 kbps',
    bitrate: 64000,
    sampleRate: 22050,
    mimeType: 'audio/webm;codecs=opus',
    estimatedSizeMB: 0.5,
  },
  medium: {
    name: 'Medium',
    description: 'Recommended - 128 kbps',
    bitrate: 128000,
    sampleRate: 44100,
    mimeType: 'audio/webm;codecs=opus',
    estimatedSizeMB: 1.0,
  },
  high: {
    name: 'High',
    description: 'Best Quality - 256 kbps',
    bitrate: 256000,
    sampleRate: 48000,
    mimeType: 'audio/webm;codecs=opus',
    estimatedSizeMB: 2.0,
  },
};

/**
 * Check browser support for audio recording
 */
export function checkRecordingSupport(): RecordingSupport {
  const errors: string[] = [];

  // Check for MediaDevices API
  const hasMediaDevices = 'mediaDevices' in navigator;
  if (!hasMediaDevices) {
    errors.push('MediaDevices API not supported');
  }

  // Check for getUserMedia
  const hasGetUserMedia = hasMediaDevices && 'getUserMedia' in navigator.mediaDevices;
  if (!hasGetUserMedia) {
    errors.push('getUserMedia not supported');
  }

  // Check for MediaRecorder
  const hasMediaRecorder = 'MediaRecorder' in window;
  if (!hasMediaRecorder) {
    errors.push('MediaRecorder API not supported');
  }

  // Check supported MIME types
  const possibleMimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];

  const supportedMimeTypes = hasMediaRecorder
    ? possibleMimeTypes.filter(type => MediaRecorder.isTypeSupported(type))
    : [];

  if (supportedMimeTypes.length === 0 && hasMediaRecorder) {
    errors.push('No supported audio MIME types found');
  }

  const supported = hasGetUserMedia && hasMediaRecorder && supportedMimeTypes.length > 0;

  return {
    supported,
    mimeTypes: supportedMimeTypes,
    errors,
  };
}

/**
 * Get the best supported MIME type for recording
 */
export function getBestMimeType(): string {
  const support = checkRecordingSupport();
  if (!support.supported || support.mimeTypes.length === 0) {
    throw new Error('No supported MIME types for audio recording');
  }

  // Prefer WebM with Opus codec
  const preferred = 'audio/webm;codecs=opus';
  if (support.mimeTypes.includes(preferred)) {
    return preferred;
  }

  // Fallback to first supported type
  return support.mimeTypes[0];
}

/**
 * Get audio quality preset with browser-compatible MIME type
 */
export function getQualityWithMimeType(quality: AudioQuality): AudioQuality {
  const support = checkRecordingSupport();

  // If the preferred MIME type is supported, use it
  if (support.mimeTypes.includes(quality.mimeType)) {
    return quality;
  }

  // Otherwise, use the best available MIME type
  const bestMimeType = getBestMimeType();
  return {
    ...quality,
    mimeType: bestMimeType,
  };
}

/**
 * Format recording time in HH:MM:SS format
 */
export function formatRecordingTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
}

/**
 * Estimate file size based on recording duration and quality
 */
export function estimateFileSize(durationSeconds: number, quality: AudioQuality): number {
  const durationMinutes = durationSeconds / 60;
  const sizeMB = durationMinutes * quality.estimatedSizeMB;
  return sizeMB;
}

/**
 * Check if estimated file size exceeds the limit
 */
export function checkFileSizeLimit(
  durationSeconds: number,
  quality: AudioQuality,
  maxSizeMB: number = 25
): { withinLimit: boolean; estimatedSizeMB: number; maxSizeMB: number } {
  const estimatedSizeMB = estimateFileSize(durationSeconds, quality);

  return {
    withinLimit: estimatedSizeMB <= maxSizeMB,
    estimatedSizeMB: Math.round(estimatedSizeMB * 10) / 10, // Round to 1 decimal
    maxSizeMB,
  };
}

/**
 * Generate a filename for recorded audio
 */
export function generateRecordingFilename(extension: string = 'webm'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `recording-${timestamp}.${extension}`;
}

/**
 * Convert Blob to File
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, {
    type: blob.type,
    lastModified: Date.now(),
  });
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'audio';
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return stream;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission denied. Please allow access to record audio.');
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      }
      if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Microphone is already in use by another application.');
      }
      throw new Error(`Microphone access error: ${error.message}`);
    }
    throw new Error('Failed to access microphone');
  }
}

/**
 * Enumerate available audio input devices
 */
export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  } catch (error) {
    console.error('Failed to enumerate audio devices:', error);
    return [];
  }
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

/**
 * Calculate average volume level from frequency data
 */
export function calculateAverageVolume(dataArray: Uint8Array): number {
  const sum = dataArray.reduce((acc, value) => acc + value, 0);
  return sum / dataArray.length / 255; // Normalize to 0-1
}

/**
 * Get user-friendly error message for recording errors
 */
export function getRecordingErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('permission') || message.includes('notallowed')) {
    return 'Microphone permission denied. Please allow access in your browser settings.';
  }

  if (message.includes('not found') || message.includes('notfound')) {
    return 'No microphone detected. Please connect a microphone and try again.';
  }

  if (message.includes('not readable') || message.includes('in use')) {
    return 'Microphone is already in use. Please close other applications using the microphone.';
  }

  if (message.includes('not supported')) {
    return 'Audio recording is not supported in your browser. Please use Chrome, Firefox, or Edge.';
  }

  return `Recording error: ${error.message}`;
}
