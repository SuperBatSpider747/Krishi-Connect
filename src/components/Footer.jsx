import { useLanguage } from '../i18n/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="mt-16 border-t-4 border-field bg-navy-dark text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="font-serif text-white font-semibold">Government Agriculture Services</p>
          <p className="text-sm text-white/65 mt-1">{t('footer_ministry')}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
          <span>{t('footer_helpline')}: 1800-110-001</span>
          <a href="#" className="hover:text-navy underline underline-offset-2">{t('footer_accessibility')}</a>
          <a href="#" className="hover:text-navy underline underline-offset-2">{t('footer_terms')}</a>
          <a href="#" className="hover:text-navy underline underline-offset-2">{t('footer_privacy')}</a>
        </div>
      </div>
    </footer>
  )
}
