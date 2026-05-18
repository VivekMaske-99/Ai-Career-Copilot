import React from 'react'
import { Link } from 'react-router-dom'
import HomeLandingSections from '../components/HomeLandingSections'

export default function Home() {
  return (
    <div>
      <section className="section">
        <div className="max-w-6xl mx-auto grid grid-cols-12 gap-12 items-center">
          <div className="col-span-12 md:col-span-6">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              Build a resume that gets noticed
              <br />
              <span className="green-glow-text">AI-powered</span>, <span className="green-glow-text">ATS-optimized</span>
            </h1>
            <p className="text-lg muted max-w-xl mb-8">
              Upload your resume to receive an instant ATS score, skill extraction, and professional AI recommendations to help you land interviews.
            </p>

            <div className="flex gap-4">
              <Link to="/analyze" className="btn btn-primary">Get started</Link>
              <Link to="/" className="btn btn-ghost">See demo</Link>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 flex justify-end">
            <div className="relative">
              <div className="preview-card p-5 transform-gpu" style={{ animation: 'floaty 6s ease-in-out infinite' }}>
                <div className="h-full p-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm muted">ATS Score</div>
                    <div className="text-2xl font-bold">82</div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3">
                      <div className="text-xs muted">Top skills</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <div className="px-3 py-1 rounded-full surface-2 text-sm">JavaScript</div>
                        <div className="px-3 py-1 rounded-full surface-2 text-sm">React</div>
                        <div className="px-3 py-1 rounded-full surface-2 text-sm">Node.js</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-lg surface-2 text-sm">
                    <div className="font-semibold">AI suggestion</div>
                    <div className="muted text-sm">Replace passive verbs with action-oriented language to improve impact.</div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-6 w-40 h-40 rounded-full gradient-primary opacity-10 blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      <HomeLandingSections />
    </div>
  )
}
