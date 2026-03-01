export interface User {
  id: number
  email: string
  full_name?: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

export enum ConsultationStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  TRANSCRIBING = 'transcribing',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Consultation {
  id: number
  user_id: number
  patient_name?: string
  doctor_name?: string
  audio_filename?: string
  audio_duration?: number
  transcript?: string
  soap_note?: string
  status: ConsultationStatus
  processing_time?: number
  error_message?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface ConsultationList {
  total: number
  consultations: Consultation[]
}

// Audio Recording Types
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error'

export interface AudioQuality {
  name: string
  description: string
  bitrate: number
  sampleRate: number
  mimeType: string
  estimatedSizeMB: number
}

export interface RecordingState {
  status: RecordingStatus
  duration: number
  blob: Blob | null
  file: File | null
}
