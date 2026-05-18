import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import ProgressCircle from '../components/ProgressCircle'
import Button from '../components/Button'
import api from '../services/api'
import { generateOptimizedResume as apiGenerateOptimized } from '../services/api'

export default function RecruiterSimulation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    if (!id) return
    console.log('Recruiter Route ID:', id)

    const token = localStorage.getItem('token')
    console.log('Stored Token:', token)
    if (!token) {
      console.warn('No token found in localStorage')
      setLoading(false)
      setAnalysis(null)
      setError('Please login to view recruiter analysis.')
      return
    }

    console.log('Fetching analysis...')
    api.get(`/analysis/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        console.log('Response:', res?.data)
        if (!mounted) return
        if (res && res.data && res.data.success && res.data.data) {
          setAnalysis(res.data.data)
        } else if (res && res.data && res.data.data) {
          // In some backends data may be returned directly
          setAnalysis(res.data.data)
        } else if (res && res.data) {
          // Fallback: try the whole payload
          setAnalysis(res.data)
        } else {
          console.warn('Analysis fetch returned no data', res && res.data)
          setError((res && res.data && res.data.message) ? res.data.message : 'Analysis not found')
        }
      })
      .catch((err) => {
        // Log exact backend payload for debugging
        console.error(err.response?.data || err)
        const backend = err.response?.data
        const message = backend?.message || backend?.error || (typeof backend === 'string' ? backend : null) || 'Failed to load analysis'
        setError(message)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">{error}</h2>
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          <Button variant="primary" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    </div>
  )
  if (!analysis) return <div className="min-h-screen flex items-center justify-center">Analysis not found</div>

  const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0))
  const ats = clamp(analysis.atsScore || 0, 65, 88)
  const hp = clamp(analysis.hiringProbability || 0, 55, 85)
  const rc = clamp(analysis.recruiterConfidence || 0, 60, 85)
  const ic = analysis.interviewChance || 'Unknown'

  const personality = analysis.resumePersonality || {}

  const generateOptimized = async (id, format = 'pdf') => {
    // UI-level wrapper calling API helper
    const result = await apiGenerateOptimized(id, format)
    return result
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recruiter Simulation</h1>
            <p className="muted">AI-generated recruiter evaluation for this resume</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full">
            <Button variant="ghost" className="w-full sm:w-auto shrink-0" onClick={() => navigate(-1)}>Back</Button>
            <Button size="sm" variant="primary" className="w-full sm:flex-1 sm:min-w-[200px]" onClick={async () => {
                  try {
                    const resp = await generateOptimized(analysis._id, 'pdf')
                    if (resp && resp.url) {
                      const full = `http://localhost:3000${resp.url}`
                      const r = await fetch(full, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } })
                      if (!r.ok) throw new Error('Failed to download')
                      const blob = await r.blob()
                      const blobUrl = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = blobUrl
                      a.download = analysis.filename || 'optimized_resume.pdf'
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                      window.URL.revokeObjectURL(blobUrl)
                    }
                  } catch (e) {
                    console.error('Optimized resume generation failed', e)
                    alert('Failed to generate optimized resume')
                  }
                }}>Generate ATS Optimized Resume</Button>

            <Button size="sm" variant="secondary" className="w-full sm:flex-1 sm:min-w-[140px]" onClick={async () => {
                  try {
                    const resp = await generateOptimized(analysis._id, 'docx')
                    if (resp && resp.url) {
                      const full = `http://localhost:3000${resp.url}`
                      const r = await fetch(full, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } })
                      if (!r.ok) throw new Error('Failed to download')
                      const blob = await r.blob()
                      const blobUrl = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = blobUrl
                      a.download = analysis.filename ? (analysis.filename.replace(/\.[^/.]+$/, '') + '.docx') : 'optimized_resume.docx'
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                      window.URL.revokeObjectURL(blobUrl)
                    }
                  } catch (e) {
                    console.error('Optimized resume DOCX generation failed', e)
                    alert('Failed to generate DOCX')
                  }
                }}>Download DOCX</Button>
          </div>
        </div>

        {/* Top analytics cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white rounded-2xl">
            <p className="text-sm muted">Hiring Probability</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-3">
                <ProgressCircle value={hp} size={64} strokeWidth={6} />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{hp}%</h3>
                <p className="muted text-sm">Estimated hiring confidence</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white rounded-2xl">
            <p className="text-sm muted">ATS Score</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-3">
                <ProgressCircle value={ats} size={64} strokeWidth={6} />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{ats}/100</h3>
                <p className="muted text-sm">ATS alignment score</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white rounded-2xl">
            <p className="text-sm muted">Recruiter Confidence</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-3">
                <ProgressCircle value={rc} size={64} strokeWidth={6} />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{rc}%</h3>
                <p className="muted text-sm">Confidence in this evaluation</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white rounded-2xl">
            <p className="text-sm muted">Interview Chance</p>
            <div className="mt-3">
              <h3 className="text-2xl font-bold">{ic}</h3>
              <p className="muted text-sm">Estimated interview likelihood</p>
            </div>
          </Card>
        </div>

        {/* First Impression */}
        <Card className="p-6 rounded-2xl mb-6 bg-gradient-to-r from-white to-green-50">
          <h2 className="text-xl font-bold mb-3">Recruiter First Impression</h2>
          <p className="text-gray-800 text-lg">{analysis.recruiterImpression || 'No impression available.'}</p>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div>
            <Card className="p-4 mb-4">
              <h3 className="font-semibold mb-3">Positive Signals</h3>
              {analysis.positiveSignals && analysis.positiveSignals.length ? (
                <ul className="space-y-2">
                  {analysis.positiveSignals.map((s, i) => (
                    <li key={i} className="text-sm text-green-700">• {s}</li>
                  ))}
                </ul>
              ) : <p className="muted">No positive signals identified.</p>}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Recruiter Concerns</h3>
              {analysis.recruiterConcerns && analysis.recruiterConcerns.length ? (
                <ul className="space-y-2">
                  {analysis.recruiterConcerns.map((s, i) => (
                    <li key={i} className="text-sm text-red-600">• {s}</li>
                  ))}
                </ul>
              ) : <p className="muted">No concerns identified.</p>}
            </Card>
          </div>

          <Card className="p-4 md:col-span-2">
            <h3 className="font-semibold mb-3">Resume Personality Analysis</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm muted">Technical Depth</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-green-400 h-3 rounded-full" style={{ width: `${analysis.technicalDepth ?? personality.technicalDepth ?? 0}%` }} />
                    </div>
                    <div className="w-12 text-right text-sm font-semibold">{analysis.technicalDepth ?? personality.technicalDepth ?? 0}%</div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm muted">Leadership Presence</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-green-400 h-3 rounded-full" style={{ width: `${analysis.leadershipScore ?? personality.leadership ?? 0}%` }} />
                    </div>
                    <div className="w-12 text-right text-sm font-semibold">{analysis.leadershipScore ?? personality.leadership ?? 0}%</div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm muted">Communication Clarity</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-green-400 h-3 rounded-full" style={{ width: `${analysis.communicationScore ?? personality.communication ?? 0}%` }} />
                    </div>
                    <div className="w-12 text-right text-sm font-semibold">{analysis.communicationScore ?? personality.communication ?? 0}%</div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm muted">Business Impact</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-green-400 h-3 rounded-full" style={{ width: `${analysis.businessImpactScore ?? personality.businessImpact ?? 0}%` }} />
                    </div>
                    <div className="w-12 text-right text-sm font-semibold">{analysis.businessImpactScore ?? personality.businessImpact ?? 0}%</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg">
                <p className="text-sm muted mb-2">Innovation Index</p>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className="bg-green-400 h-3 rounded-full" style={{ width: `${analysis.innovationIndex || 0}%` }} />
                </div>
                <p className="text-sm text-gray-600 mt-2">{analysis.innovationCommentary || 'No innovation commentary available.'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Interview Readiness Analyzer */}
        <Card className="p-6 rounded-2xl mb-6 bg-white">
          <h3 className="text-xl font-bold mb-3">Interview Readiness Analyzer</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm muted">Technical Interview Readiness</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Frontend</span>
                  <span className="font-semibold">{analysis.interviewReadiness?.frontend ?? analysis.interviewReadiness?.technical ?? 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: `${analysis.interviewReadiness?.frontend ?? analysis.interviewReadiness?.technical ?? 0}%` }} />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>Backend</span>
                  <span className="font-semibold">{analysis.interviewReadiness?.backend ?? 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: `${analysis.interviewReadiness?.backend ?? 0}%` }} />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>AI / ML</span>
                  <span className="font-semibold">{analysis.interviewReadiness?.ai_ml ?? 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: `${analysis.interviewReadiness?.ai_ml ?? 0}%` }} />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm muted">HR Round Readiness</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm">
                  <span>HR Readiness</span>
                  <span className="font-semibold">{analysis.hrReadiness ?? 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: `${analysis.hrReadiness ?? 0}%` }} />
                </div>
                <p className="text-sm text-gray-600 mt-3">{analysis.hrReadinessCommentary || 'Communication, teamwork and leadership readiness based on resume wording.'}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm muted">Confidence Areas</p>
              <div className="mt-3">
                {analysis.confidenceAreas && analysis.confidenceAreas.length ? (
                  <ul className="space-y-2">
                    {analysis.confidenceAreas.map((c, i) => (
                      <li key={i} className="text-sm text-green-700">• {c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No strong confidence areas identified.</p>
                )}

                <p className="text-sm muted mt-4">Weak Areas</p>
                {analysis.weakAreas && analysis.weakAreas.length ? (
                  <ul className="space-y-2 mt-2">
                    {analysis.weakAreas.map((w, i) => (
                      <li key={i} className="text-sm text-red-600">• {w}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted mt-2">No weak areas identified.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">Likely Interview Questions</h4>
            {analysis.likelyQuestions && analysis.likelyQuestions.length ? (
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-800">
                {analysis.likelyQuestions.slice(0,5).map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            ) : (
              <p className="muted">No questions generated.</p>
            )}
          </div>
        </Card>

        <Card className="p-6 rounded-2xl bg-white">
          <h3 className="text-xl font-bold mb-3">Final Recruiter Verdict</h3>
          <p className="text-gray-800 mb-3">{analysis.finalInterviewPrediction || analysis.finalVerdict || analysis.final_verdict || 'No verdict available.'}</p>
          <p className="text-sm text-gray-600">{analysis.hiringSummary || analysis.finalSummary || 'No premium summary available.'}</p>
        </Card>
      </div>
    </div>
  )
}
