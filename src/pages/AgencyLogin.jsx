import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { apiFetch } from '../lib/api'

export default function AgencyLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [register, setRegister] = useState(false)
  const [details, setDetails] = useState({ name: '', region: '', address: '', venue: '', timings: '7:00 AM - 6:00 PM', crops: '', capacityTonnes: 100 })

  useEffect(() => {
    if (localStorage.getItem('krishi_active_role') === 'agency' && localStorage.getItem('krishi_agency_token')) navigate('/agency-portal', { replace: true })
  }, [navigate])

  async function submit(event) {
    event.preventDefault(); setError('')
    try {
      const result = await apiFetch(register ? '/agencies/private/register' : '/agencies/login', { method: 'POST', body: JSON.stringify(register ? { ...form, ...details } : form) })
      localStorage.setItem('krishi_agency_token', result.token)
      localStorage.setItem('krishi_agency', JSON.stringify(result.agency))
      localStorage.setItem('krishi_active_role', 'agency')
      navigate(location.state?.from || '/agency-portal', { replace: true })
    } catch (err) { setError(err.message) }
  }

  const update = (key) => (event) => setDetails({ ...details, [key]: event.target.value })
  return <div className="max-w-2xl mx-auto px-4 py-10"><div className="gov-card p-6 sm:p-8"><div className="flex items-start gap-3 border-b border-navy/10 pb-5"><Building2 className="text-field mt-1" size={25} /><div><p className="text-xs uppercase tracking-wider text-field font-semibold">Private procurement partner</p><h1 className="font-serif text-2xl font-semibold text-navy">{register ? 'Register private agency' : 'Private agency login'}</h1><p className="text-sm text-ink/60 mt-1">{register ? 'Create the company listing farmers will see.' : 'Manage your published company listing.'}</p></div></div><form onSubmit={submit} className="mt-6 space-y-4"><div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm"><span className="font-medium">Username</span><input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /></label><label className="block text-sm"><span className="font-medium">Password</span><input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /></label></div>{register && <div className="space-y-4"><label className="block text-sm"><span className="font-medium">Agency/company name</span><input required value={details.name} onChange={update('name')} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /></label><div className="grid sm:grid-cols-2 gap-4">{[['region','Region'],['address','Registered address'],['venue','Procurement venue'],['timings','Operating timings'],['crops','Crops (comma separated)'],['capacityTonnes','Capacity in tonnes']].map(([key,label]) => <label key={key} className="block text-sm"><span className="font-medium">{label}</span><input required value={details[key]} onChange={update(key)} type={key === 'capacityTonnes' ? 'number' : 'text'} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /></label>)}</div></div>}{error && <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded px-3 py-2">{error}</p>}<button className="rounded bg-navy text-white font-medium px-5 py-3">{register ? 'Create agency account' : 'Sign in'}</button></form></div><button type="button" onClick={() => setRegister(!register)} className="mt-4 text-sm text-navy underline">{register ? 'Already registered? Sign in' : 'Register a private agency'}</button><p className="mt-2 text-sm text-ink/60">{!register && <Link to="/login" className="text-navy underline">Choose another login type</Link>}</p></div>
}
