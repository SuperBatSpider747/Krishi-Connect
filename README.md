# Krishi Connect — Farmer Procurement Portal (frontend scaffold)

A formal, government-portal-styled React app for the farmer → agency →
procurement-slot booking flow. Built to be assembled on top of a real
backend — every place that needs a live integration is called out below.

## Run it

```bash
npm install
npm run dev
```

Requires Node 18+. Nothing here needs a backend to demo — all data is
mocked in `src/data/mockData.js` so you can click through the whole flow
immediately.

## Pages (in `src/pages/`)

| Route | Page | What it does |
|---|---|---|
| `/` | Home | Landing page, live stats, how-it-works |
| `/verify` | Verify | Aadhaar/PAN entry or DigiLocker link (mocked) |
| `/agencies` | Agencies | List of agencies, filter by region + crop, "recommend best match" |
| `/agencies/:id` | AgencyDetail | Agency info + tonnage-based slot picker + booking form |
| `/confirmation` | BookingConfirmation | Token, QR code, triggers the mock SMS |
| `/centers` | ProcurementCenters | Ratings + color-coded capacity flags |
| `/grievance` | Grievance | Farmer issue reporting + status tracking |
| `/dashboard` | Dashboard | Officer/agency-side: verify tokens, mark fulfilled/rejected, see open issues |

## What's real vs. mocked

**Real and reusable as-is:**
- All UI, layout, routing, design tokens (`tailwind.config.js`)
- The multilingual system (`src/i18n/`) — English and Hindi are fully
  translated; every page reads strings through `t()`, so adding a language
  is just adding a new key block to `src/i18n/translations.js`
- Tonnage-based (not seat-based) slot capacity logic in `mockData.js` /
  `AgencyDetail.jsx`
- Color-coded capacity flag logic (`StatusFlag.jsx`, computed in `mockData.js`)

**Mocked — wire these up next:**
1. **Identity verification** (`src/pages/Verify.jsx`) — currently just sets
   a session flag. Replace with:
   - DigiLocker Partner API OAuth flow for the "link with DigiLocker" path
   - UIDAI Aadhaar OTP / NSDL PAN verification API for the manual path
   - Note: real DigiLocker/UIDAI production access requires approval you
     won't get during a hackathon — use their public sandbox credentials
     and say so plainly in your pitch.
2. **Agency & slot data** (`src/data/mockData.js`) — replace with real
   agency registration data and a proper bookings table (Postgres
   recommended). Use a counter/lock (Redis works well) per slot so two
   farmers can't book the same tonnage concurrently.
3. **SMS** (`src/utils/sms.js`) — currently `console.log`s instead of
   sending. Swap in MSG91 or Gupshup (better domestic delivery + DLT
   template compliance than Twilio for Indian numbers). WhatsApp is
   intentionally untouched here since that's a separate chatbot.
4. **Officer dashboard** (`src/pages/Dashboard.jsx`) — needs real auth
   (officer login, scoped to their assigned agency) and should read/write
   the same bookings table as the farmer-facing pages.
5. **Grievance tracking** (`src/pages/Grievance.jsx`) — status is only
   held in memory; persist it and surface open issues to the matching
   agency's dashboard.

## Extending translations

Bhashini / AI4Bharat's API can be plugged in for two things beyond the
static UI strings already translated here:
- Voice input/output for low-literacy users
- On-the-fly translation of agency names, grievance text, and officer
  notes (content that can't be pre-translated because it's user-generated)

## Design notes

Colors, type and spacing are defined once in `tailwind.config.js` — navy
(`#14274E`) for trust/primary actions, harvest gold (`#C98A2C`) as the one
accent color, field green (`#2F5233`) as secondary. Noto Serif/Noto Sans
were chosen specifically because they render Devanagari (and other Indic
scripts) correctly, which matters more here than a trendier typeface pair.
