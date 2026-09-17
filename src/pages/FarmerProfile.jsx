import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, LogOut, UserRound } from 'lucide-react'
import { apiFetch } from '../lib/api'

export default function FarmerProfile() {
  const navigate = useNavigate()
  const [farmer, setFarmer] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('krishi_farmer_token')) { navigate('/farmer-login', { replace: true }); return }
    apiFetch('/farmer/me').then(setFarmer).catch((err) => { setError(err.message); localStorage.removeItem('krishi_farmer_token') })
  }, [navigate])

  function signOut() {
    localStorage.removeItem('krishi_farmer_token')
    localStorage.removeItem('krishi_farmer')
    navigate('/farmer-login')
  }

  if (error) return <p className="max-w-3xl mx-auto px-4 py-10 text-danger">{error}. Please register again.</p>
  if (!farmer) return <p className="max-w-3xl mx-auto px-4 py-10 text-ink/60">Loading profile...</p>

  return <div className="max-w-3xl mx-auto px-4 py-10"><div className="gov-card p-6 sm:p-8"><div className="flex items-center justify-between gap-4 border-b border-navy/10 pb-5"><div className="flex items-center gap-3"><div className="w-16 h-16 rounded-full overflow-hidden bg-navy/10 flex items-center justify-center">{farmer.profilePhoto ? <img src={farmer.profilePhoto} alt="Farmer profile" className="w-full h-full object-cover" /> : <UserRound className="text-navy" />}</div><div><p className="text-xs uppercase tracking-wider text-field font-semibold">Verified farmer profile</p><h1 className="font-serif text-2xl font-semibold text-navy">{farmer.name}</h1><p className="text-sm text-ink/60">Farmer ID: {farmer.id}</p></div></div><button onClick={signOut} className="inline-flex items-center gap-1 text-sm text-navy underline"><LogOut size={15} /> Sign out</button></div><dl className="mt-6 grid sm:grid-cols-2 gap-5 text-sm"><div><dt className="text-ink/55">Mobile number</dt><dd className="font-medium mt-1">{farmer.phone}</dd></div><div><dt className="text-ink/55">Aadhaar number</dt><dd className="font-medium mt-1">{farmer.aadhaarNumber || 'Not available'}</dd></div><div><dt className="text-ink/55">PAN number</dt><dd className="font-medium mt-1 uppercase">{farmer.panNumber || 'Not available'}</dd></div><div><dt className="text-ink/55">Profile created</dt><dd className="font-medium mt-1">{new Date(farmer.createdAt).toLocaleDateString()}</dd></div></dl><div className="mt-7 grid sm:grid-cols-2 gap-3"><div className="border border-success/25 bg-success/5 rounded p-4"><p className="font-medium text-success">Aadhaar image {farmer.aadhaarDocument ? 'attached' : 'not attached'}</p><p className="text-xs text-ink/55 mt-1">Optional document upload</p></div><div className="border border-success/25 bg-success/5 rounded p-4"><p className="font-medium text-success">PAN image {farmer.panDocument ? 'attached' : 'not attached'}</p><p className="text-xs text-ink/55 mt-1">Optional document upload</p></div></div><p className="mt-6 text-xs text-ink/50 flex items-center gap-2"><FileText size={14} /> Identity details are stored for procurement verification and are not shown publicly.</p></div></div>
}
