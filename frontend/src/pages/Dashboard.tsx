import { useState, useEffect } from 'react'
import { FileText, Upload, Clock, CheckCircle, XCircle, Loader, TrendingUp, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { consultationAPI } from '../services/api'
import type { Consultation } from '../types'

interface DashboardStats {
  total: number
  completed: number
  pending: number
  failed: number
  processing: number
  avg_processing_time: number
  total_processing_time: number
  recent_consultations: Consultation[]
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await consultationAPI.getStats()
      setStats(data)
    } catch (err: any) {
      setError('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}m ${secs}s`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      completed:   { bg: 'bg-emerald-50',  text: 'text-emerald-700', icon: CheckCircle },
      pending:     { bg: 'bg-amber-50',    text: 'text-amber-700',   icon: Clock },
      failed:      { bg: 'bg-red-50',      text: 'text-red-700',     icon: XCircle },
      processing:  { bg: 'bg-cyan-50',     text: 'text-cyan-700',    icon: Loader },
      transcribing:{ bg: 'bg-cyan-50',     text: 'text-cyan-700',    icon: Loader },
      generating:  { bg: 'bg-indigo-50',   text: 'text-indigo-700',  icon: Loader },
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        <Icon className={`h-3 w-3 ${['processing', 'transcribing', 'generating'].includes(status) ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-7 w-7 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-100 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Consultations',
      value: stats?.total ?? 0,
      icon: FileText,
      accent: 'bg-indigo-500',
      sub: null,
    },
    {
      label: 'Completed',
      value: stats?.completed ?? 0,
      icon: CheckCircle,
      accent: 'bg-emerald-500',
      sub: stats && stats.total > 0
        ? `${((stats.completed / stats.total) * 100).toFixed(0)}% success rate`
        : null,
    },
    {
      label: 'In Progress',
      value: stats?.processing ?? 0,
      icon: Clock,
      accent: 'bg-cyan-500',
      sub: stats && stats.pending > 0 ? `${stats.pending} pending` : null,
    },
    {
      label: 'Avg Process Time',
      value: stats?.avg_processing_time ? formatTime(stats.avg_processing_time) : '—',
      icon: TrendingUp,
      accent: 'bg-violet-500',
      sub: stats && stats.failed > 0 ? `${stats.failed} failed` : null,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of your consultation processing activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, accent, sub }) => (
          <div key={label} className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-5 flex items-start gap-4">
            <div className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl ${accent}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
              {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Ready to process more consultations?</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Upload audio for instant AI-powered transcription and SOAP notes
            </p>
          </div>
          <Link
            to="/upload"
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 text-sm font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm"
          >
            <Upload className="h-4 w-4" />
            Upload Audio
          </Link>
        </div>
      </div>

      {/* Recent Consultations */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Recent Consultations</h2>
          <Link
            to="/consultations"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-50">
          {stats?.recent_consultations && stats.recent_consultations.length > 0 ? (
            stats.recent_consultations.map((c) => (
              <Link
                key={c.id}
                to={`/consultations/${c.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {c.patient_name || `Consultation #${c.id}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {c.doctor_name ? `${c.doctor_name} · ` : ''}{formatDate(c.created_at)}
                      {c.processing_time ? ` · ${formatTime(c.processing_time)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {getStatusBadge(c.status)}
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">No consultations yet</h3>
              <p className="text-sm text-slate-400 mt-1">Get started by uploading your first audio file.</p>
              <Link
                to="/upload"
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload Audio
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
