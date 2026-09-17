import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileCheck, ImagePlus, Mail, RefreshCw, Wheat } from 'lucide-react'
import { apiFetch } from '../lib/api'

export default function FarmerLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', email: '', aadhaarNumber: '', panNumber: '', captchaId: '', captchaAnswer: '' })
  const [loginMode, setLoginMode] = useState(false)
  const [loginMethod, setLoginMethod] = useState('aadhaar') // 'aadhaar' | 'otp' | 'email'
  const [captcha, setCaptcha] = useState(null)
  const [files, setFiles] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [otpPhone, setOtpPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpInfo, setOtpInfo] = useState('')

  const [emailAddr, setEmailAddr] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailInfo, setEmailInfo] = useState('')

  async function loadCaptcha() {
    const next = await apiFetch('/farmer/captcha')
    setCaptcha(next)
    setForm((current) => ({ ...current, captchaId: next.id, captchaAnswer: '' }))
  }

  useEffect(() => { loadCaptcha().catch(() => setError('Could not load captcha. Please refresh.')) }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (loginMode) {
        const result = await apiFetch('/farmer/login', { method: 'POST', body: JSON.stringify({ phone: form.phone, aadhaarNumber: form.aadhaarNumber }) })
        localStorage.setItem('krishi_farmer_token', result.token)
        localStorage.setItem('krishi_farmer', JSON.stringify(result.farmer))
        localStorage.setItem('krishi_active_role', 'farmer')
        sessionStorage.setItem('krishiconnect_verified', 'true')
        navigate(location.state?.from || '/farmer-profile')
        return
      }
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => body.append(key, value))
      if (files.profilePhoto) body.append('profilePhoto', files.profilePhoto)
      if (files.aadhaarDocument) body.append('aadhaarDocument', files.aadhaarDocument)
      if (files.panDocument) body.append('panDocument', files.panDocument)
      const result = await apiFetch('/farmer/register', { method: 'POST', body })
      localStorage.setItem('krishi_farmer_token', result.token)
      localStorage.setItem('krishi_farmer', JSON.stringify(result.farmer))
      localStorage.setItem('krishi_active_role', 'farmer')
      sessionStorage.setItem('krishiconnect_verified', 'true')
      navigate(location.state?.from || '/farmer-profile')
    } catch (err) {
      setError(err.message)
      loadCaptcha().catch(() => {})
    } finally {
      setLoading(false)
    }
  }

  async function requestOtp() {
    setOtpError('')
    setOtpInfo('')
    if (!/^\d{10}$/.test(otpPhone)) {
      setOtpError('Enter a valid 10-digit registered mobile number.')
      return
    }
    setOtpLoading(true)
    try {
      await apiFetch('/otp/request', { method: 'POST', body: JSON.stringify({ phone: otpPhone }) })
      setOtpSent(true)
      setOtpInfo('OTP sent to your registered mobile number. It is valid for 5 minutes.')
    } catch (err) {
      setOtpError(err.message)
    } finally {
      setOtpLoading(false)
    }
  }

  async function verifyOtp(event) {
    event.preventDefault()
    setOtpError('')
    setOtpLoading(true)
    try {
      const result = await apiFetch('/otp/verify', { method: 'POST', body: JSON.stringify({ phone: otpPhone, otp: otpCode }) })
      if (!result.token) {
        setOtpError('Mobile number verified, but no farmer profile exists for it yet. Please create one.')
        setLoginMode(false)
        return
      }
      localStorage.setItem('krishi_farmer_token', result.token)
      localStorage.setItem('krishi_farmer', JSON.stringify(result.farmer))
      localStorage.setItem('krishi_active_role', 'farmer')
      sessionStorage.setItem('krishiconnect_verified', 'true')
      navigate(location.state?.from || '/farmer-profile')
    } catch (err) {
      setOtpError(err.message)
    } finally {
      setOtpLoading(false)
    }
  }

  async function requestEmailOtp() {
    setEmailError('')
    setEmailInfo('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddr)) {
      setEmailError('Enter a valid email address.')
      return
    }
    setEmailLoading(true)
    try {
      await apiFetch('/email-otp/request', { method: 'POST', body: JSON.stringify({ email: emailAddr }) })
      setEmailSent(true)
      setEmailInfo('A login code was sent to your email. It is valid for 5 minutes.')
    } catch (err) {
      setEmailError(err.message)
    } finally {
      setEmailLoading(false)
    }
  }

  async function verifyEmailOtp(event) {
    event.preventDefault()
    setEmailError('')
    setEmailLoading(true)
    try {
      const result = await apiFetch('/email-otp/verify', { method: 'POST', body: JSON.stringify({ email: emailAddr, otp: emailCode }) })
      if (!result.token) {
        setEmailError('Email verified, but no farmer profile exists for it yet. Please create one.')
        setLoginMode(false)
        return
      }
      localStorage.setItem('krishi_farmer_token', result.token)
      localStorage.setItem('krishi_farmer', JSON.stringify(result.farmer))
      localStorage.setItem('krishi_active_role', 'farmer')
      sessionStorage.setItem('krishiconnect_verified', 'true')
      navigate(location.state?.from || '/farmer-profile')
    } catch (err) {
      setEmailError(err.message)
    } finally {
      setEmailLoading(false)
    }
  }

  const fileLabel = (key) => files[key]?.name || 'Choose file'

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="gov-card p-6 sm:p-8">
        <div className="flex items-start gap-3 border-b border-navy/10 pb-5">
          <span className="w-11 h-11 bg-navy flex items-center justify-center shrink-0"><Wheat size={22} className="text-gold" aria-hidden="true" /></span>
          <div><p className="text-xs uppercase tracking-wider text-field font-semibold">Farmer services</p><h1 className="font-serif text-2xl font-semibold text-navy">{loginMode ? 'Farmer login' : 'Create farmer profile'}</h1><p className="mt-1 text-sm text-ink/65">{loginMode ? 'Use your phone and Aadhaar number to open your account.' : 'Register once to access procurement services and your booking records.'}</p></div>
        </div>
        {loginMode && (
          <div className="mt-6 inline-flex rounded border border-navy/20 overflow-hidden text-sm">
            <button type="button" onClick={() => { setLoginMethod('aadhaar'); setOtpError(''); setOtpInfo('') }} className={`px-4 py-2 font-medium ${loginMethod === 'aadhaar' ? 'bg-navy text-white' : 'bg-white text-navy'}`}>Phone + Aadhaar</button>
            <button type="button" onClick={() => { setLoginMethod('otp'); setError('') }} className={`px-4 py-2 font-medium border-l border-navy/20 ${loginMethod === 'otp' ? 'bg-navy text-white' : 'bg-white text-navy'}`}>OTP on registered mobile</button>
            <button type="button" onClick={() => { setLoginMethod('email'); setError('') }} className={`px-4 py-2 font-medium border-l border-navy/20 ${loginMethod === 'email' ? 'bg-navy text-white' : 'bg-white text-navy'}`}>Email / Gmail</button>
          </div>
        )}

        {loginMode && loginMethod === 'otp' ? (
          <form onSubmit={verifyOtp} className="mt-6 space-y-5">
            <label className="block text-sm">
              <span className="font-medium">Registered mobile number</span>
              <div className="mt-1 flex gap-2">
                <input required pattern="[0-9]{10}" inputMode="numeric" maxLength="10" disabled={otpSent} value={otpPhone} onChange={(e) => setOtpPhone(e.target.value)} className="flex-1 border border-navy/20 rounded px-3 py-2 disabled:bg-paper" />
                <button type="button" onClick={requestOtp} disabled={otpLoading || otpSent} className="shrink-0 rounded bg-navy text-white font-medium px-4 py-2 disabled:opacity-60">{otpSent ? 'OTP sent' : otpLoading ? 'Sending...' : 'Send OTP'}</button>
              </div>
              <small className="text-ink/50">We'll text a one-time code to this number if it's valid.</small>
            </label>
            {otpSent && (
              <label className="block text-sm">
                <span className="font-medium">Enter OTP</span>
                <input required inputMode="numeric" maxLength="6" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" />
                <button type="button" onClick={requestOtp} disabled={otpLoading} className="mt-1 text-xs text-navy underline">Resend OTP</button>
              </label>
            )}
            {otpInfo && <p className="text-sm text-success bg-success/10 border border-success/20 rounded px-3 py-2">{otpInfo}</p>}
            {otpError && <p role="alert" className="text-sm text-danger bg-danger/10 border border-danger/20 rounded px-3 py-2">{otpError}</p>}
            <button disabled={otpLoading || !otpSent} className="inline-flex items-center gap-2 rounded bg-navy text-white font-medium px-6 py-3 disabled:opacity-60"><FileCheck size={17} aria-hidden="true" />{otpLoading ? 'Please wait...' : 'Verify OTP & sign in'}</button>
          </form>
        ) : loginMode && loginMethod === 'email' ? (
          <form onSubmit={verifyEmailOtp} className="mt-6 space-y-5">
            <label className="block text-sm">
              <span className="font-medium">Registered email address</span>
              <div className="mt-1 flex gap-2">
                <input required type="email" disabled={emailSent} value={emailAddr} onChange={(e) => setEmailAddr(e.target.value)} placeholder="you@gmail.com" className="flex-1 border border-navy/20 rounded px-3 py-2 disabled:bg-paper" />
                <button type="button" onClick={requestEmailOtp} disabled={emailLoading || emailSent} className="shrink-0 rounded bg-navy text-white font-medium px-4 py-2 disabled:opacity-60">{emailSent ? 'Code sent' : emailLoading ? 'Sending...' : 'Send code'}</button>
              </div>
              <small className="text-ink/50">We'll email a one-time code to this address if it's valid.</small>
            </label>
            {emailSent && (
              <label className="block text-sm">
                <span className="font-medium">Enter code</span>
                <input required inputMode="numeric" maxLength="6" value={emailCode} onChange={(e) => setEmailCode(e.target.value)} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" />
                <button type="button" onClick={requestEmailOtp} disabled={emailLoading} className="mt-1 text-xs text-navy underline">Resend code</button>
              </label>
            )}
            {emailInfo && <p className="text-sm text-success bg-success/10 border border-success/20 rounded px-3 py-2">{emailInfo}</p>}
            {emailError && <p role="alert" className="text-sm text-danger bg-danger/10 border border-danger/20 rounded px-3 py-2">{emailError}</p>}
            <button disabled={emailLoading || !emailSent} className="inline-flex items-center gap-2 rounded bg-navy text-white font-medium px-6 py-3 disabled:opacity-60"><Mail size={17} aria-hidden="true" />{emailLoading ? 'Please wait...' : 'Verify code & sign in'}</button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {!loginMode && <label className="block text-sm"><span className="font-medium">Full name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /></label>}
            <label className="block text-sm"><span className="font-medium">Mobile number</span><input required pattern="[0-9]{10}" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /><small className="text-ink/50">Used to identify your account</small></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm"><span className="font-medium">Email address <small className="text-ink/50">(optional)</small></span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@gmail.com" className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /><small className="text-ink/50">We'll email you when your issues are resolved or bookings approved</small></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm"><span className="font-medium">Aadhaar number <b className="text-danger">*</b></span><input required pattern="[0-9]{12}" inputMode="numeric" maxLength="12" value={form.aadhaarNumber} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} className="mt-1 w-full border border-navy/20 rounded px-3 py-2" /><small className="text-ink/50">12 digits required</small></label>
            <label className="block text-sm"><span className="font-medium">PAN number <b className="text-danger">*</b></span><input required pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" maxLength="10" value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })} className="mt-1 w-full border border-navy/20 rounded px-3 py-2 uppercase" /><small className="text-ink/50">Example: ABCDE1234F</small></label>
          </div>
          {!loginMode && <div className="grid sm:grid-cols-3 gap-4">
            {[
              ['profilePhoto', 'Profile photo', 'image/*'],
              ['aadhaarDocument', 'Aadhaar card', 'image/*,.pdf'],
              ['panDocument', 'PAN card', 'image/*,.pdf'],
            ].map(([key, label, accept]) => <label key={key} className="block text-sm"><span className="font-medium">{label}{key !== 'profilePhoto' && <small className="text-ink/50"> (optional)</small>}</span><span className="mt-1 flex items-center gap-2 border border-dashed border-navy/25 rounded px-3 py-3 cursor-pointer text-navy"><ImagePlus size={17} aria-hidden="true" /><span className="truncate text-xs">{fileLabel(key)}</span><input required={key === 'profilePhoto'} type="file" accept={accept} onChange={(e) => setFiles({ ...files, [key]: e.target.files?.[0] })} className="sr-only" /></span><small className="text-ink/45">Max 2 MB</small></label>)}
          </div>}
          {!loginMode && <div className="border border-navy/10 bg-paper p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-ink/55">Security check</p><p className="font-medium text-navy">{captcha?.question || 'Loading...'}</p></div><button type="button" onClick={() => loadCaptcha()} className="text-navy" aria-label="Refresh captcha"><RefreshCw size={18} /></button></div><input required inputMode="numeric" placeholder="Enter answer" value={form.captchaAnswer} onChange={(e) => setForm({ ...form, captchaAnswer: e.target.value })} className="mt-3 w-full border border-navy/20 rounded px-3 py-2" /></div>}
          {error && <p role="alert" className="text-sm text-danger bg-danger/10 border border-danger/20 rounded px-3 py-2">{error}</p>}
          <button disabled={loading} className="inline-flex items-center gap-2 rounded bg-navy text-white font-medium px-6 py-3 disabled:opacity-60"><FileCheck size={17} aria-hidden="true" />{loading ? 'Please wait...' : loginMode ? 'Sign in' : 'Create farmer profile'}</button>
        </form>
        )}
      </div>
      <button type="button" onClick={() => setLoginMode(!loginMode)} className="mt-4 text-sm text-navy underline">{loginMode ? 'New farmer? Create an account' : 'Already have an account? Sign in'}</button>
    </div>
  )
}
