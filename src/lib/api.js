const API_BASE = '/api'

export async function apiFetch(path, options = {}) {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('krishi_active_role') === 'farmer' ? localStorage.getItem('krishi_farmer_token') : localStorage.getItem('krishi_active_role') === 'agency' ? localStorage.getItem('krishi_agency_token') : localStorage.getItem('krishi_officer_token'))
    : null
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message || 'Request failed'
    throw new Error(message)
  }

  return payload
}
