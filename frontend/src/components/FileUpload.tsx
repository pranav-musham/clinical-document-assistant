/**
 * Drag-and-Drop File Upload Component
 *
 * Supports both drag-drop and click-to-browse file selection
 */

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, File as FileIcon, X, AlertCircle } from 'lucide-react'
import { validateAudioFile, formatFileSize, type ValidationError } from '../utils/fileValidation'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  multiple?: boolean
  maxFiles?: number
  disabled?: boolean
}

interface FileWithErrors {
  file: File
  errors: ValidationError[]
}

export default function FileUpload({
  onFilesSelected,
  multiple = false,
  maxFiles = 5,
  disabled = false
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [filesWithErrors, setFilesWithErrors] = useState<FileWithErrors[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    await processFiles(droppedFiles)
  }

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      await processFiles(selectedFiles)
    }
  }

  const processFiles = async (files: File[]) => {
    // Limit number of files
    const filesToProcess = files.slice(0, multiple ? maxFiles : 1)

    setIsValidating(true)
    const validFiles: File[] = []
    const invalidFiles: FileWithErrors[] = []

    // Validate each file
    for (const file of filesToProcess) {
      const result = await validateAudioFile(file)

      if (result.valid) {
        validFiles.push(file)
      } else {
        invalidFiles.push({ file, errors: result.errors })
      }
    }

    setIsValidating(false)
    setSelectedFiles(validFiles)
    setFilesWithErrors(invalidFiles)

    // Pass valid files to parent
    if (validFiles.length > 0) {
      onFilesSelected(validFiles)
    }
  }

  const removeFile = (file: File) => {
    const newFiles = selectedFiles.filter(f => f !== file)
    setSelectedFiles(newFiles)
    onFilesSelected(newFiles)
  }

  const removeErrorFile = (file: File) => {
    setFilesWithErrors(filesWithErrors.filter(f => f.file !== file))
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragOver
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept="audio/mpeg,audio/wav,audio/m4a,audio/webm,audio/ogg,.mp3,.wav,.m4a,.webm,.ogg"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center">
          <Upload
            className={`h-12 w-12 mb-3 ${
              isDragOver ? 'text-indigo-500' : 'text-gray-400'
            }`}
          />

          <p className="text-lg font-medium text-gray-700 mb-1">
            {isDragOver ? 'Drop files here' : 'Drag & drop audio files'}
          </p>

          <p className="text-sm text-gray-500 mb-4">
            or click to browse
          </p>

          <div className="text-xs text-gray-400">
            <p>Supported formats: MP3, WAV, M4A, WebM, OGG</p>
            <p>Maximum size: 25MB per file</p>
            {multiple && <p>Maximum {maxFiles} files at once</p>}
          </div>
        </div>

        {isValidating && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-sm text-gray-600">Validating files...</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md"
            >
              <div className="flex items-center min-w-0 flex-1">
                <FileIcon className="h-5 w-5 text-green-600 flex-shrink-0 mr-2" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(file)}
                className="ml-3 flex-shrink-0 text-green-600 hover:text-green-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Files with Errors */}
      {filesWithErrors.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-red-700">Invalid Files:</h4>
          {filesWithErrors.map(({ file, errors }, index) => (
            <div
              key={index}
              className="p-3 bg-red-50 border border-red-200 rounded-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start min-w-0 flex-1">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mr-2 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <div className="mt-1 space-y-1">
                      {errors.map((error, errorIndex) => (
                        <div key={errorIndex} className="text-xs text-red-700">
                          <p className="font-medium">{error.message}</p>
                          {error.suggestion && (
                            <p className="text-red-600 mt-0.5">💡 {error.suggestion}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeErrorFile(file)}
                  className="ml-3 flex-shrink-0 text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
