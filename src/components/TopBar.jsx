import { useLanguage } from '../i18n/LanguageContext'
import { Landmark, Phone } from 'lucide-react'

export default function TopBar() {
  const { lang, setLang, t, languages } = useLanguage()

  return (
    <div className="border-t-4 border-gold bg-navy-dark text-white/90 text-xs">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Landmark size={14} className="text-gold shrink-0" aria-hidden="true" />
          <span className="truncate font-medium tracking-wide">Government of India &middot; {t('govLine')}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <a href="tel:1800110001" className="hidden sm:flex items-center gap-1.5 hover:text-gold">
            <Phone size={14} aria-hidden="true" />
            {t('helpline')}: 1800-110-001
          </a>
          <div className="flex items-center gap-1" role="group" aria-label="Select language">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2 py-0.5 border ${
                  lang === l.code
                    ? 'bg-gold text-navy-dark border-gold font-semibold'
                    : 'border-white/30 hover:border-gold hover:text-gold'
                }`}
                aria-pressed={lang === l.code}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
