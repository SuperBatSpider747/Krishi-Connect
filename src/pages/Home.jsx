import { Link } from 'react-router-dom'
import { ShieldCheck, Search, CalendarCheck, PackageCheck } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const STEP_ICONS = [ShieldCheck, Search, CalendarCheck, PackageCheck]

export default function Home() {
  const { t } = useLanguage()
  const role = typeof window !== 'undefined' ? localStorage.getItem('krishi_active_role') : null
  const account = role === 'farmer'
    ? JSON.parse(localStorage.getItem('krishi_farmer') || 'null')
    : role === 'agency'
    ? JSON.parse(localStorage.getItem('krishi_agency') || 'null')
    : role === 'officer'
    ? JSON.parse(localStorage.getItem('krishi_officer') || 'null')
    : null

  const steps = [1, 2, 3, 4].map((n) => ({
    title: t(`home_how_${n}_title`),
    body: t(`home_how_${n}_body`),
    Icon: STEP_ICONS[n - 1],
  }))

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-navy/10 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-14 grid md:grid-cols-[1.3fr_1fr] gap-10 items-start">
          <div>
            {account && <p className="mb-3 text-sm font-semibold text-field">Welcome, {account.name}</p>}
            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-navy leading-tight max-w-lg">
              {t('home_headline')}
            </h1>
            <p className="mt-4 text-ink/70 max-w-md">{t('home_sub')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/agencies"
                className="inline-flex items-center rounded bg-navy text-white font-medium px-5 py-3 hover:bg-navy-light"
              >
                {t('home_cta_primary')}
              </Link>
              {role !== 'officer' && role !== 'agency' && (
                <Link
                  to="/verify"
                  className="inline-flex items-center rounded border border-navy text-navy font-medium px-5 py-3 hover:bg-navy/5"
                >
                  {t('home_cta_secondary')}
                </Link>
              )}
            </div>
          </div>

          <div className="border border-navy/15 rounded bg-paper p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-3">{t('home_today_title')}</p>
            <dl className="space-y-3">
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-ink/70">{t('home_stat_centers')}</dt>
                <dd className="font-serif text-xl text-navy font-semibold">312</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-ink/70">{t('home_stat_farmers')}</dt>
                <dd className="font-serif text-xl text-navy font-semibold">48,210</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-ink/70">{t('home_stat_wait')}</dt>
                <dd className="font-serif text-xl text-navy font-semibold">3.5 hrs</dd>
              </div>
              <div className="pt-3 border-t border-navy/10 flex items-baseline justify-between">
                <dt className="text-sm text-ink/70">{t('home_today_token')}</dt>
                <dd className="font-mono text-sm text-gold font-semibold">#A-1042</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="font-serif text-2xl font-semibold text-navy mb-8">{t('home_how_title')}</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ title, body, Icon }, i) => (
            <li key={title} className="border border-navy/10 rounded p-5 bg-white">
              <div className="flex items-center gap-2 text-navy mb-3">
                <Icon size={18} aria-hidden="true" />
                <span className="text-xs font-semibold text-ink/40">{i + 1}</span>
              </div>
              <h3 className="font-medium text-ink mb-1.5">{title}</h3>
              <p className="text-sm text-ink/60">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
