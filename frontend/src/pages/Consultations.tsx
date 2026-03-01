import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { consultationAPI } from '../services/api'
import type { Consultation } from '../types'
import {
  FileText, Clock, CheckCircle, XCircle, Search, Filter,
  ChevronLeft, ChevronRight, Loader, Calendar, User
} from 'lucide-react'

type StatusFilter = 'all' | 'completed' | 'pending' | 'processing' | 'failed'
type SortBy = 'newest' | 'oldest'

const statusConfig: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  completed:    { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-400', icon: CheckCircle },
  pending:      { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-400',   icon: Clock },
  failed:       { bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-400',     icon: XCircle },
  processing:   { bg: 'bg-cyan-50',     text: 'text-cyan-700',    border: 'border-cyan-400',    icon: Loader },
  transcribing: { bg: 'bg-cyan-50',     text: 'text-cyan-700',    border: 'border-cyan-400',    icon: Loader },
  generating:   { bg: 'bg-indigo-50',   text: 'text-indigo-700',  border: 'border-indigo-400',  icon: Loader },
}

export default function Consultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [filteredConsultations, setFilteredConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [showFilters, setShowFilters] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => { loadConsultations() }, [])
  useEffect(() => { applyFilters() }, [consultations, searchQuery, statusFilter, sortBy])

  const loadConsultations = async () => {
    try {
      const data = await consultationAPI.getAll(0, 100)
      setConsultations(data.consultations)
    } catch (err: any) {
      setError('Failed to load consultations')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...consultations]
    if (statusFilter !== 'all') {
      if (statusFilter === 'processing') {
        filtered = filtered.filter(c => ['pending', 'transcribing', 'generating', 'processing'].includes(c.status))
      } else {
        filtered = filtered.filter(c => c.status === statusFilter)
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.id.toString().includes(q) ||
        c.patient_name?.toLowerCase().includes(q) ||
        c.doctor_name?.toLowerCase().includes(q) ||
        c.transcript?.toLowerCase().includes(q) ||
        new Date(c.created_at).toLocaleString().toLowerCase().includes(q)
      )
    }
    filtered.sort((a, b) => {
      const dA = new Date(a.created_at).getTime()
      const dB = new Date(b.created_at).getTime()
      return sortBy === 'newest' ? dB - dA : dA - dB
    })
    setFilteredConsultations(filtered)
    setCurrentPage(1)
  }

  const getStatusBadge = (status: string) => {
    const cfg = statusConfig[status] || statusConfig.pending
    const Icon = cfg.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
        <Icon className={`h-3 w-3 ${['processing', 'transcribing', 'generating'].includes(status) ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getStatusBorderColor = (status: string) =>
    (statusConfig[status] || statusConfig.pending).border

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

  const totalPages = Math.ceil(filteredConsultations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedConsultations = filteredConsultations.slice(startIndex, startIndex + itemsPerPage)
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)))

  const getStatusCount = (status: StatusFilter) => {
    if (status === 'all') return consultations.length
    if (status === 'processing') return consultations.filter(c => ['pending', 'transcribing', 'generating', 'processing'].includes(c.status)).length
    return consultations.filter(c => c.status === status).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-7 w-7 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consultations</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filteredConsultations.length} {filteredConsultations.length === 1 ? 'consultation' : 'consultations'}
            {searchQuery && ' matching your search'}
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <FileText className="h-4 w-4" />
          New Upload
        </Link>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Search + Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient, doctor, ID or date..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 border text-sm font-medium rounded-xl transition-colors ${
              showFilters
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'completed', 'processing', 'pending', 'failed'] as StatusFilter[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        statusFilter === s
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)} ({getStatusCount(s)})
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      {filteredConsultations.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">
            {consultations.length === 0 ? 'No consultations yet' : 'No results found'}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            {consultations.length === 0
              ? 'Get started by uploading your first audio file.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {consultations.length === 0 && (
            <Link
              to="/upload"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Upload Audio
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedConsultations.map((c) => (
              <Link
                key={c.id}
                to={`/consultations/${c.id}`}
                className={`flex items-center justify-between bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm px-5 py-4 border-l-4 ${getStatusBorderColor(c.status)} hover:shadow-md transition-all group`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {c.patient_name || `Consultation #${c.id}`}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      {c.doctor_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {c.doctor_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(c.created_at)}
                      </span>
                      {c.processing_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {c.processing_time.toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {getStatusBadge(c.status)}
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-700">{startIndex + 1}</span>–
                <span className="font-medium text-slate-700">{Math.min(startIndex + itemsPerPage, filteredConsultations.length)}</span> of{' '}
                <span className="font-medium text-slate-700">{filteredConsultations.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 5) {
                    if (currentPage <= 3) pageNum = i + 1
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                    else pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
