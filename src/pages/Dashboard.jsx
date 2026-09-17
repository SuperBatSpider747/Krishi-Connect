import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { apiFetch } from '../lib/api'
import { ScanLine } from 'lucide-react'

export default function Dashboard() {
  const { t } = useLanguage()
  const [agency, setAgency] = useState(null)
  const [scanValue, setScanValue] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [bookings, setBookings] = useState([])
  const [openIssues, setOpenIssues] = useState([])
  const [resolvedToday, setResolvedToday] = useState([])
  const [region, setRegion] = useState('All regions')
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem('krishi_active_role') !== 'officer' || !localStorage.getItem('krishi_officer_token')) {
      navigate('/officer-login', { state: { from: '/dashboard' }, replace: true })
      return
    }
    async function loadDashboard() {
      const data = await apiFetch('/dashboard')
      setAgency(data.agency)
      setBookings(data.bookings)
      setOpenIssues(data.openIssues)
      setResolvedToday(data.resolvedToday || [])
    }
    loadDashboard().catch((err) => {
      if (err.message.includes('login')) navigate('/officer-login', { state: { from: '/dashboard' }, replace: true })
      else console.error('Failed to load dashboard:', err)
    })
  }, [navigate])

  function handleScan(e) {
    e.preventDefault()
    const found = bookings.find((b) => b.token.toLowerCase() === scanValue.trim().toLowerCase())
    setScanResult(found || 'not_found')
  }

  async function setStatus(token, status) {
    const updated = await apiFetch(`/bookings/${encodeURIComponent(token)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })

    setBookings((prev) => prev.map((b) => (b.token === token ? updated : b)))
    setScanResult((prev) => (prev && prev !== 'not_found' ? { ...prev, status } : prev))
  }

  async function resolveIssue(id) {
    const updated = await apiFetch(`/grievances/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved' }),
    })
    setOpenIssues((prev) => prev.filter((issue) => issue.id !== id))
    setResolvedToday((prev) => [{ grievanceId: id, officerName: JSON.parse(localStorage.getItem('krishi_officer') || '{}').name, action: 'resolved', createdAt: new Date().toISOString(), ...updated }, ...prev])
  }

  const bookedTonnes = bookings.reduce((sum, b) => (b.status !== 'rejected' ? sum + Number(b.quantity) / 10 : sum), 0)
  const regions = ['All regions', ...new Set(bookings.map((booking) => booking.region).filter(Boolean))]
  const visibleBookings = region === 'All regions' ? bookings : bookings.filter((booking) => booking.region === region)

  if (!agency) {
    return <p className="max-w-5xl mx-auto px-4 py-10 text-ink/60">Loading dashboard...</p>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-semibold text-navy">{t('dashboard_title')}</h1>
      <p className="mt-2 text-ink/70">{t('dashboard_sub')} &mdash; {agency.name}</p>
      <button onClick={() => { localStorage.removeItem('krishi_officer_token'); navigate('/officer-login') }} className="mt-3 text-sm text-navy underline">Sign out</button>
      <Link to="/officer-agencies" className="ml-4 text-sm text-navy underline">Manage government agencies</Link>

      <div className="mt-6 grid md:grid-cols-[1fr_1.4fr] gap-6">
        <div className="border border-navy/10 rounded bg-white p-5">
          <h2 className="font-medium text-ink mb-3 flex items-center gap-2">
            <ScanLine size={18} className="text-navy" aria-hidden="true" /> {t('dashboard_scan')}
          </h2>
          <form onSubmit={handleScan} className="flex gap-2">
            <input
              type="text"
              placeholder="TKN-101-4821"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              className="flex-1 border border-navy/20 rounded px-3 py-2 font-mono text-sm"
            />
            <button type="submit" className="rounded bg-navy text-white px-4 py-2 text-sm font-medium hover:bg-navy-light">
              Go
            </button>
          </form>
          {scanResult === 'not_found' && (
            <p className="mt-3 text-sm text-danger">No booking found for that token.</p>
          )}
          {scanResult && scanResult !== 'not_found' && (
            <div className="mt-4 text-sm border-t border-navy/10 pt-3">
              <p className="font-medium">{scanResult.farmer}</p>
              <p className="text-ink/60">{scanResult.quantity} q &middot; {scanResult.vehicle} &middot; {scanResult.slot}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { setStatus(scanResult.token, 'fulfilled'); setScanResult({ ...scanResult, status: 'fulfilled' }) }}
                  className="text-xs font-medium rounded bg-success/10 text-success border border-success/30 px-3 py-1.5"
                >
                  {t('dashboard_mark_fulfilled')}
                </button>
                <button
                  onClick={() => { setStatus(scanResult.token, 'rejected'); setScanResult({ ...scanResult, status: 'rejected' }) }}
                  className="text-xs font-medium rounded bg-danger/10 text-danger border border-danger/30 px-3 py-1.5"
                >
                  {t('dashboard_reject')}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-navy/10">
            <p className="text-sm text-ink/50">{t('dashboard_today_capacity')}</p>
            <p className="font-serif text-xl font-semibold text-navy">
              {bookedTonnes.toFixed(0)} / {agency.capacityTonnes} t
            </p>
          </div>
        </div>

        <div>
          <div className="border border-navy/10 rounded bg-white p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-medium text-ink">Today&apos;s bookings ({visibleBookings.length})</h2>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="border border-navy/20 rounded px-2 py-1 text-sm">
                {regions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <ul className="divide-y divide-navy/10">
              {visibleBookings.map((b) => (
                <li key={b.token} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-mono text-navy">{b.token}</p>
                    <p className="text-ink/60">{b.farmer} &middot; {b.agencyName} &middot; {b.crop} &middot; {b.quantity} q &middot; {b.slot}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded border shrink-0 ${
                      b.status === 'fulfilled'
                        ? 'bg-success/10 text-success border-success/30'
                        : b.status === 'rejected'
                        ? 'bg-danger/10 text-danger border-danger/30'
                        : 'bg-navy/5 text-navy border-navy/20'
                    }`}
                  >
                    {b.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border border-navy/10 rounded bg-white p-5">
            <h2 className="font-medium text-ink mb-3">Today&apos;s open issues</h2>
            <ul className="space-y-2">
              {openIssues.map((g) => (
                <li key={g.id} className="text-sm flex items-center justify-between gap-3 border-b border-navy/10 pb-2">
                  <span>
                    <span className="font-mono text-navy">{g.id}</span> &middot; {g.center} &middot; {g.category} &middot; {g.farmer}
                  </span>
                  <button onClick={() => resolveIssue(g.id)} className="shrink-0 text-xs font-medium rounded bg-success/10 text-success border border-success/30 px-2 py-1">Resolve</button>
                </li>
              ))}
            </ul>
            <h2 className="font-medium text-ink mt-6 mb-3">Resolved by officers today</h2>
            <ul className="space-y-2 text-sm">
              {resolvedToday.map((item, index) => <li key={`${item.grievanceId}-${index}`}><span className="font-mono text-navy">{item.grievanceId || item.id}</span> resolved by {item.officerName || 'Officer'} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
