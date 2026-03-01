/**
 * RecordingTimer Component
 * Displays elapsed recording time with visual feedback
 */

import { formatRecordingTime } from '../utils/audioRecordingUtils';

interface RecordingTimerProps {
  seconds: number;
  isRecording?: boolean;
  isPaused?: boolean;
  className?: string;
}

export default function RecordingTimer({
  seconds,
  isRecording = false,
  isPaused = false,
  className = ''
}: RecordingTimerProps) {
  const formattedTime = formatRecordingTime(seconds);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Recording indicator dot */}
      {isRecording && (
        <div className="relative">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
        </div>
      )}

      {/* Paused indicator */}
      {isPaused && (
        <div className="flex gap-1">
          <div className="w-1 h-3 bg-yellow-500 rounded" />
          <div className="w-1 h-3 bg-yellow-500 rounded" />
        </div>
      )}

      {/* Time display */}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-mono font-semibold text-gray-900">
          {formattedTime}
        </span>
        {isRecording && (
          <span className="text-sm text-red-500 font-medium">REC</span>
        )}
        {isPaused && (
          <span className="text-sm text-yellow-600 font-medium">PAUSED</span>
        )}
      </div>
    </div>
  );
}
