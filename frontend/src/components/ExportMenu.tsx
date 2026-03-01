import { useState } from 'react'
import { Download, Copy, Printer, Mail, FileText, CheckCircle } from 'lucide-react'
import { useToast } from './ToastContainer'
import type { Consultation } from '../types'
import {
  downloadAsText,
  downloadSOAPAsText,
  downloadTranscriptAsText,
  downloadAsPDF,
  copySOAPToClipboard,
  copyTranscriptToClipboard,
  printConsultation,
  emailConsultation
} from '../utils/exportUtils'

interface ExportMenuProps {
  consultation: Consultation
}

export default function ExportMenu({ consultation }: ExportMenuProps) {
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleCopy = async (type: 'soap' | 'transcript') => {
    setError('')
    try {
      if (type === 'soap') {
        await copySOAPToClipboard(consultation)
        toast.success('SOAP note copied to clipboard')
      } else {
        await copyTranscriptToClipboard(consultation)
        toast.success('Transcript copied to clipboard')
      }
      setCopiedItem(type)
      setTimeout(() => setCopiedItem(null), 2000)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to copy'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleDownload = (type: 'full' | 'soap' | 'transcript') => {
    setError('')
    try {
      if (type === 'full') {
        downloadAsText(consultation)
        toast.success('Consultation downloaded')
      } else if (type === 'soap') {
        downloadSOAPAsText(consultation)
        toast.success('SOAP note downloaded')
      } else {
        downloadTranscriptAsText(consultation)
        toast.success('Transcript downloaded')
      }
      setIsOpen(false)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to download'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleDownloadPDF = () => {
    setError('')
    try {
      downloadAsPDF(consultation)
      toast.success('PDF report downloaded')
      setIsOpen(false)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate PDF'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handlePrint = () => {
    setError('')
    try {
      printConsultation(consultation)
      toast.info('Opening print dialog...')
      setIsOpen(false)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to print'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleEmail = () => {
    setError('')
    try {
      emailConsultation(consultation)
      toast.info('Opening email client...')
      setIsOpen(false)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to open email client'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1" role="menu">
              {/* Error message */}
              {error && (
                <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">
                  {error}
                </div>
              )}

              {/* Section: Download */}
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Download
              </div>

              <button
                onClick={handleDownloadPDF}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <FileText className="h-4 w-4 mr-3 text-red-400" />
                Full Report (.pdf)
              </button>

              <button
                onClick={() => handleDownload('full')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <FileText className="h-4 w-4 mr-3 text-gray-400" />
                Full Consultation (.txt)
              </button>

              {consultation.soap_note && (
                <button
                  onClick={() => handleDownload('soap')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <FileText className="h-4 w-4 mr-3 text-gray-400" />
                  SOAP Note Only (.txt)
                </button>
              )}

              {consultation.transcript && (
                <button
                  onClick={() => handleDownload('transcript')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <FileText className="h-4 w-4 mr-3 text-gray-400" />
                  Transcript Only (.txt)
                </button>
              )}

              {/* Divider */}
              <div className="border-t border-gray-100 my-1" />

              {/* Section: Copy to Clipboard */}
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Copy to Clipboard
              </div>

              {consultation.soap_note && (
                <button
                  onClick={() => handleCopy('soap')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Copy className="h-4 w-4 mr-3 text-gray-400" />
                    Copy SOAP Note
                  </div>
                  {copiedItem === 'soap' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </button>
              )}

              {consultation.transcript && (
                <button
                  onClick={() => handleCopy('transcript')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Copy className="h-4 w-4 mr-3 text-gray-400" />
                    Copy Transcript
                  </div>
                  {copiedItem === 'transcript' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </button>
              )}

              {/* Divider */}
              <div className="border-t border-gray-100 my-1" />

              {/* Section: Other Actions */}
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Other Actions
              </div>

              <button
                onClick={handlePrint}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <Printer className="h-4 w-4 mr-3 text-gray-400" />
                Print
              </button>

              <button
                onClick={handleEmail}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <Mail className="h-4 w-4 mr-3 text-gray-400" />
                Share via Email
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
