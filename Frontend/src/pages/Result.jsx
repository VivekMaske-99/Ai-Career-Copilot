import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getAnalysis } from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import ProgressCircle from '../components/ProgressCircle'

const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''))

const normalizeAnalysis = (raw) => {
  if (!raw) return null

  const analysisId = raw.analysisId || raw._id || raw.id
  let filename = raw.filename || raw.originalFilename || raw.resumeFilename || ''
  try {
    if (filename.includes('%')) filename = decodeURIComponent(filename)
  } catch {
    // keep original filename
  }

  const feedback = Array.isArray(raw.feedback)
    ? { suggestions: raw.feedback, strengths: [], weaknesses: raw.weaknesses || [] }
    : {
        suggestions: raw.feedback?.suggestions || [],
        strengths: raw.feedback?.strengths || [],
        weaknesses: raw.feedback?.weaknesses || [],
      }

  return {
    ...raw,
    _id: analysisId,
    analysisId,
    filename,
    feedback,
    skills: raw.skills || [],
    matchedSkills: raw.matchedSkills || [],
    missingSkills: raw.missingSkills || [],
    strengths: raw.strengths || [],
    atsScore: raw.atsScore ?? 0,
    matchScore: raw.matchScore ?? 0,
    aiFeedback: raw.aiFeedback || '',
  }
}

const parseAiFeedback = (value) => {
  if (!value || value === 'Processing...') return null
  try {
    return typeof value === 'string' ? JSON.parse(value) : value
  } catch {
    return null
  }
}

const isSkillLikeStrengths = (items, analysis) => {
  if (!Array.isArray(items) || !items.length) return false

  const skillNames = new Set(
    [...(analysis?.skills || []), ...(analysis?.matchedSkills || [])]
      .map((s) => String(s).toLowerCase().trim())
      .filter(Boolean)
  )

  if (!skillNames.size) return false

  const matches = items.filter((item) =>
    skillNames.has(String(item).toLowerCase().trim())
  ).length

  return matches >= Math.min(2, items.length) || matches === items.length
}

const toRecruiterStrengths = (items, analysis) => {
  const list = (items || []).map((s) => String(s).trim()).filter(Boolean)
  if (!list.length || isSkillLikeStrengths(list, analysis)) return []
  return list.slice(0, 5)
}

const getStateAnalysis = (location, routeId) => {
  const raw = location.state?.analysis
  if (!raw || !routeId) return null

  const stateId = raw.analysisId || raw._id || raw.id
  if (!stateId || String(stateId) !== String(routeId)) return null

  return normalizeAnalysis(raw)
}

export default function Result() {

  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()

  const initialAnalysis = getStateAnalysis(location, id)

  const [analysis, setAnalysis] = useState(initialAnalysis)
  const [loading, setLoading] = useState(!initialAnalysis)
  const [error, setError] = useState(null)

  const [aiFeedback, setAiFeedback] = useState(null)
  const [isPolling, setIsPolling] = useState(false)
  const [pollTimedOut, setPollTimedOut] = useState(false)

  useEffect(() => {

    let mounted = true

    const fetchById = async (fetchId, { silent = false } = {}) => {

      try {

        if (!silent && mounted) {
          setLoading(true)
          setError(null)
        }

        const res = await getAnalysis(fetchId)

        if (!mounted) return

        const doc = (res && res.success && res.data) ? res.data : (res && res.data ? res.data : null)

        if (doc) {
          setAnalysis(normalizeAnalysis(doc))
        } else if (!silent) {
          setError('Analysis not found')
        }

      } catch (err) {

        console.error(err.response?.data || err)

        if (mounted && !silent) {
          setError(
            err.response?.data?.message ||
            err.message ||
            'Failed to load analysis'
          )
        }

      } finally {

        if (mounted) {
          setLoading(false)
        }
      }
    }

    if (!id || !isValidObjectId(id)) {
      setError('No analysis id provided')
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    const fromState = getStateAnalysis(location, id)
    if (fromState) {
      setAnalysis(fromState)
      setLoading(false)
      fetchById(id, { silent: true })
    } else {
      fetchById(id)
    }

    return () => {
      mounted = false
    }

  }, [id, location.state])

  const analysisId = analysis?._id || id || analysis?.analysisId

  useEffect(() => {

    if (!analysis) return

    if (analysis.aiFeedback && analysis.aiFeedback !== 'Processing...') {
      setAiFeedback(analysis.aiFeedback)
      setIsPolling(false)
    }
    else {
      setAiFeedback(null)
      setIsPolling(true)
    }

    if (!analysisId || !isPolling) return

    let mounted = true
    let interval = null

    const start = Date.now()
    const TIMEOUT = 15000

    const doFetch = async () => {

      try {

        const res = await fetch(
          `http://localhost:3000/api/ai-result-by-id/${encodeURIComponent(analysisId)}`
        )

        if (!mounted) return
        if (!res.ok) return

        const data = await res.json()

        if (data?.aiFeedback && data.aiFeedback !== 'Processing...') {
          setAiFeedback(data.aiFeedback)
          setIsPolling(false)
          return
        }

        if (Date.now() - start > TIMEOUT) {
          setPollTimedOut(true)
          setIsPolling(false)
        }

      } catch (err) {

        console.log('AI polling error', err)

        if (Date.now() - start > TIMEOUT) {
          setPollTimedOut(true)
          setIsPolling(false)
        }
      }
    }

    doFetch()

    interval = setInterval(doFetch, 2500)

    return () => {

      mounted = false

      if (interval) {
        clearInterval(interval)
      }
    }

  }, [analysisId, isPolling, analysis])

  const skills = analysis?.skills || []
  const matched = analysis?.matchedSkills || []
  const missing = analysis?.missingSkills || []

  const matchScore = analysis?.matchScore || 0
  const atsScore = analysis?.atsScore || 0

    const parsedAI = useMemo(() => {

    if (!aiFeedback) return null

    try {
      return typeof aiFeedback === 'string'
        ? JSON.parse(aiFeedback)
        : aiFeedback
    }
    catch {
      return null
    }

  }, [aiFeedback])

  const suggestions = useMemo(() => {

  if (!analysis) return []

  // AI parsed suggestions
  if (
    parsedAI &&
    Array.isArray(parsedAI.suggestions) &&
    parsedAI.suggestions.length
  ) {
    return parsedAI.suggestions.map((item, index) => ({
      title: `Improvement ${index + 1}`,
      body: item
    }))
  }

  // Backend stored suggestions
  if (
    analysis?.feedback?.suggestions &&
    Array.isArray(analysis.feedback.suggestions)
  ) {
    return analysis.feedback.suggestions.map((item, index) => ({
      title: `Improvement ${index + 1}`,
      body: item
    }))
  }

  return []

}, [analysis, aiFeedback, parsedAI])

  const displayStrengths = useMemo(() => {
    if (!analysis) return []

    const sources = [
      parsedAI?.strengths,
      analysis?.feedback?.strengths,
      parseAiFeedback(aiFeedback)?.strengths,
      parseAiFeedback(analysis?.aiFeedback)?.strengths,
    ]

    for (const source of sources) {
      const cleaned = toRecruiterStrengths(source, analysis)
      if (cleaned.length) return cleaned
    }

    return []
  }, [analysis, parsedAI, aiFeedback])

  // CONDITIONAL RETURNS MUST COME AFTER ALL HOOKS

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error}
          </h2>

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </Button>

            <Button
              variant="primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        No analysis found
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] overflow-x-hidden">

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">

          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Resume Report
            </h1>

            <p className="text-gray-500 mt-2 text-sm break-all">
              File: {analysis?.filename || analysis?.originalFilename || analysis?.resumeFilename || '—'}
            </p>
          </div>

          <div className="text-sm text-gray-500 mt-2">
            Generated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* TOP SECTION */}
        <div className="grid lg:grid-cols-3 sm:grid-cols-1 gap-5 mb-6">

          {/* ATS SCORE */}
          <Card className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all flex items-center justify-center">
            <div className="flex flex-col items-center justify-center">
              <ProgressCircle value={atsScore} size={140} />
            </div>
          </Card>

          {/* ATS + MATCH */}
          <Card className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">ATS Score</p>
                <div className="flex items-end gap-2">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{atsScore}</h2>
                  <span className="text-gray-400 text-sm">/100</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium mb-1">Match Score</p>
                <h2 className="text-3xl md:text-4xl font-bold text-green-500">{matchScore}%</h2>
              </div>
            </div>
          </Card>

          {/* QUICK ACTIONS */}
          <Card className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Quick Actions</h3>
              <div className="flex flex-col gap-2">
                <Button variant="primary" className="w-full py-2 rounded-lg text-sm font-medium" onClick={() => navigate('/analyze')}>Analyze Another</Button>
                <Button variant="ghost" className="w-full py-2 rounded-lg text-sm border border-gray-200" onClick={() => navigate('/dashboard')}>View Dashboard</Button>
                <Button variant="primary" className="w-full py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700" onClick={() => {
                  // Use only analysis.analysisId to navigate to recruiter simulation
                  console.log('Frontend analysisId:', analysis.analysisId)
                  const id = analysis.analysisId
                  if (id) {
                    navigate(`/recruiter-analysis/${id}`)
                  } else {
                    console.warn('Missing analysisId; cannot navigate to recruiter simulation')
                  }
                }}>View Recruiter Simulation</Button>

                {/* Download buttons moved to Recruiter Simulation page per product rules */}
              </div>
            </div>
          </Card>
        </div>

        {/* SKILLS GRID */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 sm:grid-cols-1 gap-5 mb-6">

          {/* SKILLS */}
          <Card className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills</h3>

            {skills.length ? (
              <div className="flex flex-wrap gap-3">

                {skills.map((skill, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 hover:border-green-300 hover:shadow-sm transition-all"
                  >
                    {skill}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">
                No data available.
              </p>
            )}
          </Card>

          {/* MATCHED */}
          <Card className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Matched Skills</h3>

            {matched.length ? (
              <div className="flex flex-wrap gap-3">

                {matched.map((skill, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 rounded-full bg-green-50 border border-green-200 text-sm font-medium text-green-700"
                  >
                    {skill}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">
                No matched skills.
              </p>
            )}
          </Card>

          {/* MISSING */}
          <Card className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Missing Skills</h3>

            {missing.length ? (
              <div className="flex flex-wrap gap-3">

                {missing.map((skill, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 rounded-full bg-red-50 border border-red-200 text-sm font-medium text-red-600"
                  >
                    {skill}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">
                No critical missing skills detected.
              </p>
            )}
          </Card>

          {/* STRENGTHS */}
          <Card className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Strengths</h3>

            {(isPolling && !pollTimedOut && !displayStrengths.length) ? (
              <p className="text-gray-500">AI is generating strengths...</p>
            ) : displayStrengths.length ? (
                <ul className="space-y-2">
                  {displayStrengths.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 min-w-0">
                      <span className="w-3 h-3 mt-2 rounded-full bg-green-500 flex-shrink-0"></span>
                      <span className="text-gray-800 font-medium text-sm break-words whitespace-normal">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No strengths detected.</p>
              )}
          </Card>
        </div>

        {/* AI SUGGESTIONS */}
        <Card className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="flex items-center justify-between mb-6">

            <h2 className="text-3xl font-bold text-gray-900">
              AI Suggestions
            </h2>

            <div className="text-sm text-gray-500">
              Top improvements for your resume
            </div>
          </div>

          {(isPolling && !pollTimedOut) ? (

            <div className="py-10 text-center text-gray-500">
              AI is generating suggestions...
            </div>

          ) : suggestions.length ? (

            <div className="space-y-4">

              {suggestions.map((item, index) => (

                <div
                  key={index}
                  className="p-5 rounded-2xl border border-gray-200 bg-gray-50 hover:shadow-md transition-all"
                >
                  <div className="flex gap-4">

                    <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center font-bold shrink-0">
                      {index + 1}
                    </div>

                    <div>

                      <h4 className="font-semibold text-gray-900 text-lg mb-2">
                        {item.title}
                      </h4>

                      <p className="text-gray-600 leading-relaxed break-words whitespace-normal">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          ) : (

            <div className="text-gray-500">
              No AI suggestions available.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}