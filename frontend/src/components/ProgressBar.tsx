/**
 * Progress Bar Component
 *
 * Displays upload progress with percentage, speed, and time remaining
 */

import { CheckCircle, XCircle, Loader } from 'lucide-react'

interface ProgressBarProps {
  progress: number // 0-100
  status: 'uploading' | 'processing' | 'complete' | 'error'
  filename: string
  speed?: number // bytes per second
  timeRemaining?: number // seconds
  error?: string
}

export default function ProgressBar({
  progress,
  status,
  filename,
  speed,
  timeRemaining,
  error
}: ProgressBarProps) {
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond.toFixed(0)} B/s`
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
    } else {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`
    } else {
      const mins = Math.floor(seconds / 60)
      const secs = Math.ceil(seconds % 60)
      return `${mins}m ${secs}s`
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'processing':
        return 'bg-blue-500'
      default:
        return 'bg-indigo-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <Loader className="h-5 w-5 text-indigo-600 animate-spin" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'complete':
        return 'Complete'
      case 'error':
        return 'Failed'
      case 'processing':
        return 'Processing...'
      default:
        return 'Uploading...'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-sm font-medium text-gray-900 truncate">{filename}</p>
          <p className="text-xs text-gray-500 mt-0.5">{getStatusText()}</p>
        </div>
        <div className="flex-shrink-0">{getStatusIcon()}</div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="flex mb-1 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block text-indigo-600">
              {Math.round(progress)}%
            </span>
          </div>
          {speed && status === 'uploading' && (
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-gray-600">
                {formatSpeed(speed)}
              </span>
            </div>
          )}
        </div>
        <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200">
          <div
            style={{ width: `${Math.min(progress, 100)}%` }}
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300 ${getStatusColor()}`}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        {timeRemaining && status === 'uploading' && (
          <span>Time remaining: {formatTime(timeRemaining)}</span>
        )}
        {status === 'processing' && (
          <span className="text-blue-600">Processing with AI...</span>
        )}
        {status === 'complete' && (
          <span className="text-green-600">Upload successful!</span>
        )}
        {status === 'error' && error && (
          <span className="text-red-600">{error}</span>
        )}
      </div>
    </div>
  )
}
