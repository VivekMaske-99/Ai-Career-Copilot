import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Attach token dynamically before each request so we pick up the latest token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => Promise.reject(error))

// Auth
export const register = async (payload) => {
  const res = await api.post('/auth/register', payload)
  return res.data
}

export const login = async (payload) => {
  const res = await api.post('/auth/login', payload)
  return res.data
}

export const getMe = async () => {
  const res = await api.get('/auth/me')
  return res.data
}

// Upload resume and optional JD (file or text)
export const analyze = async ({ resumeFile, jdFile, jdText }) => {
  // Normalize potential wrappers (FileList, array-like)
  const normalize = (f) => {
    if (!f) return null
    if (typeof File !== 'undefined' && f instanceof File) return f
    if (f && typeof f === 'object' && f[0]) return f[0]
    if (f && typeof f === 'object' && f.file) return f.file
    return f
  }

  const rFile = normalize(resumeFile)
  const jFile = normalize(jdFile)

  const formData = new FormData()
  if (rFile) formData.append('resume', rFile)
  if (jFile) formData.append('jd', jFile)
  if (jdText && String(jdText).trim()) formData.append('jdText', jdText.trim())

  // Ensure Authorization header is set to the latest token (if present)
  // Do NOT set Content-Type here so the browser can add multipart boundary automatically
  const token = localStorage.getItem('token')
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Debug: log formData entries to help trace upload issues
  try {
    for (const pair of formData.entries()) {
      const [k, v] = pair
      if (v instanceof File) {
        console.log('FormData entry:', k, v.name, v.size, v.type)
      } else {
        console.log('FormData entry:', k, v)
      }
    }
  } catch (e) {
    console.warn('Could not enumerate FormData entries', e)
  }

  const response = await api.post('/analyze', formData, { headers })
  return response.data
}

// Poll for AI feedback
export const getAIResult = async (filename) => {
  const response = await api.get(`/ai-result/${filename}`)
  return response.data
}

// Dashboard history
export const getHistory = async () => {
  const res = await api.get('/dashboard/history')
  return res.data
}

// Get full analysis (including recruiter simulation)
export const getAnalysis = async (id) => {
  const res = await api.get(`/analysis/${id}`)
  return res.data
}

// Generate optimized resume (returns { success, url })
export const generateOptimizedResume = async (id, format = 'pdf') => {
  const res = await api.post(`/generate-optimized-resume/${id}`, { format })
  return res.data
}

export default api
