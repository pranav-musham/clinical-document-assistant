import axios from 'axios'
import type { User, AuthResponse, Consultation, ConsultationList } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 errors (redirect to login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: async (email: string, password: string, full_name?: string): Promise<User> => {
    const response = await api.post<User>('/auth/register', { email, password, full_name })
    return response.data
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)

    const response = await api.post<AuthResponse>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me')
    return response.data
  },
}

export const consultationAPI = {
  upload: async (file: File): Promise<Consultation> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<Consultation>('/consultations/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  getAll: async (skip = 0, limit = 10): Promise<ConsultationList> => {
    const response = await api.get<ConsultationList>('/consultations', {
      params: { skip, limit },
    })
    return response.data
  },

  getById: async (id: number): Promise<Consultation> => {
    const response = await api.get<Consultation>(`/consultations/${id}`)
    return response.data
  },

  getStatus: async (id: number): Promise<{
    id: number
    status: string
    is_processing: boolean
    processing_time: number | null
    error_message: string | null
    completed_at: string | null
  }> => {
    const response = await api.get(`/consultations/${id}/status`)
    return response.data
  },

  process: async (id: number): Promise<Consultation> => {
    const response = await api.post<Consultation>(`/consultations/${id}/process`)
    return response.data
  },

  retry: async (id: number): Promise<Consultation> => {
    const response = await api.post<Consultation>(`/consultations/${id}/retry`)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/consultations/${id}`)
  },

  updateSOAPNote: async (id: number, soapNote: string): Promise<Consultation> => {
    const response = await api.put<Consultation>(`/consultations/${id}/soap`, { soap_note: soapNote })
    return response.data
  },

  getStats: async (): Promise<{
    total: number
    completed: number
    pending: number
    failed: number
    processing: number
    avg_processing_time: number
    total_processing_time: number
    recent_consultations: Consultation[]
  }> => {
    const response = await api.get('/consultations/stats/dashboard')
    return response.data
  },
}

export default api
