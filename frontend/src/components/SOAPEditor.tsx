import { useState, useEffect } from 'react'
import { Edit2, Save, X, AlertCircle, Check } from 'lucide-react'
import { useToast } from './ToastContainer'
import ReactMarkdown from 'react-markdown'

interface SOAPEditorProps {
  initialContent: string
  consultationId: number
  onSave: (content: string) => Promise<void>
  disabled?: boolean
}

interface SOAPSection {
  title: string
  key: 'subjective' | 'objective' | 'assessment' | 'plan'
  content: string
}

export default function SOAPEditor({ initialContent, onSave, disabled = false }: SOAPEditorProps) {
  const toast = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sections, setSections] = useState<SOAPSection[]>([])
  const [editedContent, setEditedContent] = useState('')

  useEffect(() => {
    parseSOAPNote(initialContent)
    setEditedContent(initialContent)
  }, [initialContent])

  const parseSOAPNote = (content: string) => {
    const sectionTitles = {
      subjective: ['## SUBJECTIVE', '## Subjective', '## subjective', 'SUBJECTIVE:', 'S:', 'Subjective:'],
      objective:  ['## OBJECTIVE',  '## Objective',  '## objective',  'OBJECTIVE:',  'O:', 'Objective:'],
      assessment: ['## ASSESSMENT', '## Assessment', '## assessment', 'ASSESSMENT:', 'A:', 'Assessment:'],
      plan:       ['## PLAN',       '## Plan',       '## plan',       'PLAN:',       'P:', 'Plan:']
    }

    const parsed: SOAPSection[] = []
    const lines = content.split('\n')
    let currentSection: SOAPSection | null = null

    for (const line of lines) {
      const trimmedLine = line.trim()
      let foundSection = false

      // Check if line is a section header
      for (const [key, titles] of Object.entries(sectionTitles)) {
        if (titles.some(title => trimmedLine.startsWith(title))) {
          // Save previous section
          if (currentSection) {
            parsed.push(currentSection)
          }

          // Start new section
          currentSection = {
            title: key.charAt(0).toUpperCase() + key.slice(1),
            key: key as 'subjective' | 'objective' | 'assessment' | 'plan',
            content: ''
          }
          foundSection = true
          break
        }
      }

      // Add content to current section
      if (!foundSection && currentSection && trimmedLine) {
        currentSection.content += (currentSection.content ? '\n' : '') + line
      }
    }

    // Add last section
    if (currentSection) {
      parsed.push(currentSection)
    }

    // If parsing failed, create default sections
    if (parsed.length === 0) {
      setSections([
        { title: 'Subjective', key: 'subjective', content: content },
        { title: 'Objective', key: 'objective', content: '' },
        { title: 'Assessment', key: 'assessment', content: '' },
        { title: 'Plan', key: 'plan', content: '' }
      ])
    } else {
      setSections(parsed)
    }
  }

  const handleSectionEdit = (key: string, newContent: string) => {
    const updatedSections = sections.map(section =>
      section.key === key ? { ...section, content: newContent } : section
    )
    setSections(updatedSections)

    // Reconstruct full SOAP note
    const reconstructed = updatedSections
      .map(section => `${section.title.toUpperCase()}:\n${section.content}`)
      .join('\n\n')
    setEditedContent(reconstructed)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccess(false)

    try {
      await onSave(editedContent)
      setSuccess(true)
      setIsEditing(false)
      toast.success('SOAP note saved successfully')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save SOAP note'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset to initial content
    parseSOAPNote(initialContent)
    setEditedContent(initialContent)
    setIsEditing(false)
    setError('')
  }

  const getSectionColor = (key: string) => {
    const colors = {
      subjective: 'bg-blue-50 border-blue-200',
      objective: 'bg-green-50 border-green-200',
      assessment: 'bg-yellow-50 border-yellow-200',
      plan: 'bg-purple-50 border-purple-200'
    }
    return colors[key as keyof typeof colors] || 'bg-gray-50 border-gray-200'
  }

  const getSectionIcon = (key: string) => {
    const colors = {
      subjective: 'text-blue-600',
      objective: 'text-green-600',
      assessment: 'text-yellow-600',
      plan: 'text-purple-600'
    }
    return colors[key as keyof typeof colors] || 'text-gray-600'
  }

  return (
    <div className="space-y-4">
      {/* Header with Edit/Save buttons */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">SOAP Note</h4>
        <div className="flex items-center space-x-2">
          {success && (
            <span className="inline-flex items-center text-sm text-green-600">
              <Check className="h-4 w-4 mr-1" />
              Saved successfully
            </span>
          )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              disabled={disabled}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className={`h-4 w-4 mr-1 ${isSaving ? 'animate-pulse' : ''}`} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* SOAP Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.key}
            className={`border rounded-lg overflow-hidden ${getSectionColor(section.key)}`}
          >
            <div className="px-4 py-2 border-b border-current/10">
              <h5 className={`text-sm font-semibold ${getSectionIcon(section.key)}`}>
                {section.title}
              </h5>
            </div>
            <div className="p-4">
              {isEditing ? (
                <textarea
                  value={section.content}
                  onChange={(e) => handleSectionEdit(section.key, e.target.value)}
                  rows={Math.max(3, section.content.split('\n').length + 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono resize-none"
                  placeholder={`Enter ${section.title.toLowerCase()} information...`}
                />
              ) : (
                <div className="text-sm text-gray-700 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:mb-1 [&_p:last-child]:mb-0">
                  {section.content ? (
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No content</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Help text when editing */}
      {isEditing && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-xs text-blue-700">
            <strong>Tip:</strong> Edit each section independently. Changes will be saved when you click the Save button.
          </p>
        </div>
      )}
    </div>
  )
}
