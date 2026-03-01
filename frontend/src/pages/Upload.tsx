import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Trash2, Upload as UploadIcon, Mic } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import FileUpload from '../components/FileUpload'
import AudioPlayer from '../components/AudioPlayer'
import ProgressBar from '../components/ProgressBar'
import AudioRecorder from '../components/AudioRecorder'
import { useFileUpload } from '../hooks/useFileUpload'

type UploadMode = 'upload' | 'record'

export default function Upload() {
  const [searchParams] = useSearchParams()
  const urlMode = searchParams.get('mode') as UploadMode | null

  const [mode, setMode] = useState<UploadMode>(urlMode || 'upload')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [patientName, setPatientName] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const { uploads, uploadFiles, clearCompleted, isUploading } = useFileUpload()
  const navigate = useNavigate()

  useEffect(() => {
    if (urlMode && (urlMode === 'upload' || urlMode === 'record')) {
      setMode(urlMode)
    }
  }, [urlMode])

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files)
    setShowPreview(files.length > 0)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return
    await uploadFiles(selectedFiles, {
      patient_name: patientName.trim() || undefined,
      doctor_name: doctorName.trim() || undefined,
    })
    setTimeout(() => {
      const first = Array.from(uploads.values()).find(u => u.status === 'complete' && u.consultation)
      if (first?.consultation) navigate(`/consultations/${first.consultation.id}`)
    }, 1000)
  }

  const handleRemoveFile = (file: File) => {
    setSelectedFiles(prev => prev.filter(f => f !== file))
    if (selectedFiles.length === 1) setShowPreview(false)
  }

  const handleRecordingComplete = async (file: File) => {
    await uploadFiles([file], {
      patient_name: patientName.trim() || undefined,
      doctor_name: doctorName.trim() || undefined,
    })
    setTimeout(() => {
      const first = Array.from(uploads.values()).find(u => u.status === 'complete' && u.consultation)
      if (first?.consultation) navigate(`/consultations/${first.consultation.id}`)
    }, 1000)
  }

  const completedUploads = Array.from(uploads.values()).filter(u => u.status === 'complete')
  const failedUploads = Array.from(uploads.values()).filter(u => u.status === 'error')
  const activeUploads = Array.from(uploads.values()).filter(
    u => u.status === 'uploading' || u.status === 'processing'
  )

  const inputClass = 'w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-gray-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 disabled:opacity-50 transition-colors'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Consultation Audio</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload or record audio for automatic transcription and SOAP note generation
        </p>
      </div>

      {/* Consultation Details */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          Consultation Details <span className="font-normal text-slate-400">(optional)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              disabled={isUploading}
              placeholder="e.g. Jane Smith"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Doctor Name</label>
            <input
              type="text"
              value={doctorName}
              onChange={e => setDoctorName(e.target.value)}
              disabled={isUploading}
              placeholder="e.g. Dr. John Doe"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('upload')}
            disabled={isUploading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UploadIcon className="w-4 h-4" />
            Upload Files
          </button>
          <button
            onClick={() => setMode('record')}
            disabled={isUploading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'record'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Mic className="w-4 h-4" />
            Record Audio
          </button>
        </div>
      </div>

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-6">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            multiple={true}
            maxFiles={5}
            disabled={isUploading}
          />

          {showPreview && selectedFiles.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Audio Preview</h3>
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative">
                  <AudioPlayer file={file} />
                  {!isUploading && (
                    <button
                      onClick={() => handleRemoveFile(file)}
                      className="absolute top-2 right-2 p-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="mt-6 flex justify-end gap-3">
              {!isUploading && (
                <button
                  onClick={() => { setSelectedFiles([]); setShowPreview(false) }}
                  className="px-4 py-2.5 border border-slate-200 text-sm font-medium rounded-xl text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Record Mode */}
      {mode === 'record' && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-6">
          <AudioRecorder onRecordingComplete={handleRecordingComplete} />
        </div>
      )}

      {/* Active Uploads */}
      {activeUploads.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Uploading...</h3>
          {activeUploads.map((upload, index) => (
            <ProgressBar
              key={index}
              filename={upload.file.name}
              progress={upload.progress}
              status={upload.status}
              speed={upload.speed}
              timeRemaining={upload.timeRemaining}
            />
          ))}
        </div>
      )}

      {/* Completed */}
      {completedUploads.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Completed ({completedUploads.length})</h3>
            <button onClick={clearCompleted} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Clear
            </button>
          </div>
          <div className="space-y-3">
            {completedUploads.map((upload, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{upload.file.name}</p>
                    <p className="text-xs text-slate-400">Processing completed</p>
                  </div>
                </div>
                {upload.consultation && (
                  <button
                    onClick={() => navigate(`/consultations/${upload.consultation!.id}`)}
                    className="ml-3 text-sm text-indigo-600 hover:text-indigo-800 font-semibold flex-shrink-0"
                  >
                    View →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed */}
      {failedUploads.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Failed ({failedUploads.length})</h3>
            <button onClick={clearCompleted} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Clear
            </button>
          </div>
          <div className="space-y-3">
            {failedUploads.map((upload, index) => (
              <div key={index} className="flex items-center p-3 bg-red-50 border border-red-100 rounded-xl">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mr-3" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{upload.file.name}</p>
                  <p className="text-xs text-red-500">{upload.error}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 p-6 ring-1 ring-indigo-100">
        <h3 className="text-base font-semibold text-slate-800 mb-5">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              n: '1',
              title: mode === 'upload' ? 'Upload Audio' : 'Record Audio',
              desc: mode === 'upload'
                ? 'Drag and drop or select audio files from past consultations'
                : 'Record audio directly in your browser during the consultation',
            },
            { n: '2', title: 'AI Transcription', desc: 'Gemini AI automatically transcribes the doctor-patient conversation' },
            { n: '3', title: 'SOAP Generation', desc: 'Structured clinical notes (S, O, A, P) generated automatically' },
            { n: '4', title: 'Review & Export', desc: 'Review the generated notes and export as PDF, text, or print' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-sm font-bold">
                {n}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
