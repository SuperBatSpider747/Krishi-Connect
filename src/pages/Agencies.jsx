import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Wheat } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { apiFetch } from '../lib/api'
import RatingStars from '../components/RatingStars'

const CROPS = ['Wheat', 'Paddy', 'Maize', 'Soybean', 'Cotton', 'Mustard']
const REGIONS = ['Ludhiana', 'Bhopal', 'Nashik', 'Karnal', 'Guntur']

export default function Agencies() {
  const { t } = useLanguage()
  const [agencies, setAgencies] = useState([])
  const [region, setRegion] = useState('')
  const [crop, setCrop] = useState('')
  const [agencyType, setAgencyType] = useState('')
  const [recommend, setRecommend] = useState(false)
  const role = typeof window !== 'undefined' ? localStorage.getItem('krishi_active_role') : null
  const agencyAccount = role === 'agency' ? JSON.parse(localStorage.getItem('krishi_agency') || 'null') : null
  const isOfficer = role === 'officer'

  useEffect(() => {
    async function loadAgencies() {
      const data = await apiFetch('/agencies')
      setAgencies(data)
    }
    loadAgencies().catch((err) => console.error('Failed to load agencies:', err))
  }, [])

  const results = useMemo(() => {
    let list = agencies.filter((a) => {
      const matchRegion = !region || a.region === region
      const matchCrop = !crop || a.crops.includes(crop)
      const matchType = !agencyType || a.agencyType === agencyType
      return matchRegion && matchCrop && matchType
    })
    if (recommend) {
      list = [...list].sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating
        return (b.freeTonnes || 0) - (a.freeTonnes || 0)
      })
    }
    return list
  }, [agencies, region, crop, agencyType, recommend])

  async function removeAgency(agency) {
    if (!window.confirm(`Remove ${agency.name} from public listings? The record will remain stored in backend history.`)) return
    await apiFetch(`/agencies/${agency.id}`, { method: 'DELETE' })
    setAgencies((current) => current.filter((item) => item.id !== agency.id))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-semibold text-navy">{t('agencies_title')}</h1>
      <p className="mt-2 text-ink/70">{t('agencies_sub')}</p>

      <div className="mt-6 flex flex-wrap items-end gap-4 border border-navy/10 rounded p-4 bg-white">
        <label className="text-sm">
          <span className="block font-medium text-ink mb-1">Agency type</span>
          <select value={agencyType} onChange={(e) => setAgencyType(e.target.value)} className="border border-navy/20 rounded px-3 py-2 min-w-[180px]"><option value="">All agencies</option><option value="government">Government agencies</option><option value="private">Private agencies</option></select>
        </label>

        <label className="text-sm">
          <span className="block font-medium text-ink mb-1">{t('filter_region')}</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="border border-navy/20 rounded px-3 py-2 min-w-[180px]"
          >
            <option value="">{t('filter_all')}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="block font-medium text-ink mb-1">{t('filter_crop')}</span>
          <select
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            className="border border-navy/20 rounded px-3 py-2 min-w-[180px]"
          >
            <option value="">{t('filter_all')}</option>
            {CROPS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-ink pb-2.5">
          <input
            type="checkbox"
            checked={recommend}
            onChange={(e) => setRecommend(e.target.checked)}
          />
          {t('filter_recommend')}
        </label>
      </div>

      {results.length === 0 ? (
        <p className="mt-10 text-center text-ink/60">{t('no_results')}</p>
      ) : (
        <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((a) => {
            const freeTonnes = a.capacityTonnes - a.bookedTonnes
            return (
              <li key={a.id} className="border border-navy/10 rounded bg-white p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2"><h2 className="font-medium text-ink leading-snug">{a.name}</h2><span className="text-[10px] uppercase tracking-wide border border-field/30 text-field px-1.5 py-0.5 rounded">{a.agencyType === 'private' ? 'Private' : 'Government'}</span></div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/60">
                  <MapPin size={14} aria-hidden="true" /> {a.region}
                </p>
                <div className="mt-3">
                  <RatingStars value={a.rating} />
                </div>
                <div className="mt-3 text-sm">
                  <p className="text-ink/50">{t('agency_card_crops')}</p>
                  <p className="flex items-center gap-1.5 mt-0.5">
                    <Wheat size={14} className="text-field" aria-hidden="true" />
                    {a.crops.join(', ')}
                  </p>
                </div>
                <div className="mt-3 text-sm">
                  <p className="text-ink/50">{t('agency_card_capacity')}</p>
                  <p className="font-medium text-ink">
                    {freeTonnes} / {a.capacityTonnes} t &mdash; {t('detail_slot_capacity')}
                  </p>
                </div>
                <Link
                  to={`/agencies/${a.id}`}
                  className="mt-4 inline-flex items-center justify-center rounded bg-navy text-white text-sm font-medium px-4 py-2 hover:bg-navy-light"
                >
                  {t('agency_card_view')}
                </Link>
                {agencyAccount?.id === a.id && <Link to="/agency-portal" className="mt-2 text-center text-sm text-navy underline">Edit my listing</Link>}
                {isOfficer && <button onClick={() => removeAgency(a)} className="mt-2 text-sm text-danger underline">Remove listing</button>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
