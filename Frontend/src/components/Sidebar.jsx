import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Upload, Grid, Home } from 'lucide-react'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const nav = [
    { to: '/', label: 'Home', Icon: Home, match: (path) => path === '/' },
    { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, match: (path) => path.startsWith('/dashboard') },
    { to: '/analyze', label: 'Analyze', Icon: Upload, match: (path) => path.startsWith('/analyze') },
  ]

  if (!location.pathname.startsWith('/dashboard')) return null

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })()

  return (
    <aside className="hidden lg:flex fixed left-6 top-6 bottom-6 w-56 flex-col surface-2 rounded-3xl p-4 gap-6">
      <Link to="/" className="flex items-center gap-3 pl-2 no-underline">
        <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white">
          <Grid className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">RecruitLens AI</div>
          <div className="text-xs muted">AI Resume Intelligence</div>
        </div>
      </Link>

      <nav className="flex-1 flex flex-col gap-2 mt-2">
        {nav.map(({ to, label, Icon, match }) => {
          const active = match(location.pathname)
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-2xl transition-smooth ${
                active ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto pt-2">
        <div className="border-t border-gray-100 pt-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold">
                {user.name ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('') : (user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                <div className="text-xs muted">View profile</div>
              </div>
              <div>
                <button type="button" className="text-sm text-red-600" onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('token'); navigate('/') }}>Logout</button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Not logged in</div>
          )}
        </div>
      </div>
    </aside>
  )
}
