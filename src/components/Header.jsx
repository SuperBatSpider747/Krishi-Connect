import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Wheat } from 'lucide-react'
import TopBar from './TopBar'
import { useLanguage } from '../i18n/LanguageContext'

const navLinkClass = ({ isActive }) =>
  `px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
    isActive
      ? 'border-gold text-navy'
      : 'border-transparent text-ink/70 hover:text-navy hover:border-navy/30'
  }`

export default function Header() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const role = typeof window !== 'undefined' ? localStorage.getItem('krishi_active_role') : null
  const account = role === 'farmer'
    ? JSON.parse(localStorage.getItem('krishi_farmer') || 'null')
    : role === 'agency'
    ? JSON.parse(localStorage.getItem('krishi_agency') || 'null')
    : role === 'officer'
    ? JSON.parse(localStorage.getItem('krishi_officer') || 'null')
    : null

  function signOut() {
    const tokenKey = role === 'farmer' ? 'krishi_farmer_token' : role === 'agency' ? 'krishi_agency_token' : 'krishi_officer_token'
    localStorage.removeItem(tokenKey)
    localStorage.removeItem('krishi_active_role')
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-navy/20">
      <TopBar />
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between min-h-[5.5rem] py-3 gap-5">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="w-12 h-12 border border-navy/20 bg-navy flex items-center justify-center shrink-0">
              <Wheat size={18} className="text-gold" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block font-serif font-semibold text-navy text-lg">
                Department of Agriculture
              </span>
              <span className="block text-sm text-ink/65">{t('appName')} &middot; {t('tagline')}</span>
            </span>
          </NavLink>

          <nav className="hidden md:flex items-center" aria-label="Primary">
            {role && <><NavLink to="/" end className={navLinkClass}>{t('nav_home')}</NavLink><NavLink to="/agencies" className={navLinkClass}>{t('nav_agencies')}</NavLink><NavLink to="/centers" className={navLinkClass}>{t('nav_centers')}</NavLink></>}
            {role === 'farmer' && <><NavLink to="/grievance" className={navLinkClass}>{t('nav_grievance')}</NavLink><NavLink to="/farmer-profile" className={navLinkClass}>My profile</NavLink></>}
            {role === 'agency' && <NavLink to="/agency-portal" className={navLinkClass}>Agency profile</NavLink>}
            {role === 'officer' && <><NavLink to="/dashboard" className={navLinkClass}>Manage issues</NavLink><NavLink to="/officer-agencies" className={navLinkClass}>Government agencies</NavLink></>}
          </nav>

          {role ? <button onClick={signOut} className="hidden sm:inline-flex items-center gap-1.5 rounded bg-navy text-white text-sm font-medium px-4 py-2 hover:bg-navy-light"><LogOut size={15} /> {account?.name || 'Sign out'}</button> : <NavLink to="/login" className="hidden sm:inline-flex items-center rounded bg-navy text-white text-sm font-medium px-4 py-2 hover:bg-navy-light">Login</NavLink>}
        </div>
      </div>
    </header>
  )
}
