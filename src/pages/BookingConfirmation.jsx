import { useLocation, Navigate, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, Download } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

export default function BookingConfirmation() {
  const { t } = useLanguage()
  const { state } = useLocation()

  if (!state) return <Navigate to="/agencies" replace />

  return (
    <div className="max-w-xl mx-auto px-4 py-14 text-center">
      <CheckCircle2 size={40} className="text-success mx-auto" aria-hidden="true" />
      <h1 className="mt-4 font-serif text-2xl font-semibold text-navy">{t('confirm_title')}</h1>
      <p className="mt-2 text-ink/70">{t('confirm_sub')}</p>

      <div className="mt-8 border border-navy/10 rounded bg-white p-6 inline-flex flex-col items-center">
        <QRCodeSVG value={state.token} size={140} bgColor="#F6F7F5" fgColor="#14274E" />
        <p className="mt-4 text-xs uppercase tracking-wide text-ink/50">{t('confirm_token')}</p>
        <p className="font-mono text-xl font-semibold text-navy">{state.token}</p>
      </div>

      <dl className="mt-6 text-left border border-navy/10 rounded bg-white p-5 grid grid-cols-2 gap-3 text-sm">
        <dt className="text-ink/50">{t('nav_agencies')}</dt>
        <dd className="font-medium text-right">{state.agencyName}</dd>
        <dt className="text-ink/50">{t('detail_slots_title')}</dt>
        <dd className="font-medium text-right">{state.slotTime}</dd>
        <dt className="text-ink/50">{t('detail_form_name')}</dt>
        <dd className="font-medium text-right">{state.name}</dd>
        <dt className="text-ink/50">{t('detail_form_quantity')}</dt>
        <dd className="font-medium text-right">{state.quantity} q</dd>
      </dl>

      <p className="mt-5 text-sm text-ink/60">
        {t('confirm_sms_sent')}
      </p>

      <div className="mt-7 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded border border-navy text-navy font-medium px-4 py-2.5 hover:bg-navy/5"
        >
          <Download size={16} aria-hidden="true" /> {t('confirm_download')}
        </button>
        <Link
          to="/"
          className="inline-flex items-center rounded bg-navy text-white font-medium px-4 py-2.5 hover:bg-navy-light"
        >
          {t('confirm_done')}
        </Link>
      </div>
    </div>
  )
}
