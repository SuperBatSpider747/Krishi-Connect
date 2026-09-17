import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react'
import { apiFetch } from '../lib/api'

const fields = [['name', 'Agency name'], ['region', 'Region'], ['address', 'Registered address'], ['venue', 'Procurement venue'], ['timings', 'Operating timings'], ['crops', 'Crops (comma separated)'], ['capacityTonnes', 'Capacity in tonnes']]
const blankAgency = { name: '', region: '', address: '', venue: '', timings: '7:00 AM - 6:00 PM', crops: '', capacityTonnes: 100 }

export default function OfficerAgencies() {
  const navigate = useNavigate()
  const [agencies, setAgencies] = useState([])
  const [selected, setSelected] = useState(null)
  const [newAgency, setNewAgency] = useState(blankAgency)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (localStorage.getItem('krishi_active_role') !== 'officer' || !localStorage.getItem('krishi_officer_token')) { navigate('/officer-login', { state: { from: '/officer-agencies' }, replace: true }); return }
    apiFetch('/agencies').then((data) => setAgencies(data.filter((agency) => agency.agencyType === 'government' && agency.active !== false))).catch((err) => setError(err.message))
  }, [navigate])

  const updateSelected = (key) => (event) => setSelected({ ...selected, [key]: event.target.value })
  const updateNew = (key) => (event) => setNewAgency({ ...newAgency, [key]: event.target.value })
  function edit(agency) { setSelected({ ...agency, crops: agency.crops.join(', ') }); setMessage('') }
  async function save(event) { event.preventDefault(); setError(''); try { const updated = await apiFetch(`/agencies/${selected.id}`, { method: 'PATCH', body: JSON.stringify(selected) }); setAgencies((current) => current.map((agency) => agency.id === updated.id ? updated : agency)); setSelected(null); setMessage('Government agency listing updated.') } catch (err) { setError(err.message) } }
  async function addAgency(event) { event.preventDefault(); setError(''); try { const created = await apiFetch('/agencies/government', { method: 'POST', body: JSON.stringify(newAgency) }); setAgencies((current) => [...current, created]); setNewAgency(blankAgency); setAdding(false); setMessage('Government agency added.') } catch (err) { setError(err.message) } }
  return <div className="max-w-6xl mx-auto px-4 py-10"><Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-navy"><ArrowLeft size={15} /> Officer dashboard</Link><div className="mt-5 flex items-start gap-3"><ShieldCheck className="text-field mt-1" size={26} /><div><p className="text-xs uppercase tracking-wider text-field font-semibold">Officer services</p><h1 className="font-serif text-2xl font-semibold text-navy">Manage government agencies</h1><p className="mt-1 text-ink/65">Officers can add and edit government agency listings. Listing removal is available from Find Agencies.</p></div></div>{error && <p className="mt-4 text-sm text-danger">{error}</p>}{message && <p className="mt-4 text-sm text-success bg-success/10 border border-success/20 rounded px-3 py-2">{message}</p>}<button onClick={() => setAdding(!adding)} className="mt-6 rounded bg-field text-white px-5 py-3">{adding ? 'Cancel new agency' : 'Add government agency'}</button>{adding && <form onSubmit={addAgency} className="mt-4 gov-card p-6 max-w-2xl"><h2 className="font-medium text-navy">New government agency</h2><div className="mt-4 grid sm:grid-cols-2 gap-4">{fields.map(([key, label]) => <label key={key} className="block text-sm"><span className="font-medium">{label}</span><input required value={newAgency[key]} onChange={updateNew(key)} type={key === 'capacityTonnes' ? 'number' : 'text'} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /></label>)}</div><button className="mt-5 rounded bg-navy text-white px-5 py-3">Create government listing</button></form>}{selected ? <form onSubmit={save} className="mt-6 gov-card p-6 max-w-2xl"><h2 className="font-medium text-navy">Edit {selected.name}</h2><div className="mt-4 grid sm:grid-cols-2 gap-4">{fields.map(([key, label]) => <label key={key} className="block text-sm"><span className="font-medium">{label}</span><input required value={selected[key]} onChange={updateSelected(key)} type={key === 'capacityTonnes' ? 'number' : 'text'} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /></label>)}</div><div className="mt-5 flex gap-3"><button className="inline-flex items-center gap-2 rounded bg-navy text-white px-5 py-3"><Save size={16} /> Save changes</button><button type="button" onClick={() => setSelected(null)} className="text-sm text-navy underline">Cancel</button></div></form> : <div className="mt-6 grid md:grid-cols-2 gap-4">{agencies.map((agency) => <article key={agency.id} className="gov-card p-5"><p className="text-xs uppercase tracking-wider text-field">Government agency</p><h2 className="font-medium text-navy mt-2">{agency.name}</h2><p className="text-sm text-ink/60 mt-1">{agency.region} · {agency.venue}</p><p className="text-sm text-ink/60 mt-1">Crops: {agency.crops.join(', ')} · Timings: {agency.timings}</p><div className="mt-4"><button onClick={() => edit(agency)} className="text-sm text-navy underline">Edit listing</button></div></article>)}</div>}</div>
}
