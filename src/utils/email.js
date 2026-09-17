// Real email delivery via Resend's HTTP API (free tier, no credit card).
//
// Why not Gmail SMTP: most free-tier hosts (Render included) block outbound
// SMTP connections (ports 25/465/587) to stop spam abuse, so nodemailer
// times out there even with correct credentials. Resend's API runs over
// plain HTTPS, which isn't blocked, so it works on Render's free plan.
//
// Setup (one-time, ~2 minutes, free):
//   1. Sign up at resend.com (no credit card required).
//   2. Dashboard -> API Keys -> Create API Key. Copy it.
//   3. Set one environment variable wherever the server runs (Render ->
//      your service -> Environment tab; locally -> a .env file):
//        RESEND_API_KEY = the key from step 2
//
// Until that variable is set, sendEmail() falls back to logging the
// message to the console instead of failing, so the rest of the app keeps
// working during development.
//
// Note: without your own verified sending domain, emails go out "from"
// onboarding@resend.dev -- Resend allows this test address to send to any
// recipient, no domain verification needed. Once you're ready to send under
// your own name/domain, verify a domain in the Resend dashboard and change
// FROM_ADDRESS below.

const FROM_ADDRESS = 'Krishi Connect <onboarding@resend.dev>'

let warnedMissingConfig = false

export async function sendEmail(to, subject, message) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (!warnedMissingConfig) {
      console.warn('[email] RESEND_API_KEY not set -- emails will be logged, not sent. See src/utils/email.js for setup steps.')
      warnedMissingConfig = true
    }
    console.info(`[Email mock] to ${to} | ${subject}: ${message}`)
    return { success: true, mocked: true, to, subject, sentAt: new Date().toISOString() }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      text: message,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Resend API error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  return { success: true, mocked: false, to, subject, id: data.id, sentAt: new Date().toISOString() }
}
