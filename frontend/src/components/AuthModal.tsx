import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Eye, EyeOff, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateFullName,
} from '../utils/validationUtils'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginEmailError, setLoginEmailError] = useState('')
  const [loginPasswordError, setLoginPasswordError] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Register state
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regFullNameError, setRegFullNameError] = useState('')
  const [regEmailError, setRegEmailError] = useState('')
  const [regPasswordError, setRegPasswordError] = useState('')
  const [regConfirmPasswordError, setRegConfirmPasswordError] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false)

  // Sync mode when initialMode prop changes
  useEffect(() => {
    setMode(initialMode)
  }, [initialMode, isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const resetForms = () => {
    setLoginEmail(''); setLoginPassword(''); setLoginEmailError(''); setLoginPasswordError(''); setLoginError('')
    setRegFullName(''); setRegEmail(''); setRegPassword(''); setRegConfirmPassword('')
    setRegFullNameError(''); setRegEmailError(''); setRegPasswordError(''); setRegConfirmPasswordError(''); setRegError('')
  }

  const handleClose = () => {
    resetForms()
    onClose()
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    const emailV = validateEmail(loginEmail)
    const passwordV = validatePassword(loginPassword)
    setLoginEmailError(emailV.valid ? '' : emailV.error || '')
    setLoginPasswordError(passwordV.valid ? '' : passwordV.error || '')

    if (!emailV.valid || !passwordV.valid) return

    setLoginLoading(true)
    try {
      await login(loginEmail, loginPassword)
      handleClose()
      navigate('/dashboard')
    } catch (err: any) {
      setLoginError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')

    const fullNameV = validateFullName(regFullName)
    const emailV = validateEmail(regEmail)
    const passwordV = validatePassword(regPassword)
    const confirmV = validatePasswordConfirmation(regPassword, regConfirmPassword)

    setRegFullNameError(fullNameV.valid ? '' : fullNameV.error || '')
    setRegEmailError(emailV.valid ? '' : emailV.error || '')
    setRegPasswordError(passwordV.valid ? '' : passwordV.error || '')
    setRegConfirmPasswordError(confirmV.valid ? '' : confirmV.error || '')

    if (!fullNameV.valid || !emailV.valid || !passwordV.valid || !confirmV.valid) return

    setRegLoading(true)
    try {
      await register(regEmail, regPassword, regFullName || undefined)
      handleClose()
      navigate('/dashboard')
    } catch (err: any) {
      setRegError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setRegLoading(false)
    }
  }

  if (!isOpen) return null

  const inputClass = (hasError: boolean) =>
    `appearance-none block w-full px-3 py-2 border ${hasError ? 'border-red-500' : 'border-gray-300'} placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
          {/* Logo + title */}
          <div className="flex flex-col items-center mb-6">
            <FileText className="h-10 w-10 text-blue-600 mb-2" />
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* ── Login Form ── */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-700">{loginError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  onBlur={() => setLoginEmailError(validateEmail(loginEmail).error || '')}
                  className={inputClass(!!loginEmailError)}
                />
                {loginEmailError && <p className="mt-1 text-xs text-red-600">{loginEmailError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    onBlur={() => setLoginPasswordError(validatePassword(loginPassword).error || '')}
                    className={inputClass(!!loginPasswordError) + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginPasswordError && <p className="mt-1 text-xs text-red-600">{loginPasswordError}</p>}
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loginLoading ? 'Signing in...' : 'Sign in'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Create one
                </button>
              </p>
            </form>
          )}

          {/* ── Register Form ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-700">{regError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={regFullName}
                  onChange={e => setRegFullName(e.target.value)}
                  onBlur={() => setRegFullNameError(validateFullName(regFullName).error || '')}
                  className={inputClass(!!regFullNameError)}
                />
                {regFullNameError && <p className="mt-1 text-xs text-red-600">{regFullNameError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  onBlur={() => setRegEmailError(validateEmail(regEmail).error || '')}
                  className={inputClass(!!regEmailError)}
                />
                {regEmailError && <p className="mt-1 text-xs text-red-600">{regEmailError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    onBlur={() => setRegPasswordError(validatePassword(regPassword).error || '')}
                    className={inputClass(!!regPasswordError) + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {regPasswordError && <p className="mt-1 text-xs text-red-600">{regPasswordError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    onBlur={() => setRegConfirmPasswordError(validatePasswordConfirmation(regPassword, regConfirmPassword).error || '')}
                    className={inputClass(!!regConfirmPasswordError) + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {regConfirmPasswordError && <p className="mt-1 text-xs text-red-600">{regConfirmPasswordError}</p>}
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {regLoading ? 'Creating account...' : 'Create account'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
