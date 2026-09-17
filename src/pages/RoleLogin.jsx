import { Link, useNavigate } from 'react-router-dom'
import { Building2, ShieldCheck, UserRound } from 'lucide-react'

const roles = [
  { title: 'Farmer login', detail: 'Create or open your farmer profile', to: '/farmer-login', icon: UserRound },
  { title: 'Officer login', detail: 'Manage government procurement services', to: '/officer-login', icon: ShieldCheck },
  { title: 'Private agency login', detail: 'Manage your company listing and timings', to: '/agency-login', icon: Building2 },
]

export default function RoleLogin() {
  const navigate = useNavigate()
  const active = [
    localStorage.getItem('krishi_farmer_token') && { name: 'Farmer account', to: '/farmer-profile' },
    localStorage.getItem('krishi_officer_token') && { name: 'Officer account', to: '/dashboard' },
    localStorage.getItem('krishi_agency_token') && { name: 'Private agency account', to: '/agency-portal' },
  ].filter(Boolean)
  return <div className="max-w-4xl mx-auto px-4 py-12"><p className="text-xs uppercase tracking-wider text-field font-semibold">Secure services</p><h1 className="font-serif text-3xl font-semibold text-navy mt-1">Choose your login</h1><p className="mt-2 text-ink/65">Use the service that matches your role in the procurement network.</p>{active.length > 0 && <div className="mt-5 border border-success/30 bg-success/5 rounded p-4"><p className="text-sm font-medium text-success">You are already signed in</p><div className="mt-2 flex flex-wrap gap-3">{active.map((account) => <button key={account.to} onClick={() => navigate(account.to)} className="text-sm text-navy underline">Open {account.name}</button>)}</div></div>}<div className="mt-8 grid md:grid-cols-3 gap-4">{roles.map(({ title, detail, to, icon: Icon }) => <Link key={to} to={to} className="gov-card p-5 hover:border-navy/40"><Icon className="text-field" size={24} aria-hidden="true" /><h2 className="font-medium text-navy mt-5">{title}</h2><p className="text-sm text-ink/60 mt-2">{detail}</p><span className="inline-block mt-6 text-sm text-navy underline">Continue</span></Link>)}</div></div>
}
