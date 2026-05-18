import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import { TrendingUp, FileText, Calendar } from 'lucide-react'

export default function Dashboard() {
  const [recent, setRecent] = useState([])
  const [stats, setStats] = useState({ total: 0, avg: 0, high: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    // Try fetching server-side history; fallback to localStorage for compatibility
    let mounted = true
    import('../services/api').then(({ getHistory }) => {
      getHistory().then((res) => {
        if (!mounted) return
        if (res && res.success && Array.isArray(res.data)) {
          const list = res.data.map(i => ({
            id: i._id || i.id,
            analysisId: i.analysisId || i._id || i.id,
            recruiterAnalysisId: i.recruiterAnalysisId || i._id || i.id,
            filename: i.filename,
            atsScore: i.atsScore || 0,
            date: new Date(i.createdAt).toLocaleString(),
            recruiterConfidence: i.recruiterConfidence,
            hiringProbability: i.hiringProbability,
            resumeUrl: i.resumeUrl,
            optimizedResumeUrl: i.optimizedResumeUrl || '',
            interviewReadiness: i.interviewReadiness,
            matchedSkills: i.matchedSkills || [],
            communicationScore: i.communicationScore || null,
            // keep full original analysis object so Result can render complete data
            full: i,
          }))
          setRecent(list)
          if (list.length) {
            const scores = list.map((s) => s.atsScore || 0)
            setStats({ total: list.length, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), high: Math.max(...scores) })
          }
          return
        }
        // fallback
        const stored = JSON.parse(localStorage.getItem('recentAnalyses') || '[]')
        setRecent(stored)
        if (stored.length) {
          const scores = stored.map((s) => s.atsScore || 0)
          setStats({ total: stored.length, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), high: Math.max(...scores) })
        }
      }).catch(() => {
        const stored = JSON.parse(localStorage.getItem('recentAnalyses') || '[]')
        setRecent(stored)
        if (stored.length) {
          const scores = stored.map((s) => s.atsScore || 0)
          setStats({ total: stored.length, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), high: Math.max(...scores) })
        }
      })
    })
    return () => { mounted = false }
  }, [])

  return (
    <div className="max-w-6xl mx-auto section">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="muted">Overview of your resume performance and activity</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm muted">Total Analyses</div>
              <div className="text-2xl font-bold mt-2">{stats.total}</div>
            </div>
            <div className="p-3 rounded-xl surface">
              <FileText className="w-6 h-6 text-slate-200" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm muted">Average ATS</div>
              <div className="text-2xl font-bold mt-2">{stats.avg} <span className="muted text-sm">/100</span></div>
            </div>
            <div className="p-3 rounded-xl surface">
              <TrendingUp className="w-6 h-6 text-slate-200" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm muted">Highest Score</div>
              <div className="text-2xl font-bold mt-2">{stats.high || 0} <span className="muted text-sm">/100</span></div>
            </div>
            <div className="p-3 rounded-xl surface">
              <div className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-2">
          <h3 className="text-lg font-semibold mb-2">AI Insights</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <div><strong>Most common recruiter concern:</strong> {recent.length ? (recent.flatMap(r => r.recruiterConcerns || []).slice(0,1).join(', ') || 'N/A') : 'N/A'}</div>
            <div><strong>Most improved ATS area:</strong> {recent.length ? (recent[0].matchedSkills ? (recent[0].matchedSkills[0] || 'Skills') : 'Skills') : 'N/A'}</div>
            <div><strong>Top recruiter strength:</strong> {recent.length ? (recent.reduce((best, r) => (r.recruiterConfidence > (best.recruiterConfidence||0) ? r : best), recent[0]).filename || 'N/A') : 'N/A'}</div>
            <div><strong>Weakest communication area:</strong> {recent.length ? (recent[0].communicationScore || 'N/A') : 'N/A'}</div>
            <div><strong>Resume optimization trend:</strong> {recent.length ? (recent.length > 1 ? (recent[0].atsScore >= recent[Math.min(4, recent.length-1)].atsScore ? 'Stable/Improving' : 'Declining') : 'Insufficient data') : 'N/A'}</div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-200" />
            <h2 className="text-lg font-bold">Recent Activity</h2>
          </div>
        </div>

        {recent.length ? (
          <div className="overflow-hidden" style={{ maxHeight: 320 }}>
            <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
              <table className="w-full table-auto">
              <thead>
                <tr className="text-left muted text-sm">
                  <th className="px-4 py-2">Resume</th>
                  <th className="px-4 py-2">ATS</th>
                  <th className="px-4 py-2">Hiring %</th>
                  <th className="px-4 py-2">Confidence</th>
                  <th className="px-4 py-2">Interview Readiness</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0,5).map((r, i) => (
                  <tr key={i} className="border-t border-white/6 hover:bg-surface transition-smooth">
                    <td className="px-4 py-3 font-medium">{r.filename}</td>
                    <td className="px-4 py-3">{r.atsScore}</td>
                    <td className="px-4 py-3">{r.hiringProbability || '—'}</td>
                    <td className="px-4 py-3">{r.recruiterConfidence || '—'}</td>
                    <td className="px-4 py-3">{r.interviewReadiness ? (r.interviewReadiness.frontend || r.interviewReadiness.technical || 0) + '%' : '—'}</td>
                    <td className="px-4 py-3 muted">{r.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => {
                          const id = r.analysisId || r.id
                          if (id) navigate(`/result/${id}`)
                        }} className="text-sm px-3 py-1 rounded bg-green-50 text-green-700">View Result</button>
                        <button onClick={() => (r.recruiterAnalysisId ? navigate(`/recruiter-analysis/${r.recruiterAnalysisId}`) : (r.id && navigate(`/recruiter-analysis/${r.id}`)))} className="text-sm px-3 py-1 rounded bg-white border">Recruiter</button>
                        <button onClick={async () => {
                          const url = r.optimizedResumeUrl || r.optimizedUrl || r.resumeUrl
                          if (!url) return
                          try {
                            const full = `http://localhost:3000${url}`
                            const resp = await fetch(full, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } })
                            if (!resp.ok) throw new Error('Download failed')
                            const blob = await resp.blob()
                            const blobUrl = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = blobUrl
                            a.download = r.filename || 'resume'
                            document.body.appendChild(a)
                            a.click()
                            a.remove()
                            window.URL.revokeObjectURL(blobUrl)
                          } catch (e) {
                            console.error(e)
                            alert('Failed to download file')
                          }
                        }} className="text-sm px-3 py-1 rounded bg-gray-50">Download</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center muted">No recent analyses yet</div>
        )}
      </Card>
    </div>
  )
}
