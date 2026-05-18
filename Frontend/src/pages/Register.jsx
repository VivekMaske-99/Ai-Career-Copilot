import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import { register as apiRegister } from '../services/api'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Register(){
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useContext(AuthContext)

  const submit = async (e) => {
    e.preventDefault()
    setLoading && setLoading(true)
    try {
      const res = await apiRegister({ name, email, password })
      if (res && res.token) {
        login(res)
        navigate('/dashboard')
      } else {
        setLoading && setLoading(false)
        alert('Registration failed')
      }
    } catch (err) {
      setLoading && setLoading(false)
      alert(err.response?.data?.error || 'Registration failed')
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-2">Create account</h2>
          <p className="muted text-sm mb-6">Start analyzing resumes with AI</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm muted block mb-2">Full name</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} required className="w-full p-3 rounded-lg bg-transparent border border-white/6 outline-none" />
            </div>

            <div>
              <label className="text-sm muted block mb-2">Email</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="w-full p-3 rounded-lg bg-transparent border border-white/6 outline-none" />
            </div>

            <div>
              <label className="text-sm muted block mb-2">Password</label>
              <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required className="w-full p-3 rounded-lg bg-transparent border border-white/6 outline-none" />
            </div>

            <div className="flex items-center justify-between">
              <Button variant="primary" type="submit" className="px-6">{loading? 'Creating...' : 'Create account'}</Button>
              <Link to="/login" className="text-sm muted">Already have an account?</Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
