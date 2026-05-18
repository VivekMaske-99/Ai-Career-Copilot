import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { login as apiLogin } from '../services/api'
import { AuthContext } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login, setLoading, loading } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading && setLoading(true)
    try {
      const res = await apiLogin({ email, password })
      if (res && res.token) {
        login(res)
        navigate('/dashboard')
      } else {
        setLoading && setLoading(false)
        alert('Login failed')
      }
    } catch (err) {
      setLoading && setLoading(false)
      alert(err.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-24 bg-gradient-to-br from-green-50 via-white to-green-100">
      <div className="w-full max-w-md px-4">

        <div className="bg-white/80 backdrop-blur-2xl border border-gray-200 shadow-xl rounded-3xl p-10">

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back 👋
          </h2>

          <p className="text-gray-500 text-sm mb-8">
            Login to access your dashboard and resume insights
          </p>

          <form onSubmit={submit} className="space-y-6">

            {/* Email */}
            <div>
              <label className="text-sm text-gray-600 block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-4 rounded-xl border border-gray-300 bg-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-gray-600 block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-4 rounded-xl border border-gray-300 bg-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6">
              <button
                type="submit"
                className="px-6 py-3 rounded-full bg-gradient-to-r from-green-500 to-green-400 text-white font-semibold transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              <Link to="/register" className="text-sm text-green-600 hover:underline">
                Create account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}