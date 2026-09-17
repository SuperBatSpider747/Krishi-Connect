import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Link2, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

export default function Verify() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [method, setMethod] = useState('digilocker')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const role = localStorage.getItem('krishi_active_role')
    if (role === 'officer') navigate('/dashboard', { replace: true })
    if (role === 'agency') navigate('/agency-portal', { replace: true })
  }, [navigate])

  function handleSubmit(e) {
    e.preventDefault()
    if (!consent) return
    window.open('https://www.digilocker.gov.in/', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-serif text-2xl font-semibold text-navy">{t('verify_title')}</h1>
      <p className="mt-2 text-ink/70">{t('verify_sub')}</p>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setMethod('digilocker')}
          className={`text-left border rounded p-4 ${
            method === 'digilocker' ? 'border-navy ring-1 ring-navy' : 'border-navy/15'
          }`}
        >
          <Link2 size={18} className="text-navy mb-2" aria-hidden="true" />
          <p className="font-medium text-ink">{t('verify_option_digilocker')}</p>
          <p className="text-sm text-ink/60 mt-1">{t('verify_option_digilocker_body')}</p>
        </button>
        <button
          type="button"
          onClick={() => setMethod('manual')}
          className={`text-left border rounded p-4 ${
            method === 'manual' ? 'border-navy ring-1 ring-navy' : 'border-navy/15'
          }`}
        >
          <ShieldCheck size={18} className="text-navy mb-2" aria-hidden="true" />
          <p className="font-medium text-ink">{t('verify_option_manual')}</p>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 border border-navy/10 rounded p-5 bg-white">
        {method === 'manual' && (
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <label className="block">
              <span className="text-sm font-medium text-ink">{t('verify_aadhaar_label')}</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                placeholder="XXXX XXXX XXXX"
                className="mt-1 w-full border border-navy/20 rounded px-3 py-2 focus:border-navy outline-none"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">{t('verify_pan_label')}</span>
              <input
                type="text"
                maxLength={10}
                placeholder="ABCDE1234F"
                className="mt-1 w-full border border-navy/20 rounded px-3 py-2 focus:border-navy outline-none uppercase"
              />
            </label>
          </div>
        )}

        <label className="flex items-start gap-2.5 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
            required
          />
          {t('verify_consent')}
        </label>

        <button
          type="submit"
          disabled={!consent || submitting}
          className="mt-5 w-full sm:w-auto inline-flex items-center justify-center rounded bg-navy text-white font-medium px-6 py-3 disabled:opacity-40 hover:bg-navy-light"
        >
          {submitting ? '\u2026' : t('verify_submit')}
        </button>
        {!consent && (
          <p className="mt-2 text-xs text-warn">{t('verify_consent_hint')}</p>
        )}
      </form>

      <div className="mt-6 text-center">
        <Link to="/agencies" className="text-sm text-navy underline underline-offset-2">
          {t('verify_skip')}
        </Link>
        <p className="text-xs text-ink/50 mt-2">{t('verify_note')}</p>
      </div>
    </div>
  )
}
