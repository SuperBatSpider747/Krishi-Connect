// Replace this file with real API calls (state mandi board / e-NAM / agency
// registration data) once a backend exists. Shapes are kept deliberately
// flat and simple so swapping the data source doesn't require touching the
// page components.

export const CROPS = ['Wheat', 'Paddy', 'Maize', 'Soybean', 'Cotton', 'Mustard']

export const REGIONS = ['Ludhiana', 'Bhopal', 'Nashik', 'Karnal', 'Guntur']

export const AGENCIES = [
  {
    id: 'AG-101',
    name: 'Punjab State Warehousing Corporation',
    region: 'Ludhiana',
    crops: ['Wheat', 'Paddy'],
    rating: 4.3,
    capacityTonnes: 400,
    bookedTonnes: 260,
    address: 'Grain Market Road, Ludhiana',
  },
  {
    id: 'AG-102',
    name: 'Madhya Pradesh State Civil Supplies Corp.',
    region: 'Bhopal',
    crops: ['Wheat', 'Soybean'],
    rating: 3.9,
    capacityTonnes: 300,
    bookedTonnes: 295,
    address: 'Mandi Yard, Bhopal',
  },
  {
    id: 'AG-103',
    name: 'Maharashtra State Cooperative Marketing Federation',
    region: 'Nashik',
    crops: ['Maize', 'Cotton'],
    rating: 4.6,
    capacityTonnes: 250,
    bookedTonnes: 90,
    address: 'APMC Yard, Nashik',
  },
  {
    id: 'AG-104',
    name: 'Haryana State Agricultural Marketing Board',
    region: 'Karnal',
    crops: ['Wheat', 'Mustard'],
    rating: 4.1,
    capacityTonnes: 350,
    bookedTonnes: 180,
    address: 'New Grain Market, Karnal',
  },
  {
    id: 'AG-105',
    name: 'Andhra Pradesh State Civil Supplies Corp.',
    region: 'Guntur',
    crops: ['Paddy', 'Cotton'],
    rating: 4.0,
    capacityTonnes: 320,
    bookedTonnes: 310,
    address: 'Cotton Market Yard, Guntur',
  },
]

export function slotsForAgency(agencyId) {
  // Deterministic mock slots (each slot = 20 tonnes of capacity)
  const base = [
    { time: '7:00 AM \u2013 9:00 AM', capacity: 20 },
    { time: '9:00 AM \u2013 11:00 AM', capacity: 20 },
    { time: '11:00 AM \u2013 1:00 PM', capacity: 20 },
    { time: '2:00 PM \u2013 4:00 PM', capacity: 20 },
    { time: '4:00 PM \u2013 6:00 PM', capacity: 20 },
  ]
  // vary "booked" amount per agency deterministically so the UI isn't static
  const seed = agencyId.charCodeAt(agencyId.length - 1)
  return base.map((s, i) => ({
    id: `${agencyId}-S${i + 1}`,
    ...s,
    booked: Math.min(s.capacity, ((seed + i * 7) % 22)),
  }))
}

export const PROCUREMENT_CENTERS = AGENCIES.map((a) => {
  const pctFull = a.bookedTonnes / a.capacityTonnes
  const flag = pctFull >= 0.95 ? 'full' : pctFull >= 0.7 ? 'filling' : 'open'
  return {
    id: a.id,
    name: a.name,
    region: a.region,
    rating: a.rating,
    flag,
    seatsFree: Math.max(0, Math.round((a.capacityTonnes - a.bookedTonnes) / 20)),
  }
})

export const GRIEVANCE_CATEGORIES = [
  'Delayed weighing / quality check',
  'Payment not received',
  'Quality rejected unfairly',
  'No shelter / basic facilities',
  'Slot booking technical issue',
  'Other',
]
