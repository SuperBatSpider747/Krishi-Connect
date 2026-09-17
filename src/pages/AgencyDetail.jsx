import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapPin, ArrowLeft } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { apiFetch } from '../lib/api'
import RatingStars from '../components/RatingStars'

export default function AgencyDetail() {
  const { id } = useParams()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [agency, setAgency] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', crop: '', quantity: '', vehicle: 'Tractor-trolley' })
  const [review, setReview] = useState({ rating: 5, comment: '' })
  const [reviewMessage, setReviewMessage] = useState('')

  useEffect(() => {
    async function loadAgency() {
      if (!id) return
      const data = await apiFetch(`/agencies/${id}`)
      setAgency(data)
      const slotData = await apiFetch(`/agencies/${id}/slots`)
      setSlots(slotData)
    }
    loadAgency().catch((err) => console.error('Failed to load agency:', err))
  }, [id])

  const isVerified = typeof window !== 'undefined' && sessionStorage.getItem('krishiconnect_verified') === 'true'
  const activeAgency = typeof window !== 'undefined' && localStorage.getItem('krishi_active_role') === 'agency' && JSON.parse(localStorage.getItem('krishi_agency') || '{}')
  const isOwnAgency = activeAgency && activeAgency.id === agency?.id
  const isAgencyAccount = typeof window !== 'undefined' && localStorage.getItem('krishi_active_role') === 'agency'

  if (!agency) {
    return <p className="max-w-6xl mx-auto px-4 py-10 text-ink/60">Loading agency details...</p>
  }

  async function handleBook(e) {
    e.preventDefault()
    if (!localStorage.getItem('krishi_farmer_token')) {
      navigate('/farmer-login', { state: { from: `/agencies/${agency.id}` } })
      return
    }
    if (!isVerified) {
      navigate('/verify')
      return
    }

    const response = await apiFetch('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        agencyId: agency.id,
        name: form.name,
        phone: form.phone,
        crop: form.crop || agency.crops[0],
        quantity: form.quantity,
        vehicle: form.vehicle,
        slotTime: selectedSlot?.time,
      }),
    })

    navigate('/confirmation', {
      state: {
        token: response.booking.token,
        agencyName: response.agencyName,
        slotTime: selectedSlot?.time,
        ...form,
      },
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to="/agencies" className="inline-flex items-center gap-1.5 text-sm text-navy mb-6">
        <ArrowLeft size={15} aria-hidden="true" /> {t('detail_back')}
      </Link>

      <div className="border border-navy/10 rounded bg-white p-6">
        <h1 className="font-serif text-2xl font-semibold text-navy">{agency.name}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-ink/60">
          <MapPin size={15} aria-hidden="true" /> {agency.address}
        </p>
        <div className="mt-2"><RatingStars value={agency.rating} label={t('center_rating')} /></div>
        <p className="mt-2 text-xs uppercase tracking-wide text-field">{agency.agencyType === 'private' ? 'Private procurement agency' : 'Government procurement agency'}</p>
        <p className="mt-2 text-sm text-ink/65">Venue: {agency.venue} &middot; Timings: {agency.timings}</p>

        <dl className="mt-5 grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-ink/50">{t('detail_crops')}</dt>
            <dd className="font-medium">{agency.crops.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-ink/50">{t('agency_card_capacity')}</dt>
            <dd className="font-medium">{agency.capacityTonnes - agency.bookedTonnes} / {agency.capacityTonnes} t</dd>
          </div>
        </dl>
      </div>

      {localStorage.getItem('krishi_farmer_token') && <form onSubmit={async (event) => { event.preventDefault(); try { await apiFetch(`/agencies/${agency.id}/reviews`, { method: 'POST', body: JSON.stringify(review) }); setReviewMessage('Your agency review was saved.'); } catch (err) { setReviewMessage(err.message) } }} className="mt-5 border border-navy/10 rounded bg-white p-5"><h2 className="font-medium text-navy">Review this agency</h2><div className="mt-3 flex gap-3 items-end"><label className="text-sm">Rating (1-5)<select value={review.rating} onChange={(e) => setReview({ ...review, rating: e.target.value })} className="block mt-1 border border-navy/20 rounded px-3 py-2">{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label><input placeholder="Optional comment" value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} className="flex-1 border border-navy/20 rounded px-3 py-2 text-sm" /><button className="rounded bg-navy text-white px-4 py-2 text-sm">Submit review</button></div>{reviewMessage && <p className="mt-2 text-sm text-success">{reviewMessage}</p>}</form>}

      {isAgencyAccount ? <p className="mt-8 border border-warn/30 bg-warn/10 rounded p-4 text-sm text-warn">Agency accounts manage listings and cannot book procurement slots. {isOwnAgency ? 'This is your agency listing.' : 'Sign in as a farmer to book a slot.'}</p> : <><h2 className="font-serif text-xl font-semibold text-navy mt-10 mb-4">{t('detail_slots_title')}</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {slots.map((s) => {
          const free = s.capacity - s.booked
          const isFull = free <= 0
          const isSelected = selectedSlot?.id === s.id
          return (
            <button
              key={s.id}
              type="button"
              disabled={isFull}
              onClick={() => setSelectedSlot(s)}
              className={`text-left border rounded p-4 disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected ? 'border-navy ring-1 ring-navy' : 'border-navy/15 hover:border-navy/40'
              }`}
            >
              <p className="font-medium text-ink">{s.time}</p>
              <p className="text-sm text-ink/60 mt-1">
                {isFull ? t('detail_slot_full') : `${free} ${t('detail_slot_capacity')}`}
              </p>
            </button>
          )
        })}
      </div></>}

      {selectedSlot && !isAgencyAccount && (
        <form onSubmit={handleBook} className="mt-8 border border-navy/10 rounded bg-white p-6">
          <h3 className="font-medium text-ink mb-4">{t('detail_form_title')}</h3>

          {!isVerified && (
            <p className="mb-4 text-sm text-warn bg-warn/10 border border-warn/30 rounded px-3 py-2">
              {t('detail_verify_required')}
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="font-medium text-ink">{t('detail_form_name')}</span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full border border-navy/20 rounded px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink">{t('detail_form_phone')}</span>
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full border border-navy/20 rounded px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink">Crop</span>
              <select
                required
                value={form.crop || agency.crops[0]}
                onChange={(e) => setForm({ ...form, crop: e.target.value })}
                className="mt-1 w-full border border-navy/20 rounded px-3 py-2"
              >
                {agency.crops.map((crop) => <option key={crop}>{crop}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink">{t('detail_form_quantity')}</span>
              <input
                type="number"
                min="1"
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="mt-1 w-full border border-navy/20 rounded px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink">{t('detail_form_vehicle')}</span>
              <select
                value={form.vehicle}
                onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                className="mt-1 w-full border border-navy/20 rounded px-3 py-2"
              >
                <option>Tractor-trolley</option>
                <option>Pickup truck</option>
                <option>Mini truck</option>
                <option>Heavy truck</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex items-center rounded bg-navy text-white font-medium px-6 py-3 hover:bg-navy-light"
          >
            {isVerified ? t('detail_form_submit') : t('verify_submit')}
          </button>
        </form>
      )}
    </div>
  )
}
