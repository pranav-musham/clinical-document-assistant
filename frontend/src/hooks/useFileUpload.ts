/**
 * Custom Hook for File Upload with Progress Tracking
 *
 * Handles file uploads with real-time progress, speed calculation, and error handling
 */

import { useState, useRef, useCallback } from 'react'
import type { Consultation } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'https://clinical-document-assistant.onrender.com'

export interface UploadProgress {
  file: File
  progress: number // 0-100
  speed: number // bytes per second
  timeRemaining: number // seconds
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
  consultation?: Consultation
}

export interface UploadMeta {
  patient_name?: string
  doctor_name?: string
}

export interface UseFileUploadReturn {
  uploads: Map<string, UploadProgress>
  uploadFile: (file: File, meta?: UploadMeta) => Promise<Consultation | null>
  uploadFiles: (files: File[], meta?: UploadMeta) => Promise<void>
  cancelUpload: (fileId: string) => void
  clearCompleted: () => void
  clearAll: () => void
  isUploading: boolean
}

export function useFileUpload(): UseFileUploadReturn {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())
  const abortControllers = useRef<Map<string, AbortController>>(new Map())

  const getFileId = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`
  }

  const updateUpload = useCallback((fileId: string, update: Partial<UploadProgress>) => {
    setUploads(prev => {
      const newUploads = new Map(prev)
      const current = newUploads.get(fileId)
      if (current) {
        newUploads.set(fileId, { ...current, ...update })
      }
      return newUploads
    })
  }, [])

  const uploadFile = useCallback(async (file: File, meta?: UploadMeta): Promise<Consultation | null> => {
    const fileId = getFileId(file)

    // Initialize upload
    const initialProgress: UploadProgress = {
      file,
      progress: 0,
      speed: 0,
      timeRemaining: 0,
      status: 'uploading'
    }

    setUploads(prev => new Map(prev).set(fileId, initialProgress))

    // Create abort controller
    const controller = new AbortController()
    abortControllers.current.set(fileId, controller)

    try {
      // Prepare form data
      const formData = new FormData()
      formData.append('file', file)
      if (meta?.patient_name) formData.append('patient_name', meta.patient_name)
      if (meta?.doctor_name)  formData.append('doctor_name',  meta.doctor_name)

      const response = await fetch(`${API_URL}/api/consultations/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
        signal: controller.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }))
        throw new Error(errorData.detail || `Upload failed: ${response.statusText}`)
      }

      const consultation: Consultation = await response.json()

      // Mark as processing
      updateUpload(fileId, {
        progress: 100,
        status: 'processing',
        consultation
      })

      // Wait a moment then mark as complete
      setTimeout(() => {
        updateUpload(fileId, {
          status: 'complete'
        })
      }, 500)

      abortControllers.current.delete(fileId)
      return consultation

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Upload was cancelled
        updateUpload(fileId, {
          status: 'error',
          error: 'Upload cancelled'
        })
      } else {
        // Upload failed
        updateUpload(fileId, {
          status: 'error',
          error: error.message || 'Upload failed'
        })
      }

      abortControllers.current.delete(fileId)
      return null
    }
  }, [updateUpload])

  const uploadFiles = useCallback(async (files: File[], meta?: UploadMeta) => {
    // Upload files in parallel
    const promises = files.map(file => uploadFile(file, meta))
    await Promise.allSettled(promises)
  }, [uploadFile])

  const cancelUpload = useCallback((fileId: string) => {
    const controller = abortControllers.current.get(fileId)
    if (controller) {
      controller.abort()
      abortControllers.current.delete(fileId)
    }
  }, [])

  const clearCompleted = useCallback(() => {
    setUploads(prev => {
      const newUploads = new Map(prev)
      for (const [key, upload] of newUploads.entries()) {
        if (upload.status === 'complete' || upload.status === 'error') {
          newUploads.delete(key)
        }
      }
      return newUploads
    })
  }, [])

  const clearAll = useCallback(() => {
    // Cancel all ongoing uploads
    abortControllers.current.forEach(controller => controller.abort())
    abortControllers.current.clear()
    setUploads(new Map())
  }, [])

  const isUploading = Array.from(uploads.values()).some(
    upload => upload.status === 'uploading' || upload.status === 'processing'
  )

  return {
    uploads,
    uploadFile,
    uploadFiles,
    cancelUpload,
    clearCompleted,
    clearAll,
    isUploading
  }
}
