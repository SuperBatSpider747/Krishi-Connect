import { useEffect, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { apiFetch } from '../lib/api'

const GRIEVANCE_CATEGORIES = [
  'Delayed weighing / quality check',
  'Payment not received',
  'Quality rejected unfairly',
  'No shelter / basic facilities',
  'Slot booking technical issue',
  'Other',
]

export default function Grievance() {
  const { t } = useLanguage()
  const [reports, setReports] = useState([])
  const [agencies, setAgencies] = useState([])
  const [form, setForm] = useState({ token: '', center: '', category: GRIEVANCE_CATEGORIES[0], desc: '', phone: '', email: '' })
  const [submitted, setSubmitted] = useState(false)
  const [photo, setPhoto] = useState(null) // { name, url }

  useEffect(() => {
    async function loadData() {
      const [grievances, agencyList] = await Promise.all([
        apiFetch('/grievances'),
        apiFetch('/agencies'),
      ])
      setReports(grievances)
      setAgencies(agencyList)
    }
    loadData().catch((err) => console.error('Failed to load grievance data:', err))
  }, [])

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (photo) URL.revokeObjectURL(photo.url)
    // In production: upload the file to storage (e.g. S3 / Azure Blob) and
    // attach the returned URL to the grievance record instead of an
    // in-memory object URL.
    setPhoto({ name: file.name, url: URL.createObjectURL(file) })
    e.target.value = ''
  }

  function removePhoto() {
    if (photo) URL.revokeObjectURL(photo.url)
    setPhoto(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const newIssue = await apiFetch('/grievances', {
      method: 'POST',
      body: JSON.stringify({
        token: form.token,
        center: form.center,
        category: form.category,
        desc: form.desc,
        phone: form.phone,
        email: form.email,
      }),
    })
    setReports((prev) => [newIssue, ...prev])
    setSubmitted(true)
    setForm({ token: '', center: '', category: GRIEVANCE_CATEGORIES[0], desc: '', phone: '', email: '' })
    removePhoto()
    setTimeout(() => setSubmitted(false), 4000)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-semibold text-navy">{t('grievance_title')}</h1>
      <p className="mt-2 text-ink/70">{t('grievance_sub')}</p>

      <form onSubmit={handleSubmit} className="mt-6 border border-navy/10 rounded bg-white p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="font-medium text-ink">{t('grievance_token')}</span>
            <input
              type="text"
              value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
              className="mt-1 w-full border border-navy/20 rounded px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-ink">{t('grievance_center')}</span>
            <select
              required
              value={form.center}
              onChange={(e) => setForm({ ...form, center: e.target.value })}
              className="mt-1 w-full border border-navy/20 rounded px-3 py-2"
            >
              <option value="" disabled>{t('filter_all')}</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-ink">{t('grievance_category')}</span>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="mt-1 w-full border border-navy/20 rounded px-3 py-2"
          >
            {GRIEVANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-ink">{t('grievance_desc')}</span>
          <textarea
            required
            rows={4}
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
            className="mt-1 w-full border border-navy/20 rounded px-3 py-2"
          />
        </label>

        <div className="block text-sm">
          <span className="font-medium text-ink">{t('grievance_photo')}</span>
          {photo ? (
            <div className="mt-2 flex items-center gap-3 border border-navy/15 rounded p-2 max-w-xs">
              <img src={photo.url} alt="" className="h-14 w-14 object-cover rounded" />
              <span className="text-xs text-ink/60 truncate flex-1">{photo.name}</span>
              <button
                type="button"
                onClick={removePhoto}
                className="text-ink/50 hover:text-ink shrink-0"
                aria-label={t('grievance_photo_remove')}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="mt-2 flex items-center gap-2 border border-dashed border-navy/25 rounded px-3 py-2.5 max-w-xs cursor-pointer text-navy hover:bg-navy/5">
              <ImagePlus size={18} aria-hidden="true" />
              <span className="text-sm font-medium">{t('grievance_photo_cta')}</span>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handlePhotoChange}
                className="sr-only"
              />
            </label>
          )}
          <p className="text-xs text-ink/50 mt-1">{t('grievance_photo_hint')}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
          <label className="block text-sm">
            <span className="font-medium text-ink">{t('detail_form_phone')}</span>
            <input
              type="tel"
              pattern="[0-9]{10}"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full border border-navy/20 rounded px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-ink">Email <small className="text-ink/50">(optional)</small></span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@gmail.com"
              className="mt-1 w-full border border-navy/20 rounded px-3 py-2"
            />
            <small className="text-ink/50">We'll email you when this is resolved</small>
          </label>
        </div>

        <button
          type="submit"
          className="inline-flex items-center rounded bg-navy text-white font-medium px-6 py-3 hover:bg-navy-light"
        >
          {t('grievance_submit')}
        </button>
        {submitted && <p className="text-sm text-success">\u2713</p>}
      </form>

      <h2 className="font-serif text-xl font-semibold text-navy mt-10 mb-4">{t('grievance_status_title')}</h2>
      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.id} className="border border-navy/10 rounded bg-white p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-sm text-navy font-medium">{r.id}</p>
              <p className="text-sm text-ink/70">{r.center} &middot; {r.category}</p>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded border ${
                r.status === 'open'
                  ? 'bg-warn/10 text-warn border-warn/30'
                  : 'bg-success/10 text-success border-success/30'
              }`}
            >
              {r.status === 'open' ? t('grievance_status_open') : t('grievance_status_resolved')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
