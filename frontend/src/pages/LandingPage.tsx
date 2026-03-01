/**
 * LandingPage Component
 * Public homepage with hero section and action buttons
 * Users can see recording/upload options but must login to use them
 */

import { useState } from 'react';
import { Mic, Upload, Sparkles, Clock, Shield, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicNavBar from '../components/PublicNavBar';
import AuthModal from '../components/AuthModal';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({ open: false, mode: 'login' });

  const openLogin = () => setAuthModal({ open: true, mode: 'login' });
  const openRegister = () => setAuthModal({ open: true, mode: 'register' });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
      {/* Navigation */}
      <PublicNavBar onSignIn={openLogin} onGetStarted={openRegister} />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered Medical Documentation
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Consultations into
            <span className="block text-blue-600 mt-2">Clinical SOAP Notes</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Save 90+ minutes per day. Our AI automatically transcribes doctor-patient
            conversations and generates structured SOAP notes in under 30 seconds.
          </p>

          {/* Action Buttons — conditional on auth state */}
          {user ? (
            /* Logged-in: show app entry points */
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button
                onClick={() => navigate('/upload?mode=record')}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Mic className="w-6 h-6" />
                Start Recording
                <span className="text-sm font-normal opacity-90">Live consultation</span>
              </button>

              <button
                onClick={() => navigate('/upload?mode=upload')}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white text-gray-900 text-lg font-semibold rounded-xl hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-all shadow-lg hover:shadow-xl border-2 border-gray-200 transform hover:-translate-y-0.5"
              >
                <Upload className="w-6 h-6" />
                Upload Audio
                <span className="text-sm font-normal text-gray-600">Existing file</span>
              </button>
            </div>
          ) : (
            /* Guest: show login/register CTAs */
            <>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <button
                  onClick={openRegister}
                  className="w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Get Started — it's free
                </button>

                <button
                  onClick={openLogin}
                  className="w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-white text-gray-900 text-lg font-semibold rounded-xl hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-all shadow-lg hover:shadow-xl border-2 border-gray-200 transform hover:-translate-y-0.5"
                >
                  Sign In
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-8">No credit card required</p>
            </>
          )}
        </div>

        {/* Features Section */}
        <div className="py-16 border-t border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl mb-4">
                <Mic className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Record or Upload
              </h3>
              <p className="text-gray-600">
                Record live consultations in your browser or upload existing audio files.
                Supports MP3, WAV, WebM, and more.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-2xl mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI Transcription
              </h3>
              <p className="text-gray-600">
                Powered by Google Gemini AI, automatically transcribe doctor-patient
                conversations with high accuracy.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                SOAP Notes Generated
              </h3>
              <p className="text-gray-600">
                Structured clinical notes (Subjective, Objective, Assessment, Plan)
                ready for your records.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="py-16 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-6 h-6 text-blue-600" />
                <p className="text-4xl font-bold text-gray-900">&lt;30s</p>
              </div>
              <p className="text-gray-600">Processing Time</p>
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                <p className="text-4xl font-bold text-gray-900">90+</p>
              </div>
              <p className="text-gray-600">Minutes Saved Daily</p>
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-6 h-6 text-blue-600" />
                <p className="text-4xl font-bold text-gray-900">100%</p>
              </div>
              <p className="text-gray-600">Privacy Focused</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="py-8 border-t border-gray-200">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-sm text-yellow-800 text-center">
              <strong> Important Disclaimer:</strong> This is a demonstration project. NOT HIPAA compliant. Do not use with real patient data. For educational
              use only.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 text-sm">
          <p>&copy; 2026 Clinical Documentation Assistant. Built with React + FastAPI + Gemini AI.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal(prev => ({ ...prev, open: false }))}
        initialMode={authModal.mode}
      />
    </div>
  );
}
