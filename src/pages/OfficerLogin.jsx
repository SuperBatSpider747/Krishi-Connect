import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Wheat, ShieldCheck } from 'lucide-react'
import { apiFetch } from '../lib/api'

export default function OfficerLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [register, setRegister] = useState(false)
  const [details, setDetails] = useState({ name: '', region: '' })

  useEffect(() => {
    if (localStorage.getItem('krishi_active_role') === 'officer' && localStorage.getItem('krishi_officer_token')) navigate('/dashboard', { replace: true })
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await apiFetch(register ? '/officer/register' : '/officer/login', { method: 'POST', body: JSON.stringify(register ? { ...form, ...details } : form) })
      localStorage.setItem('krishi_officer_token', result.token)
      localStorage.setItem('krishi_officer', JSON.stringify(result.officer))
      localStorage.setItem('krishi_active_role', 'officer')
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-9rem)] bg-paper flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-navy/10 rounded bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-7">
          <span className="w-11 h-11 rounded bg-navy flex items-center justify-center">
            <Wheat size={23} className="text-gold" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-navy">{register ? 'Create officer account' : 'Officer login'}</h1>
            <p className="text-sm text-ink/60">Access today&apos;s operations console</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-ink">Username</span>
            <input required autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" />
          </label>
          {register && <div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm"><span className="font-medium text-ink">Full name</span><input required value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /></label><label className="block text-sm"><span className="font-medium text-ink">Region</span><input required value={details.region} onChange={(e) => setDetails({ ...details, region: e.target.value })} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /></label></div>}
          <label className="block text-sm">
            <span className="font-medium text-ink">Password</span>
            <input required type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" />
          </label>
          {error && <p role="alert" className="text-sm text-danger bg-danger/10 border border-danger/20 rounded px-3 py-2">{error}</p>}
          <button disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded bg-navy text-white font-medium px-4 py-3 hover:bg-navy-light disabled:opacity-60">
            <ShieldCheck size={17} aria-hidden="true" /> {loading ? 'Please wait...' : register ? 'Create officer account' : 'Sign in as officer'}
          </button>
        </form>
        <button type="button" onClick={() => setRegister(!register)} className="mt-4 text-sm text-navy underline">{register ? 'Already have an account? Sign in' : 'New officer? Create an account'}</button>
        <p className="mt-3 text-xs text-ink/50">Demo account: officer / krishi123</p>
      </div>
    </div>
  )
}
