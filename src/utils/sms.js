// SMS-only notification helper. WhatsApp is handled by a separate chatbot,
// so this file deliberately does not touch WhatsApp.
//
// For production, replace sendSms's body with a call to an Indian SMS
// gateway (MSG91 or Gupshup recommended over Twilio for domestic delivery
// rates and DLT template compliance). Keep the function signature the same
// so callers across the app don't need to change.
//
// Example (MSG91):
//   await fetch('https://api.msg91.com/api/v5/flow/', {
//     method: 'POST',
//     headers: { authkey: import.meta.env.VITE_MSG91_KEY, 'Content-Type': 'application/json' },
//     body: JSON.stringify({ template_id, mobiles: phone, VAR1: message }),
//   })

export async function sendSms(phone, message) {
  // Simulated network delay so calling UI can show a "sending..." state.
  await new Promise((resolve) => setTimeout(resolve, 400))
  console.info(`[SMS mock] to ${phone}: ${message}`)
  return { success: true, phone, message, sentAt: new Date().toISOString() }
}
