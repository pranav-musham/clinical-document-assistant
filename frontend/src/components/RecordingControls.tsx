/**
 * RecordingControls Component
 * Control buttons for audio recording (Start, Pause, Resume, Stop, Discard)
 */

import { Mic, Pause, Play, Square, Trash2 } from 'lucide-react';
import type { RecordingStatus } from '../types';

interface RecordingControlsProps {
  status: RecordingStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
  disabled?: boolean;
  className?: string;
}

export default function RecordingControls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  onDiscard,
  disabled = false,
  className = ''
}: RecordingControlsProps) {
  const isIdle = status === 'idle';
  const isRecording = status === 'recording';
  const isPaused = status === 'paused';
  const isStopped = status === 'stopped';
  const isError = status === 'error';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Start/Record Button */}
      {isIdle && (
        <button
          onClick={onStart}
          disabled={disabled}
          className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:ring-4 focus:ring-red-200 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <Mic className="w-5 h-5" />
          Start Recording
        </button>
      )}

      {/* Pause Button */}
      {isRecording && (
        <>
          <button
            onClick={onPause}
            disabled={disabled}
            className="flex items-center gap-2 px-5 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:ring-4 focus:ring-yellow-200 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Pause className="w-5 h-5" />
            Pause
          </button>

          <button
            onClick={onStop}
            disabled={disabled}
            className="flex items-center gap-2 px-5 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-4 focus:ring-blue-200 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Square className="w-5 h-5" />
            Stop
          </button>
        </>
      )}

      {/* Resume and Stop Buttons */}
      {isPaused && (
        <>
          <button
            onClick={onResume}
            disabled={disabled}
            className="flex items-center gap-2 px-5 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:ring-4 focus:ring-green-200 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Play className="w-5 h-5" />
            Resume
          </button>

          <button
            onClick={onStop}
            disabled={disabled}
            className="flex items-center gap-2 px-5 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-4 focus:ring-blue-200 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Square className="w-5 h-5" />
            Stop
          </button>
        </>
      )}

      {/* Discard Button (shown when recording, paused, or stopped) */}
      {(isRecording || isPaused || isStopped || isError) && (
        <button
          onClick={onDiscard}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:ring-4 focus:ring-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="w-5 h-5" />
          Discard
        </button>
      )}
    </div>
  );
}
