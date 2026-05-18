import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Zap } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'))
      setUser(u)
    } catch (e) {
      setUser(null)
    }
  }, [location])

  // hide profile in navbar when sidebar (dashboard) is active
  const hideProfile = location.pathname.startsWith('/dashboard')

  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
  <header className="w-full fixed top-0 z-50">
    <div className="max-w-6xl mx-auto px-6 py-3">
      <div
        className={`mx-auto flex items-center justify-between gap-6 px-6 py-3 rounded-full transition-all duration-300 ${
          scrolled
  ? 'bg-white/70  backdrop-blur-9xl shadow-lg border border-gray-200'
  : 'bg-white/10 backdrop-blur-12xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
        }`}
      >
        {/* LEFT: Logo */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]">
              <Zap className="w-5 h-5" />
            </div>
              <div className="text-sm font-bold text-gray-900">
                RecruitLens AI
            </div>
          </Link>
        </div>

        {/* CENTER: nav links */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
          {[
            { to: '/', label: 'Home' },
            { to: '/analyze', label: 'Analyze' },
            { to: '/dashboard', label: 'Dashboard' },
          ].map(({ to, label }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`relative text-sm font-medium transition-all duration-300 ${
                  active
                    ? 'text-green-600'
                    : 'text-gray-700 hover:text-green-600'
                }`}
              >
                {label}

                {/* underline glow */}
                <span
                  className={`absolute left-0 -bottom-1 h-[2px] w-full scale-x-0 bg-gradient-to-r from-green-500 to-green-400 transition-transform duration-300 origin-left ${
                    active ? 'scale-x-100' : 'group-hover:scale-x-100'
                  }`}
                />
              </Link>
            )
          })}
        </nav>

        {/* RIGHT: CTA + login/profile */}
        <div className="flex items-center gap-4">
          {/* Get Started */}
          <button
            onClick={() => navigate('/analyze')}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-green-500 to-green-400 text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(34,197,94,0.35)]"
          >
            Get Started
          </button>

          {/* Login / User */}
          {!user ? (
            <Link
              to="/login"
              className="px-4 py-2 rounded-full backdrop-blur-md bg-white/40 border border-white/30 text-gray-800 font-medium transition-all duration-300 hover:bg-green-50 hover:border-green-400 hover:shadow-[0_0_10px_rgba(34,197,94,0.15)]"
            >
              Login
            </Link>
          ) : (
            !hideProfile && (
              <div className="flex items-center gap-2 pl-2 pr-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                  {user.name
                    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('')
                    : user.email?.[0]?.toUpperCase()}
                </div>
                <div className="text-sm text-gray-800">
                  {user.name || user.email}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  </header>
)
}
