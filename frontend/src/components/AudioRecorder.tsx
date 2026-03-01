/**
 * AudioRecorder Component
 * Full-featured audio recorder with quality selection, waveform visualization,
 * and recording controls
 */

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';
import {
  AudioQuality,
  QUALITY_PRESETS,
  checkRecordingSupport,
  checkFileSizeLimit,
} from '../utils/audioRecordingUtils';
import RecordingControls from './RecordingControls';
import RecordingTimer from './RecordingTimer';
import WaveformVisualizer from './WaveformVisualizer';
import QualitySelector from './QualitySelector';
import AudioPlayer from './AudioPlayer';

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  maxFileSizeMB?: number;
  className?: string;
}

export default function AudioRecorder({
  onRecordingComplete,
  maxFileSizeMB = 25,
  className = ''
}: AudioRecorderProps) {
  const [selectedQuality, setSelectedQuality] = useState<AudioQuality>(QUALITY_PRESETS.medium);
  const [browserSupport] = useState(checkRecordingSupport());
  const [showSizeWarning, setShowSizeWarning] = useState(false);

  const recorder = useAudioRecorder(selectedQuality);
  const analyzer = useAudioAnalyzer(256);

  // Start analyzer when recording starts
  useEffect(() => {
    if (recorder.isRecording && recorder.stream && !analyzer.isAnalyzing) {
      analyzer.startAnalyzing(recorder.stream);
    } else if (!recorder.isRecording && analyzer.isAnalyzing) {
      analyzer.stopAnalyzing();
    }
  }, [recorder.isRecording, recorder.stream, analyzer]);

  // Check file size limit
  useEffect(() => {
    if (recorder.isRecording || recorder.isPaused) {
      const sizeCheck = checkFileSizeLimit(recorder.recordingTime, selectedQuality, maxFileSizeMB);

      // Show warning at 90% of max size
      const warningThreshold = maxFileSizeMB * 0.9;
      setShowSizeWarning(!sizeCheck.withinLimit || sizeCheck.estimatedSizeMB >= warningThreshold);
    } else {
      setShowSizeWarning(false);
    }
  }, [recorder.recordingTime, selectedQuality, maxFileSizeMB, recorder.isRecording, recorder.isPaused]);

  // Handle quality change (only when not recording)
  const handleQualityChange = (quality: AudioQuality) => {
    if (recorder.status === 'idle') {
      setSelectedQuality(quality);
    }
  };

  // Handle upload after recording
  const handleUpload = () => {
    if (recorder.audioFile) {
      onRecordingComplete(recorder.audioFile);
    }
  };

  // Browser not supported
  if (!browserSupport.supported) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Audio Recording Not Supported
            </h3>
            <p className="text-red-700 mb-3">
              Your browser does not support audio recording. Please use one of the following browsers:
            </p>
            <ul className="list-disc list-inside text-red-700 space-y-1">
              <li>Google Chrome (recommended)</li>
              <li>Mozilla Firefox</li>
              <li>Microsoft Edge</li>
            </ul>
            {browserSupport.errors.length > 0 && (
              <div className="mt-3 text-sm text-red-600">
                <strong>Technical details:</strong>
                <ul className="list-disc list-inside mt-1">
                  {browserSupport.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quality Selector - Only show when idle */}
      {recorder.status === 'idle' && (
        <QualitySelector
          selectedQuality={selectedQuality}
          onQualityChange={handleQualityChange}
          disabled={recorder.status !== 'idle'}
        />
      )}

      {/* Recording Interface */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        {/* Timer */}
        {(recorder.isRecording || recorder.isPaused || recorder.isStopped) && (
          <RecordingTimer
            seconds={recorder.recordingTime}
            isRecording={recorder.isRecording}
            isPaused={recorder.isPaused}
            className="mb-6"
          />
        )}

        {/* Waveform Visualizer */}
        <div className="mb-6">
          <WaveformVisualizer
            analyserNode={analyzer.analyserNode}
            isActive={recorder.isRecording || recorder.isPaused}
            height={100}
            barCount={32}
            barColor={recorder.isRecording ? '#3b82f6' : '#9ca3af'}
            className="bg-gray-50"
          />
        </div>

        {/* Volume Level Indicator */}
        {recorder.isRecording && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Input Level</span>
              <span>{Math.round(analyzer.volumeLevel * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 transition-all duration-100"
                style={{ width: `${analyzer.volumeLevel * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Recording Controls */}
        <RecordingControls
          status={recorder.status}
          onStart={recorder.startRecording}
          onPause={recorder.pauseRecording}
          onResume={recorder.resumeRecording}
          onStop={recorder.stopRecording}
          onDiscard={recorder.discardRecording}
        />

        {/* Error Message */}
        {recorder.error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Recording Error</p>
                <p className="text-sm text-red-700 mt-1">{recorder.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* File Size Warning */}
        {showSizeWarning && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">File Size Warning</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Recording is approaching the maximum file size ({maxFileSizeMB} MB).
                  Consider stopping the recording soon or choose a lower quality setting for your next recording.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview and Upload - Show when stopped */}
      {recorder.isStopped && recorder.audioFile && (
        <div className="space-y-4">
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Recording Complete</p>
                <p className="text-sm text-green-700 mt-1">
                  Your recording is ready. Preview it below, then upload to generate SOAP notes.
                </p>
              </div>
            </div>
          </div>

          {/* Audio Preview */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview Recording</h3>
            <AudioPlayer file={recorder.audioFile} />

            <div className="mt-4 text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>File name:</span>
                <span className="font-medium text-gray-900">{recorder.audioFile.name}</span>
              </div>
              <div className="flex justify-between">
                <span>File size:</span>
                <span className="font-medium text-gray-900">
                  {(recorder.audioFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium text-gray-900">
                  {Math.floor(recorder.recordingTime / 60)}:{(recorder.recordingTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Upload Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpload}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-4 focus:ring-blue-200 transition-colors font-medium"
            >
              Upload & Generate SOAP Notes
            </button>

            <button
              onClick={recorder.discardRecording}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:ring-4 focus:ring-gray-200 transition-colors"
            >
              Re-record
            </button>
          </div>
        </div>
      )}

      {/* Info Box - Show when idle */}
      {recorder.status === 'idle' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How to Record:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Select your preferred audio quality</li>
                <li>Click "Start Recording" and allow microphone access</li>
                <li>Speak clearly during the consultation</li>
                <li>Use Pause/Resume as needed</li>
                <li>Click "Stop" when done, preview, and upload</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
