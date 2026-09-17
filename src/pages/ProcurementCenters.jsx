import { useLanguage } from '../i18n/LanguageContext'
import { PROCUREMENT_CENTERS } from '../data/mockData'
import StatusFlag from '../components/StatusFlag'
import RatingStars from '../components/RatingStars'
import { MapPin } from 'lucide-react'

export default function ProcurementCenters() {
  const { t } = useLanguage()

  const flagLabel = {
    open: t('center_flag_open'),
    filling: t('center_flag_filling'),
    full: t('center_flag_full'),
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-semibold text-navy">{t('centers_title')}</h1>
      <p className="mt-2 text-ink/70">{t('centers_sub')}</p>

      <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PROCUREMENT_CENTERS.map((c) => (
          <li key={c.id} className="border border-navy/10 rounded bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium text-ink leading-snug">{c.name}</h2>
              <StatusFlag flag={c.flag} label={flagLabel[c.flag]} />
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink/60">
              <MapPin size={14} aria-hidden="true" /> {c.region}
            </p>
            <div className="mt-3"><RatingStars value={c.rating} label={t('center_rating')} /></div>
            <p className="mt-3 text-sm text-ink/60">
              {c.seatsFree} {t('center_slots_free')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
