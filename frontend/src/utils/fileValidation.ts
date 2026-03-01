/**
 * File Validation Utilities
 *
 * Provides client-side validation for audio file uploads
 */

export interface ValidationError {
  type: 'size' | 'format' | 'duration' | 'general'
  message: string
  suggestion?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// Configuration
const MAX_FILE_SIZE_MB = 25
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ALLOWED_FORMATS = [
  'audio/mpeg',      // MP3
  'audio/mp3',       // MP3 (alternative)
  'audio/wav',       // WAV
  'audio/wave',      // WAV (alternative)
  'audio/x-wav',     // WAV (alternative)
  'audio/m4a',       // M4A
  'audio/x-m4a',     // M4A (alternative)
  'audio/mp4',       // M4A (alternative)
  'audio/webm',      // WebM
  'audio/ogg',       // OGG
  'audio/vorbis',    // OGG (alternative)
]

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm', '.ogg']

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format duration in seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Check if file extension is allowed
 */
export function hasValidExtension(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return ALLOWED_EXTENSIONS.includes(ext)
}

/**
 * Check if MIME type is allowed
 */
export function hasValidMimeType(type: string): boolean {
  return ALLOWED_FORMATS.includes(type.toLowerCase())
}

/**
 * Validate file size
 */
export function validateFileSize(file: File): ValidationError | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      type: 'size',
      message: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB`,
      suggestion: 'Please compress the audio file or reduce its duration'
    }
  }

  if (file.size === 0) {
    return {
      type: 'size',
      message: 'File is empty (0 bytes)',
      suggestion: 'Please select a valid audio file'
    }
  }

  return null
}

/**
 * Validate file format
 */
export function validateFileFormat(file: File): ValidationError | null {
  // Check MIME type
  const validMimeType = hasValidMimeType(file.type)

  // Check extension
  const validExtension = hasValidExtension(file.name)

  if (!validMimeType && !validExtension) {
    return {
      type: 'format',
      message: `Invalid file format: ${file.type || 'unknown'}`,
      suggestion: `Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`
    }
  }

  return null
}

/**
 * Get audio duration from file
 */
export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    })

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load audio file'))
    })

    audio.src = url
  })
}

/**
 * Validate audio duration (optional, can be disabled)
 */
export async function validateAudioDuration(
  file: File,
  maxDuration?: number
): Promise<ValidationError | null> {
  if (!maxDuration) return null

  try {
    const duration = await getAudioDuration(file)

    if (duration > maxDuration) {
      return {
        type: 'duration',
        message: `Audio duration (${formatDuration(duration)}) exceeds maximum of ${formatDuration(maxDuration)}`,
        suggestion: 'Please trim the audio or split it into smaller segments'
      }
    }

    return null
  } catch (error) {
    // If we can't determine duration, allow the file
    // The backend will handle it
    console.warn('Could not validate audio duration:', error)
    return null
  }
}

/**
 * Comprehensive file validation
 */
export async function validateAudioFile(
  file: File,
  options: {
    maxDurationSeconds?: number
  } = {}
): Promise<ValidationResult> {
  const errors: ValidationError[] = []

  // Check file size
  const sizeError = validateFileSize(file)
  if (sizeError) errors.push(sizeError)

  // Check file format
  const formatError = validateFileFormat(file)
  if (formatError) errors.push(formatError)

  // Check duration (if specified)
  if (options.maxDurationSeconds) {
    const durationError = await validateAudioDuration(file, options.maxDurationSeconds)
    if (durationError) errors.push(durationError)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate multiple files
 */
export async function validateMultipleFiles(
  files: File[],
  options: {
    maxDurationSeconds?: number
  } = {}
): Promise<Map<File, ValidationResult>> {
  const results = new Map<File, ValidationResult>()

  for (const file of files) {
    const result = await validateAudioFile(file, options)
    results.set(file, result)
  }

  return results
}

/**
 * Check if all files are valid
 */
export function areAllFilesValid(results: Map<File, ValidationResult>): boolean {
  return Array.from(results.values()).every(result => result.valid)
}

/**
 * Get summary of validation results
 */
export function getValidationSummary(results: Map<File, ValidationResult>): {
  total: number
  valid: number
  invalid: number
  errors: Array<{ file: File; errors: ValidationError[] }>
} {
  const errors: Array<{ file: File; errors: ValidationError[] }> = []
  let valid = 0
  let invalid = 0

  results.forEach((result, file) => {
    if (result.valid) {
      valid++
    } else {
      invalid++
      errors.push({ file, errors: result.errors })
    }
  })

  return {
    total: results.size,
    valid,
    invalid,
    errors
  }
}
