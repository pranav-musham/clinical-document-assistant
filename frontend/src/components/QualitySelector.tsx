/**
 * QualitySelector Component
 * Allows users to select audio recording quality
 */

import { ChevronDown } from 'lucide-react';
import { AudioQuality, QUALITY_PRESETS } from '../utils/audioRecordingUtils';

interface QualitySelectorProps {
  selectedQuality: AudioQuality;
  onQualityChange: (quality: AudioQuality) => void;
  disabled?: boolean;
  className?: string;
}

export default function QualitySelector({
  selectedQuality,
  onQualityChange,
  disabled = false,
  className = ''
}: QualitySelectorProps) {
  const qualities: AudioQuality[] = [
    QUALITY_PRESETS.low,
    QUALITY_PRESETS.medium,
    QUALITY_PRESETS.high
  ];

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Recording Quality
      </label>

      <div className="relative">
        <select
          value={selectedQuality.name}
          onChange={(e) => {
            const quality = qualities.find(q => q.name === e.target.value);
            if (quality) {
              onQualityChange(quality);
            }
          }}
          disabled={disabled}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white cursor-pointer transition-colors"
        >
          {qualities.map(quality => (
            <option key={quality.name} value={quality.name}>
              {quality.name} - {quality.description}
            </option>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Quality details */}
      <div className="mt-2 text-xs text-gray-500 space-y-1">
        <div className="flex justify-between">
          <span>Bitrate:</span>
          <span className="font-medium">{selectedQuality.bitrate / 1000} kbps</span>
        </div>
        <div className="flex justify-between">
          <span>Est. file size:</span>
          <span className="font-medium">~{selectedQuality.estimatedSizeMB} MB/min</span>
        </div>
      </div>

      {/* Quality recommendation */}
      {selectedQuality.name === 'Medium' && (
        <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
          <span className="font-medium">Recommended</span> - Best balance of quality and file size
        </div>
      )}
    </div>
  );
}
