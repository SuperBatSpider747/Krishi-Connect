import { createContext, useContext, useMemo, useState } from 'react'
import { translations, LANGUAGES } from './translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en')

  const value = useMemo(() => {
    const dict = translations[lang] || translations.en
    const t = (key) => dict[key] ?? translations.en[key] ?? key
    return { lang, setLang, t, languages: LANGUAGES }
  }, [lang])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
