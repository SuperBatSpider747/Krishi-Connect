import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Verify from './pages/Verify'
import Agencies from './pages/Agencies'
import AgencyDetail from './pages/AgencyDetail'
import BookingConfirmation from './pages/BookingConfirmation'
import ProcurementCenters from './pages/ProcurementCenters'
import Grievance from './pages/Grievance'
import Dashboard from './pages/Dashboard'
import OfficerLogin from './pages/OfficerLogin'
import FarmerLogin from './pages/FarmerLogin'
import FarmerProfile from './pages/FarmerProfile'
import RoleLogin from './pages/RoleLogin'
import AgencyLogin from './pages/AgencyLogin'
import AgencyPortal from './pages/AgencyPortal'
import OfficerAgencies from './pages/OfficerAgencies'
import { useLanguage } from './i18n/LanguageContext'

export default function App() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-white focus:px-3 focus:py-2 focus:rounded focus:border focus:border-navy z-50"
      >
        {t('skip_to_content')}
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/agencies/:id" element={<AgencyDetail />} />
          <Route path="/confirmation" element={<BookingConfirmation />} />
          <Route path="/centers" element={<ProcurementCenters />} />
          <Route path="/grievance" element={<Grievance />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/officer-login" element={<OfficerLogin />} />
          <Route path="/login" element={<RoleLogin />} />
          <Route path="/agency-login" element={<AgencyLogin />} />
          <Route path="/agency-portal" element={<AgencyPortal />} />
          <Route path="/officer-agencies" element={<OfficerAgencies />} />
          <Route path="/farmer-login" element={<FarmerLogin />} />
          <Route path="/farmer-profile" element={<FarmerProfile />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
