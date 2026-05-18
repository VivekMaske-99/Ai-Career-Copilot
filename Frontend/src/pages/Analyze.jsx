import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyze } from '../services/api'

const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''))

const buildAnalysisPayload = (res, targetId) => {
  let filename = res.filename || ''
  try {
    if (filename.includes('%')) filename = decodeURIComponent(filename)
  } catch {
    // keep original filename
  }

  const feedback = Array.isArray(res.feedback)
    ? { suggestions: res.feedback, strengths: res.strengths || [], weaknesses: res.weaknesses || [] }
    : (res.feedback || {})

  return {
    ...res,
    _id: targetId,
    analysisId: targetId,
    filename,
    feedback,
    skills: res.skills || [],
    matchedSkills: res.matchedSkills || [],
    missingSkills: res.missingSkills || [],
    strengths: res.strengths || [],
    atsScore: res.atsScore ?? 0,
    matchScore: res.matchScore ?? 0,
    aiFeedback: res.aiFeedback || '',
  }
}

import UploadBox from '../components/UploadBox'
import Card from '../components/Card'
import Button from '../components/Button'
import ProgressCircle from '../components/ProgressCircle'

export default function Analyze() {
  const navigate = useNavigate()

  const [resumeFile, setResumeFile] = useState(null)
  const [jdFile, setJdFile] = useState(null)
  const [jdText, setJdText] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    // Relaxed file-like validation: accept File or Blob or objects with name and size
    const isFileLike = (f) => {
      if (!f) return false
      if (typeof File !== 'undefined' && f instanceof File) return true
      if (typeof Blob !== 'undefined' && f instanceof Blob) return true
      if (f && typeof f === 'object' && (f.name || f.size)) return true
      return false
    }

    // Normalize potential wrappers (FileList, array, { file }) to a real File object
    let normalizedResume = resumeFile
    try {
      // If user passed a FileList or array-like
      if (!normalizedResume && typeof window !== 'undefined') {
        // nothing
      } else if (normalizedResume && typeof normalizedResume === 'object' && normalizedResume[0]) {
        normalizedResume = normalizedResume[0]
      } else if (normalizedResume && typeof normalizedResume === 'object' && normalizedResume.file) {
        normalizedResume = normalizedResume.file
      }
    } catch (e) {
      console.warn('Resume normalization error', e)
    }

    // Debug selected file details before validation
    console.log('Submitting Analyze - resumeFile (raw):', resumeFile)
    console.log('resumeFile type:', typeof resumeFile)
    try { console.log('resumeFile instanceof File:', resumeFile instanceof File) } catch (e) {}
    console.log('Submitting Analyze - resumeFile (normalized):', normalizedResume)
    if (normalizedResume && typeof normalizedResume === 'object') {
      try {
        console.log('resumeFile keys:', Object.keys(normalizedResume))
      } catch (e) {}
    }

    if (!isFileLike(normalizedResume)) {
      setError('Please upload a valid resume file')
      return
    }

    setLoading(true)
    setError('')

    // Debug selected files to ensure real File objects
    console.log('Analyze submit - resumeFile:', resumeFile)
    console.log('Analyze submit - jdFile:', jdFile)

    try {
      // ensure we pass the real File object to the analyze helper
      const jdNormalized = jdFile && jdFile[0] ? jdFile[0] : jdFile
      console.log('FormData payload preview - resume:', normalizedResume && (normalizedResume.name || normalizedResume.filename), 'jd:', jdNormalized && (jdNormalized.name || jdNormalized.filename), 'jdText length:', jdText ? jdText.length : 0)
      const res = await analyze({ resumeFile: normalizedResume, jdFile: jdNormalized, jdText })

      const targetId = res.analysisId || res._id || res.id

      if (!targetId || !isValidObjectId(targetId)) {
        setError('Analysis completed but failed to resolve session id. Please go to Dashboard to view your result.')
        return
      }

      const analysisPayload = buildAnalysisPayload(res, targetId)
      navigate(`/result/${targetId}`, { state: { analysis: analysisPayload } })
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || e.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto section">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-3">Analyze Resume</h2>
        <p className="muted">Upload your resume and optionally a job description for ATS analysis and AI suggestions.</p>
      </div>

      <div className="grid md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-6">
          <Card className="p-6 rounded-3xl">
            <UploadBox
              title="Resume Upload"
              hint="PDF • DOC • DOCX • TXT"
              accept=".pdf,.doc,.docx,.txt"
              onFileSelect={(file) => {
                console.log('Resume Selected:', file)
                setResumeFile(file)
              }}
              isLoading={loading}
            />
          </Card>
        </div>

        <div className="md:col-span-6">
          <Card className="p-6 rounded-3xl">
            <UploadBox
              title="Job Description (Optional)"
              hint="PDF • DOC • DOCX • TXT"
              accept=".pdf,.doc,.docx,.txt"
              onFileSelect={(file) => {
                console.log('JD Selected:', file)
                setJdFile(file)
              }}
              isLoading={loading}
            />

            <div className="mt-5">
              <label className="text-sm text-gray-500 block mb-2">Or paste job description</label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste job description here..."
                rows={6}
                className="w-full rounded-2xl border border-gray-200 bg-white p-4 outline-none resize-none focus:border-green-400 focus:ring-4 focus:ring-green-100 transition-all"
              />
            </div>
          </Card>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 font-medium">{error}</div>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <Button variant="primary" onClick={submit} disabled={loading} className="px-8 py-3 rounded-2xl font-semibold">
          {loading ? 'Analyzing...' : 'Analyze Resume'}
        </Button>

        <Button variant="ghost" onClick={() => { setResumeFile(null); setJdFile(null); setJdText(''); setError('') }} className="rounded-2xl">
          Clear
        </Button>
      </div>

      {/* Preview */}
      <div className="mt-14">
        <h3 className="text-2xl font-bold mb-5">Preview</h3>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="flex flex-col items-center justify-center text-center p-6 rounded-3xl">
            <div className="text-sm muted mb-2">ATS Preview</div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-green-400 h-3 rounded-full" style={{ width: '0%' }} />
            </div>
            <div className="mt-3 text-lg font-semibold">0 / 100</div>
          </Card>

          <Card className="p-6 rounded-3xl">
            <h4 className="font-bold mb-4 text-lg">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {['JavaScript', 'React', 'Node.js', 'MongoDB'].map((skill) => (
                <div key={skill} className="px-3 py-2 rounded-full bg-green-50 border border-green-200 text-sm font-medium text-green-700">{skill}</div>
              ))}
            </div>
          </Card>

          <Card className="p-6 rounded-3xl">
            <h4 className="font-bold mb-4 text-lg">AI Suggestions</h4>
            <div className="text-sm text-gray-500 leading-relaxed">Upload your resume to generate ATS score, skill matching, AI suggestions and recruiter insights.</div>
          </Card>
        </div>
      </div>
    </div>
  )
}
