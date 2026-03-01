import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { consultationAPI } from '../services/api'
import type { Consultation } from '../types'
import { ArrowLeft, Trash2, RefreshCw, AlertCircle, User, Stethoscope, Clock, Calendar } from 'lucide-react'
import SOAPEditor from '../components/SOAPEditor'
import ExportMenu from '../components/ExportMenu'

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const pollIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    loadConsultation()
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [id])

  const loadConsultation = async () => {
    try {
      const data = await consultationAPI.getById(Number(id))
      setConsultation(data)
      if (['pending', 'transcribing', 'generating', 'processing'].includes(data.status)) {
        startPolling()
      } else {
        stopPolling()
      }
    } catch (err: any) {
      setError('Failed to load consultation')
      stopPolling()
    } finally {
      setLoading(false)
    }
  }

  const startPolling = () => {
    stopPolling()
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const data = await consultationAPI.getById(Number(id))
        setConsultation(data)
        if (['completed', 'failed'].includes(data.status)) stopPolling()
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 2000)
  }

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const handleRetry = async () => {
    setRetrying(true)
    setError('')
    try {
      await consultationAPI.retry(Number(id))
      await loadConsultation()
    } catch (err: any) {
      setError('Failed to retry consultation')
    } finally {
      setRetrying(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this consultation?')) return
    setDeleting(true)
    try {
      await consultationAPI.delete(Number(id))
      navigate('/consultations')
    } catch (err: any) {
      setError('Failed to delete consultation')
      setDeleting(false)
    }
  }

  const handleSOAPSave = async (content: string) => {
    await consultationAPI.updateSOAPNote(Number(id), content)
    await loadConsultation()
  }

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      completed:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
      failed:       'bg-red-50 text-red-700 border border-red-200',
      transcribing: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
      generating:   'bg-indigo-50 text-indigo-700 border border-indigo-200',
      pending:      'bg-amber-50 text-amber-700 border border-amber-200',
      processing:   'bg-cyan-50 text-cyan-700 border border-cyan-200',
    }
    return styles[status] || styles.pending
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-7 w-7 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (!consultation) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-100 p-6 text-center">
        <p className="text-sm text-amber-700">Consultation not found.</p>
      </div>
    )
  }

  const isProcessing = ['pending', 'transcribing', 'generating', 'processing'].includes(consultation.status)

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/consultations')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Consultations
        </button>
        <div className="flex items-center gap-2">
          {consultation.status === 'completed' && (
            <ExportMenu consultation={consultation} />
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-sm font-medium rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(consultation.status)}`}>
                {isProcessing && <RefreshCw className="h-3 w-3 animate-spin" />}
                {consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1)}
              </span>
              {consultation.status === 'failed' && (
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
                  {retrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {consultation.patient_name && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">Patient:</span>
                  <span>{consultation.patient_name}</span>
                </div>
              )}
              {consultation.doctor_name && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Stethoscope className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">Doctor:</span>
                  <span>{consultation.doctor_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="h-4 w-4 text-slate-400" />
                {new Date(consultation.created_at).toLocaleString()}
              </div>
              {consultation.processing_time && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Processed in {consultation.processing_time.toFixed(1)}s
                </div>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-400">Consultation</p>
            <p className="text-2xl font-bold text-slate-300">#{consultation.id}</p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {consultation.error_message && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-5 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-800">Processing Failed</h4>
            <p className="mt-1 text-sm text-red-600">{consultation.error_message}</p>
          </div>
        </div>
      )}

      {/* Processing banner */}
      {isProcessing && (
        <div className="rounded-2xl bg-cyan-50 border border-cyan-100 p-5 flex gap-3">
          <RefreshCw className="h-5 w-5 text-cyan-500 animate-spin flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-cyan-800">
              {consultation.status === 'transcribing' ? 'Transcribing Audio' :
               consultation.status === 'generating'   ? 'Generating SOAP Note' :
               'Processing Audio'}
            </h4>
            <p className="mt-1 text-sm text-cyan-600">
              {consultation.status === 'transcribing'
                ? 'Transcribing with Gemini AI — this takes about 15–30 seconds.'
                : consultation.status === 'generating'
                ? 'Generating structured SOAP note from transcript...'
                : 'Processing in progress. The page updates automatically.'}
            </p>
          </div>
        </div>
      )}

      {/* Transcript */}
      {consultation.transcript && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Transcript</h3>
          </div>
          <div className="px-6 py-5">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed bg-slate-50 rounded-xl p-4">
              {consultation.transcript}
            </pre>
          </div>
        </div>
      )}

      {/* SOAP Note */}
      {consultation.soap_note && (
        <SOAPEditor
          initialContent={consultation.soap_note}
          consultationId={consultation.id}
          onSave={handleSOAPSave}
          disabled={consultation.status !== 'completed'}
        />
      )}
    </div>
  )
}
