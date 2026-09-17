import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import sqlite3 from 'sqlite3'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { sendSms } from './src/utils/sms.js'
import { sendEmail } from './src/utils/email.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.join(__dirname, 'dist')
const frontendExists = fs.existsSync(path.join(distPath, 'index.html'))
const dataDir = path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })

const app = express()
const PORT = process.env.PORT || 4001
const db = new sqlite3.Database(path.join(dataDir, 'krishi.db'))
const officerSessions = new Map()
const farmerSessions = new Map()
const agencySessions = new Map()
const captchaChallenges = new Map()
const otpChallenges = new Map() // phone -> { code, expiresAt }
const emailOtpChallenges = new Map() // email -> { code, expiresAt, attempts }
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
const seedOfficer = { id: 'OFF-001', name: 'Asha Verma', username: 'officer', password: 'krishi123', region: 'All regions' }
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

app.use(cors())
app.use(express.json())

const seedAgencies = [
  {
    id: 'AG-101',
    name: 'Punjab State Warehousing Corporation',
    region: 'Ludhiana',
    crops: JSON.stringify(['Wheat', 'Paddy']),
    rating: 4.3,
    capacityTonnes: 400,
    bookedTonnes: 260,
    address: 'Grain Market Road, Ludhiana',
  },
  {
    id: 'AG-102',
    name: 'Madhya Pradesh State Civil Supplies Corp.',
    region: 'Bhopal',
    crops: JSON.stringify(['Wheat', 'Soybean']),
    rating: 3.9,
    capacityTonnes: 300,
    bookedTonnes: 295,
    address: 'Mandi Yard, Bhopal',
  },
  {
    id: 'AG-103',
    name: 'Maharashtra State Cooperative Marketing Federation',
    region: 'Nashik',
    crops: JSON.stringify(['Maize', 'Cotton']),
    rating: 4.6,
    capacityTonnes: 250,
    bookedTonnes: 90,
    address: 'APMC Yard, Nashik',
  },
  {
    id: 'AG-104',
    name: 'Haryana State Agricultural Marketing Board',
    region: 'Karnal',
    crops: JSON.stringify(['Wheat', 'Mustard']),
    rating: 4.1,
    capacityTonnes: 350,
    bookedTonnes: 180,
    address: 'New Grain Market, Karnal',
  },
  {
    id: 'AG-105',
    name: 'Andhra Pradesh State Civil Supplies Corp.',
    region: 'Guntur',
    crops: JSON.stringify(['Paddy', 'Cotton']),
    rating: 4.0,
    capacityTonnes: 320,
    bookedTonnes: 310,
    address: 'Cotton Market Yard, Guntur',
  },
]

const seedBookings = [
  { token: 'TKN-101-4821', agencyId: 'AG-101', farmer: 'Ram Singh', crop: 'Wheat', quantity: 42, vehicle: 'Tractor-trolley', slot: '9:00 AM – 11:00 AM', status: 'pending' },
  { token: 'TKN-101-3390', agencyId: 'AG-101', farmer: 'Suresh Yadav', crop: 'Paddy', quantity: 18, vehicle: 'Pickup truck', slot: '9:00 AM – 11:00 AM', status: 'pending' },
  { token: 'TKN-101-2207', agencyId: 'AG-101', farmer: 'Geeta Devi', crop: 'Wheat', quantity: 55, vehicle: 'Heavy truck', slot: '11:00 AM – 1:00 PM', status: 'fulfilled' },
]

const seedGrievances = [
  { id: 'GRV-2291', center: 'Punjab State Warehousing Corporation', category: 'Waiting / verification delay', status: 'open', reporterType: 'farmer', farmer: 'Ram Singh', description: 'Waiting for verification at the center.' },
  { id: 'GRV-2204', center: 'Haryana State Agricultural Marketing Board', category: 'Payment not received', status: 'resolved', reporterType: 'farmer', farmer: 'Pawan Kumar', description: 'Payment was delayed.' },
  { id: 'CTR-1042', center: 'Madhya Pradesh State Civil Supplies Corp.', category: 'Center closure notice', status: 'open', reporterType: 'center', farmer: 'Center operator', description: 'Center closed for maintenance.', affectedFrom: '2:00 PM', affectedUntil: '4:00 PM' },
]

const runDb = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err)
      resolve({ id: this.lastID, changes: this.changes })
    })
  })

const getDb = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row)
    })
  })

const allDb = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })

const serializeAgency = (agency) => {
  const crops = typeof agency.crops === 'string' ? JSON.parse(agency.crops || '[]') : agency.crops || []
  const freeTonnes = Math.max(0, Number(agency.capacityTonnes) - Number(agency.bookedTonnes))
  const pctFull = Number(agency.capacityTonnes) ? Math.min(1, Number(agency.bookedTonnes) / Number(agency.capacityTonnes)) : 0
  const flag = pctFull >= 0.95 ? 'full' : pctFull >= 0.7 ? 'filling' : 'open'

  return {
    id: agency.id,
    name: agency.name,
    region: agency.region,
    crops,
    rating: Number(agency.rating),
    capacityTonnes: Number(agency.capacityTonnes),
    bookedTonnes: Number(agency.bookedTonnes),
    address: agency.address,
    agencyType: agency.agencyType || 'government',
    active: Number(agency.active ?? 1) === 1,
    removedAt: agency.removedAt || null,
    removedBy: agency.removedBy || null,
    removedByType: agency.removedByType || null,
    venue: agency.venue || agency.address,
    timings: agency.timings || '7:00 AM – 6:00 PM',
    freeTonnes,
    flag,
    seatsFree: Math.max(0, Math.round(freeTonnes / 20)),
  }
}

const serializeBooking = (booking) => {
  let crops = []
  try {
    crops = booking.agencyCrops ? JSON.parse(booking.agencyCrops) : []
  } catch {
    crops = []
  }

  return {
    ...booking,
    agencyName: booking.agencyName || booking.agencyId,
    crop: booking.crop || crops[0] || 'Not specified',
    quantity: Number(booking.quantity),
  }
}

const seedDatabase = async () => {
  db.serialize(async () => {
    db.run(`CREATE TABLE IF NOT EXISTS agencies (
      id TEXT PRIMARY KEY,
      name TEXT,
      region TEXT,
      crops TEXT,
      rating REAL,
      capacityTonnes INTEGER,
      bookedTonnes INTEGER,
      address TEXT,
      agencyType TEXT DEFAULT 'government',
      username TEXT UNIQUE,
      password TEXT,
      venue TEXT,
      timings TEXT,
      active INTEGER DEFAULT 1,
      removedAt TEXT,
      removedBy TEXT,
      removedByType TEXT
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS agency_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agencyId TEXT,
      agencyName TEXT,
      changedBy TEXT,
      changes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewerType TEXT,
      reviewerId TEXT,
      subjectType TEXT,
      subjectId TEXT,
      rating INTEGER,
      comment TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(reviewerType, reviewerId, subjectType, subjectId)
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      token TEXT PRIMARY KEY,
      agencyId TEXT,
      farmer TEXT,
      phone TEXT,
      crop TEXT,
      quantity REAL,
      vehicle TEXT,
      slot TEXT,
      status TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS agency_slots (
      id TEXT PRIMARY KEY,
      agencyId TEXT NOT NULL,
      time TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 20,
      booked INTEGER NOT NULL DEFAULT 0
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS grievances (
      id TEXT PRIMARY KEY,
      center TEXT,
      category TEXT,
      status TEXT,
      farmer TEXT,
      phone TEXT,
      description TEXT,
      reporterType TEXT DEFAULT 'farmer',
      affectedFrom TEXT,
      affectedUntil TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS officers (
      id TEXT PRIMARY KEY,
      name TEXT,
      username TEXT UNIQUE,
      password TEXT,
      region TEXT
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS farmers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      aadhaarNumber TEXT NOT NULL,
      panNumber TEXT NOT NULL,
      profilePhoto TEXT,
      aadhaarDocument TEXT,
      panDocument TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS issue_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grievanceId TEXT,
      officerId TEXT,
      officerName TEXT,
      action TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`)

    const farmerColumns = await allDb('PRAGMA table_info(farmers)')
    if (!farmerColumns.some((column) => column.name === 'aadhaarNumber')) await runDb("ALTER TABLE farmers ADD COLUMN aadhaarNumber TEXT NOT NULL DEFAULT ''")
    if (!farmerColumns.some((column) => column.name === 'panNumber')) await runDb("ALTER TABLE farmers ADD COLUMN panNumber TEXT NOT NULL DEFAULT ''")
    if (!farmerColumns.some((column) => column.name === 'email')) await runDb("ALTER TABLE farmers ADD COLUMN email TEXT DEFAULT ''")
    const agencyColumns = await allDb('PRAGMA table_info(agencies)')
    if (!agencyColumns.some((column) => column.name === 'agencyType')) await runDb("ALTER TABLE agencies ADD COLUMN agencyType TEXT NOT NULL DEFAULT 'government'")
    if (!agencyColumns.some((column) => column.name === 'username')) await runDb('ALTER TABLE agencies ADD COLUMN username TEXT')
    if (!agencyColumns.some((column) => column.name === 'password')) await runDb('ALTER TABLE agencies ADD COLUMN password TEXT')
    if (!agencyColumns.some((column) => column.name === 'venue')) await runDb('ALTER TABLE agencies ADD COLUMN venue TEXT')
    if (!agencyColumns.some((column) => column.name === 'timings')) await runDb('ALTER TABLE agencies ADD COLUMN timings TEXT')
    if (!agencyColumns.some((column) => column.name === 'active')) await runDb('ALTER TABLE agencies ADD COLUMN active INTEGER NOT NULL DEFAULT 1')
    if (!agencyColumns.some((column) => column.name === 'removedAt')) await runDb('ALTER TABLE agencies ADD COLUMN removedAt TEXT')
    if (!agencyColumns.some((column) => column.name === 'removedBy')) await runDb('ALTER TABLE agencies ADD COLUMN removedBy TEXT')
    if (!agencyColumns.some((column) => column.name === 'removedByType')) await runDb('ALTER TABLE agencies ADD COLUMN removedByType TEXT')

    const bookingColumns = await allDb('PRAGMA table_info(bookings)')
    if (!bookingColumns.some((column) => column.name === 'crop')) await runDb('ALTER TABLE bookings ADD COLUMN crop TEXT')
    if (!bookingColumns.some((column) => column.name === 'email')) await runDb("ALTER TABLE bookings ADD COLUMN email TEXT DEFAULT ''")
    const grievanceColumns = await allDb('PRAGMA table_info(grievances)')
    if (!grievanceColumns.some((column) => column.name === 'reporterType')) await runDb("ALTER TABLE grievances ADD COLUMN reporterType TEXT DEFAULT 'farmer'")
    if (!grievanceColumns.some((column) => column.name === 'affectedFrom')) await runDb('ALTER TABLE grievances ADD COLUMN affectedFrom TEXT')
    if (!grievanceColumns.some((column) => column.name === 'affectedUntil')) await runDb('ALTER TABLE grievances ADD COLUMN affectedUntil TEXT')
    if (!grievanceColumns.some((column) => column.name === 'email')) await runDb("ALTER TABLE grievances ADD COLUMN email TEXT DEFAULT ''")

    const agencyCount = await getDb('SELECT COUNT(*) AS count FROM agencies')
    if (!agencyCount || Number(agencyCount.count) === 0) {
      for (const agency of seedAgencies) {
        await runDb(
          'INSERT INTO agencies (id, name, region, crops, rating, capacityTonnes, bookedTonnes, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [agency.id, agency.name, agency.region, agency.crops, agency.rating, agency.capacityTonnes, agency.bookedTonnes, agency.address]
        )
      }
    }

    await runDb("UPDATE agencies SET agencyType = 'government', venue = COALESCE(NULLIF(venue, ''), address), timings = COALESCE(NULLIF(timings, ''), '7:00 AM – 6:00 PM') WHERE agencyType IS NULL OR agencyType = ''")

    const agenciesForSlots = await allDb('SELECT id FROM agencies')
    for (const agency of agenciesForSlots) {
      for (const [index, slot] of SLOT_TEMPLATES.entries()) {
        await runDb('INSERT OR IGNORE INTO agency_slots (id, agencyId, time, capacity, booked) VALUES (?, ?, ?, ?, 0)', [`${agency.id}-S${index + 1}`, agency.id, slot.time, slot.capacity])
      }
    }

    await runDb('INSERT OR IGNORE INTO officers (id, name, username, password, region) VALUES (?, ?, ?, ?, ?)', [seedOfficer.id, seedOfficer.name, seedOfficer.username, seedOfficer.password, seedOfficer.region])

    const bookingCount = await getDb('SELECT COUNT(*) AS count FROM bookings')
    if (!bookingCount || Number(bookingCount.count) === 0) {
      for (const booking of seedBookings) {
        await runDb(
          'INSERT INTO bookings (token, agencyId, farmer, phone, crop, quantity, vehicle, slot, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [booking.token, booking.agencyId, booking.farmer, '', booking.crop, booking.quantity, booking.vehicle, booking.slot, booking.status]
        )
      }
    }

    const grievanceCount = await getDb('SELECT COUNT(*) AS count FROM grievances')
    if (!grievanceCount || Number(grievanceCount.count) === 0) {
      for (const grievance of seedGrievances) {
        await runDb(
          'INSERT INTO grievances (id, center, category, status, farmer, phone, description, reporterType, affectedFrom, affectedUntil) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [grievance.id, grievance.center, grievance.category, grievance.status, grievance.farmer, '', grievance.description, grievance.reporterType, grievance.affectedFrom || '', grievance.affectedUntil || '']
        )
      }
    }

    const centerNoticeCount = await getDb("SELECT COUNT(*) AS count FROM grievances WHERE reporterType = 'center'")
    if (!centerNoticeCount || Number(centerNoticeCount.count) === 0) {
      const centerNotice = seedGrievances.find((grievance) => grievance.reporterType === 'center')
      await runDb(
        'INSERT OR IGNORE INTO grievances (id, center, category, status, farmer, phone, description, reporterType, affectedFrom, affectedUntil) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [centerNotice.id, centerNotice.center, centerNotice.category, centerNotice.status, centerNotice.farmer, '', centerNotice.description, centerNotice.reporterType, centerNotice.affectedFrom, centerNotice.affectedUntil]
      )
    }
  })
}

const dashboardHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Krishi Connect Admin</title>
      <style>
        :root {
          --navy: #14274E;
          --navy-soft: #1f3d6d;
          --gold: #C98A2C;
          --paper: #f2f5f7;
          --ink: #1f2a37;
          --muted: #667085;
          --line: #d5dce3;
          --green: #1d6b45;
          --success: #2e7d32;
          --warn: #b76e00;
          --danger: #b42318;
        }
        * { box-sizing: border-box; }
        html, body { max-width: 100%; overflow-x: hidden; }
        body {
          margin: 0;
          font-family: "Noto Sans", Arial, sans-serif;
          background: var(--paper);
          color: var(--ink);
        }
        .shell {
          max-width: 1380px;
          margin: 0 auto;
          padding: 28px;
        }
        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--navy);
          color: white;
          border-top: 4px solid var(--gold);
          border-bottom: 4px solid var(--green);
          padding: 14px 18px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .brand-mark {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          background: var(--navy-soft);
          border: 1px solid rgba(255,255,255,0.3);
        }
        .brand-mark svg { color: var(--green); }
        .pill {
          display: inline-flex;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 2px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 700;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 18px;
          margin-top: 24px;
        }
        .card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 3px;
          padding: 18px;
          box-shadow: 0 8px 25px rgba(20,39,78,0.05);
        }
        .stat-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
        .stat-value { font-size: 30px; font-weight: 800; color: var(--navy); margin-top: 12px; }
        .stat-sub { color: var(--muted); margin-top: 6px; font-size: 13px; }
        .layout {
          display: block;
          margin-top: 24px;
        }
        .view { display: none; }
        .view.active { display: block; }
        .view-heading { margin: 0 0 14px; color: var(--navy); font-size: 22px; }
        .view-description { margin: -6px 0 18px; color: var(--muted); font-size: 13px; }
        h3 {
          margin: 0 0 14px;
          color: var(--navy);
          font-size: 18px;
        }
        form {
          display: grid;
          gap: 14px;
        }
        .field-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        label {
          display: grid;
          gap: 7px;
          font-size: 13px;
          color: var(--muted);
          font-weight: 700;
        }
        input, select, textarea, button {
          width: 100%;
          padding: 12px 14px;
          border-radius: 3px;
          border: 1px solid var(--line);
          font: inherit;
          background: white;
        }
        textarea { min-height: 110px; resize: vertical; }
        button {
          cursor: pointer;
          background: var(--navy);
          color: white;
          border: none;
          font-weight: 700;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          table-layout: fixed;
        }
        .table th, .table td {
          text-align: left;
          padding: 10px 8px;
          border-bottom: 1px solid var(--line);
          vertical-align: top;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .table th {
          color: var(--muted);
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .status {
          display: inline-block;
          border-radius: 2px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
        }
        .status.pending { background: rgba(201,138,44,0.12); color: var(--warn); }
        .status.fulfilled { background: rgba(46,125,50,0.12); color: var(--success); }
        .status.rejected { background: rgba(180,35,24,0.12); color: var(--danger); }
        .status.open { background: rgba(201,138,44,0.12); color: var(--warn); }
        .status.resolved { background: rgba(46,125,50,0.12); color: var(--success); }
        .link-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 18px;
        }
        .section-nav {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 18px;
          padding: 10px 0;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        .section-nav a { color: var(--navy); font-size: 12px; font-weight: 700; text-decoration: none; padding-right: 12px; border-right: 1px solid var(--line); }
        .nav-link {
          color: var(--navy);
          text-decoration: none;
          font-weight: 700;
          border: 1px solid var(--line);
          padding: 10px 14px;
          border-radius: 3px;
          background: #fff;
        }
        @media (max-width: 980px) {
          .layout { grid-template-columns: 1fr; }
          .field-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .shell { padding: 14px; }
          .topbar { align-items: flex-start; gap: 12px; padding: 12px; }
          .brand small { display: block; max-width: 190px; line-height: 1.3; }
          .pill { padding: 7px 9px; font-size: 10px; }
          .card { padding: 13px; overflow: hidden; }
          .table { font-size: 11px; }
          .table th, .table td { padding: 8px 4px; }
          #agencyChangesTable th:nth-child(1), #agencyChangesTable td:nth-child(1) { width: 22%; }
          #agencyChangesTable th:nth-child(2), #agencyChangesTable td:nth-child(2) { width: 18%; }
          #agencyChangesTable th:nth-child(3), #agencyChangesTable td:nth-child(3) { width: 38%; }
          #agencyChangesTable th:nth-child(4), #agencyChangesTable td:nth-child(4) { width: 22%; }
        }
      </style>
    </head>
    <body>
      <div class="shell">
        <div class="topbar">
          <div class="brand">
            <div class="brand-mark" aria-label="Krishi Connect logo">
              <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20.5 3.5C12 3.8 5.4 7.1 4.2 13.1c-.7 3.5 1.4 6.3 4.8 6.6 6.1.5 10.3-6.1 11.5-16.2Z" fill="currentColor" stroke="none" />
                <path d="M4 21c3.1-5.8 7.1-9.5 12.5-12.5" stroke="#8B5A2B" />
              </svg>
            </div>
            <div>
              <div>Krishi Connect</div>
              <small>Procurement and grievance management</small>
            </div>
          </div>
          <div class="pill">Backend console</div>
        </div>

        <nav class="section-nav" aria-label="Console sections">
          <a href="#overview" data-view="overview">Overview</a>
          <a href="#live-entry" data-view="live-entry">Live data entry</a>
          <a href="#bookings" data-view="bookings">Today's bookings</a>
          <a href="#grievances" data-view="grievances">New grievances</a>
          <a href="#farmer-issues" data-view="farmer-issues">Farmer issues</a>
          <a href="#center-notices" data-view="center-notices">Centre notices</a>
          <a href="#farmers" data-view="farmers">Farmer profiles</a>
          <a href="#agencies" data-view="agencies">Agencies</a>
          <a href="#resolved" data-view="resolved">Resolved today</a>
        </nav>

        <div class="views" id="consoleViews">
          <section class="view active" id="view-overview">
            <h1 class="view-heading">Operations overview</h1>
            <p class="view-description">Current procurement activity and service workload.</p>
            <div class="stats" id="statsGrid"></div>
          </section>

        <div class="layout">
          <section class="view" id="view-live-entry">
            <div class="card" id="live-entry">
              <h1 class="view-heading">Live data entry</h1>
            <form id="bookingForm">
              <div class="field-row">
                <label>Farmer Name<input name="name" required /></label>
                <label>Phone<input name="phone" required /></label>
              </div>
              <div class="field-row">
                <label>Agency<select name="agencyId" id="agencySelect"></select></label>
                <label>Crop<select name="crop" id="cropSelect"></select></label>
                <label>Vehicle<select name="vehicle"><option>Tractor-trolley</option><option>Pickup truck</option><option>Mini truck</option><option>Heavy truck</option></select></label>
              </div>
              <div class="field-row">
                <label>Quantity (q)<input name="quantity" type="number" min="1" required /></label>
                <label>Slot<select name="slotTime"><option>7:00 AM – 9:00 AM</option><option>9:00 AM – 11:00 AM</option><option>11:00 AM – 1:00 PM</option><option>2:00 PM – 4:00 PM</option><option>4:00 PM – 6:00 PM</option></select></label>
              </div>
              <button type="submit">Create booking</button>
            </form>

            <div id="grievanceEntry" style="margin-top: 26px;">
              <h3>New grievance</h3>
              <form id="grievanceForm">
                <div class="field-row">
                  <label>Center<select name="center" id="grievanceCenter"></select></label>
                  <label>Category<select name="category"><option>Delayed weighing / quality check</option><option>Payment not received</option><option>Quality rejected unfairly</option><option>No shelter / basic facilities</option><option>Slot booking technical issue</option><option>Other</option></select></label>
                </div>
                <label>Problem description<textarea name="desc" required placeholder="Describe the issue"></textarea></label>
                <label>Phone<input name="phone" /></label>
                <label>Reported by<select name="reporterType"><option value="farmer">Farmer</option><option value="center">Center operator</option></select></label>
                <div class="field-row">
                  <label>Affected from<input name="affectedFrom" placeholder="e.g. 2:00 PM" /></label>
                  <label>Affected until<input name="affectedUntil" placeholder="e.g. 4:00 PM" /></label>
                </div>
                <button type="submit">Submit grievance</button>
              </form>
            </div>
            </div>
          </section>

          <section class="view" id="view-bookings">
            <div class="card" id="bookings">
              <h1 class="view-heading">Today's bookings</h1>
            <table class="table" id="bookingsTable">
              <thead>
                <tr><th>Booking</th><th>Farmer</th><th>Agency</th><th>Crop</th><th>Slot</th><th>Load</th><th>Status</th></tr>
              </thead>
              <tbody></tbody>
            </table>
            <div id="issueTables" style="margin-top: 22px;">
              <h3 id="farmer-issues">Farmer-reported issues</h3>
              <table class="table" id="farmerIssuesTable">
                <thead>
                  <tr><th>Report</th><th>Center</th><th>Issue</th><th>Farmer</th><th>Status</th></tr>
                </thead>
                <tbody></tbody>
              </table>
              <h3 id="grievances" style="margin-top: 22px;">New grievances and center notices</h3>
              <table class="table" id="centerIssuesTable">
                <thead>
                  <tr><th>Notice</th><th>Center</th><th>Notice</th><th>Window</th><th>Status</th></tr>
                </thead>
                <tbody></tbody>
              </table>
              <h3 id="farmers" style="margin-top: 22px;">Farmer profiles</h3>
              <table class="table" id="farmersTable">
                <thead><tr><th>Farmer</th><th>Phone</th><th>Aadhaar / PAN</th><th>Documents</th><th>Registered</th></tr></thead>
                <tbody></tbody>
              </table>
              <h3 id="agencies" style="margin-top: 22px;">Agency management</h3>
              <table class="table" id="agenciesTable">
                <thead><tr><th>Agency</th><th>Type</th><th>Region</th><th>Crops</th><th>Venue</th><th>Timings</th></tr></thead>
                <tbody></tbody>
              </table>
              <h3 style="margin-top: 22px;">Agency changes</h3>
              <table class="table" id="agencyChangesTable">
                <thead><tr><th>Agency</th><th>Changed by</th><th>Changes</th><th>Time</th></tr></thead>
                <tbody></tbody>
              </table>
              <h3 id="resolved" style="margin-top: 22px;">Resolved by officers today</h3>
              <table class="table" id="actionsTable">
                <thead><tr><th>Issue</th><th>Officer</th><th>Action</th><th>Time</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
            </div>
            </div>
          </section>
        </div>

        <div class="link-row">
          <a class="nav-link" href="/app">Open farmer website</a>
          <a class="nav-link" href="/api/health">Health API</a>
        </div>
      </div>

      <script>
        const statsGrid = document.getElementById('statsGrid')
        const agencySelect = document.getElementById('agencySelect')
        const cropSelect = document.getElementById('cropSelect')
        const grievanceCenter = document.getElementById('grievanceCenter')
        const bookingsBody = document.querySelector('#bookingsTable tbody')
        const farmerIssuesBody = document.querySelector('#farmerIssuesTable tbody')
        const centerIssuesBody = document.querySelector('#centerIssuesTable tbody')
        const farmersBody = document.querySelector('#farmersTable tbody')
        const agenciesBody = document.querySelector('#agenciesTable tbody')
        const agencyChangesBody = document.querySelector('#agencyChangesTable tbody')
        const actionsBody = document.querySelector('#actionsTable tbody')

        function createView(name, title, description) {
          const view = document.createElement('section')
          view.className = 'view'
          view.id = 'view-' + name
          const card = document.createElement('div')
          card.className = 'card'
          card.innerHTML = '<h1 class="view-heading">' + title + '</h1><p class="view-description">' + description + '</p>'
          view.appendChild(card)
          document.getElementById('consoleViews').appendChild(view)
          return card
        }

        function setupConsoleViews() {
          const grievanceCard = createView('grievances', 'New grievances', 'Review and enter new service complaints and centre notices.')
          grievanceCard.appendChild(document.getElementById('grievanceEntry'))

          const sections = [
            ['farmer-issues', 'Farmer issues', 'Issues reported by farmers at procurement centres.', 'farmerIssuesTable'],
            ['farmers', 'Farmer profiles', 'Registered farmer identities and document availability.', 'farmersTable'],
            ['resolved', 'Resolved today', 'Issues resolved today and the officer responsible.', 'actionsTable'],
          ]
          sections.forEach(([name, title, description, tableId]) => {
            const card = createView(name, title, description)
            card.appendChild(document.getElementById(tableId).previousElementSibling)
            card.appendChild(document.getElementById(tableId))
          })

          const agencyCard = createView('agencies', 'Agencies', 'Government and private procurement agency records and change history.')
          agencyCard.appendChild(document.getElementById('agenciesTable').previousElementSibling)
          agencyCard.appendChild(document.getElementById('agenciesTable'))
          agencyCard.appendChild(document.getElementById('agencyChangesTable').previousElementSibling)
          agencyCard.appendChild(document.getElementById('agencyChangesTable'))

          const centerCard = createView('center-notices', 'Centre notices', 'Closures and time-bound notices submitted by procurement centres.')
          centerCard.appendChild(document.getElementById('centerIssuesTable').previousElementSibling)
          centerCard.appendChild(document.getElementById('centerIssuesTable'))

          document.querySelectorAll('[data-view]').forEach((link) => link.addEventListener('click', (event) => {
            event.preventDefault()
            const name = link.dataset.view
            document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'))
            document.getElementById('view-' + name).classList.add('active')
            history.replaceState(null, '', '#' + name)
          }))

          const initialView = location.hash.slice(1) || 'overview'
          const initialElement = document.getElementById('view-' + initialView) || document.getElementById('view-overview')
          document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'))
          initialElement.classList.add('active')
        }

        setupConsoleViews()

        async function loadDashboard() {
          const dashboard = await fetch('/api/dashboard').then((res) => res.json())
          const agencies = await fetch('/api/agencies').then((res) => res.json())

          statsGrid.innerHTML = [
            '<div class="card">',
            '<div class="stat-label">Registered centers</div>',
            '<div class="stat-value">' + agencies.length + '</div>',
            '<div class="stat-sub">Active procurement agencies</div>',
            '</div>',
            '<div class="card">',
            '<div class="stat-label">Bookings</div>',
            '<div class="stat-value">' + dashboard.bookings.length + '</div>',
            '<div class="stat-sub">Live buyer requests</div>',
            '</div>',
            '<div class="card">',
            '<div class="stat-label">Open issues</div>',
            '<div class="stat-value">' + dashboard.openIssues.length + '</div>',
            '<div class="stat-sub">Pending grievance follow-up</div>',
            '</div>',
            '<div class="card">',
            '<div class="stat-label">Capacity</div>',
            '<div class="stat-value">' + (dashboard.agency && dashboard.agency.freeTonnes !== undefined ? dashboard.agency.freeTonnes : 0) + ' t</div>',
            '<div class="stat-sub">Available tonnage today</div>',
            '</div>'
          ].join('')

          agencySelect.innerHTML = agencies.map((agency) => '<option value="' + agency.id + '">' + agency.name + '</option>').join('')
          grievanceCenter.innerHTML = agencies.map((agency) => '<option value="' + agency.name + '">' + agency.name + '</option>').join('')
          const selectedAgency = agencies[0]
          cropSelect.innerHTML = (selectedAgency ? selectedAgency.crops : []).map((crop) => '<option>' + crop + '</option>').join('')

          agencySelect.onchange = () => {
            const agency = agencies.find((item) => item.id === agencySelect.value)
            cropSelect.innerHTML = (agency ? agency.crops : []).map((crop) => '<option>' + crop + '</option>').join('')
          }

          bookingsBody.innerHTML = dashboard.bookings.slice(0, 8).map((booking) => [
            '<tr>',
            '<td><strong>' + booking.token + '</strong><br><small>' + booking.phone + '</small></td>',
            '<td>' + booking.farmer + '</td>',
            '<td>' + booking.agencyName + '</td>',
            '<td>' + booking.crop + '</td>',
            '<td>' + booking.slot + '</td>',
            '<td>' + booking.quantity + ' q<br><small>' + booking.vehicle + '</small></td>',
            '<td><span class="status ' + booking.status + '">' + booking.status + '</span></td>',
            '</tr>'
          ].join('')).join('')

          farmerIssuesBody.innerHTML = dashboard.farmerIssues.slice(0, 8).map((issue) => [
            '<tr>',
            '<td>' + issue.id + '</td>',
            '<td>' + issue.center + '</td>',
            '<td>' + issue.category + '<br><small>' + issue.description + '</small></td>',
            '<td>' + issue.farmer + '</td>',
            '<td><span class="status ' + issue.status + '">' + issue.status + '</span></td>',
            '</tr>'
          ].join('')).join('')

          centerIssuesBody.innerHTML = dashboard.centerIssues.slice(0, 8).map((issue) => [
            '<tr>',
            '<td>' + issue.id + '</td>',
            '<td>' + issue.center + '</td>',
            '<td>' + issue.category + '<br><small>' + issue.description + '</small></td>',
            '<td>' + (issue.affectedFrom || issue.affectedUntil ? (issue.affectedFrom || '?') + ' – ' + (issue.affectedUntil || '?') : 'All day') + '</td>',
            '<td><span class="status ' + issue.status + '">' + issue.status + '</span></td>',
            '</tr>'
          ].join('')).join('')

          farmersBody.innerHTML = (dashboard.farmers || []).slice(0, 12).map((farmer) => [
            '<tr>',
            '<td><strong>' + farmer.name + '</strong><br><small>' + farmer.id + '</small></td>',
            '<td>' + farmer.phone + '</td>',
            '<td>' + farmer.aadhaarNumber + '<br>' + farmer.panNumber + '</td>',
            '<td>' + (farmer.profilePhoto ? 'Photo' : 'No photo') + ' · ' + (farmer.aadhaarDocument ? 'Aadhaar image' : 'No Aadhaar image') + ' · ' + (farmer.panDocument ? 'PAN image' : 'No PAN image') + '</td>',
            '<td>' + new Date(farmer.createdAt).toLocaleDateString() + '</td>',
            '</tr>'
          ].join('')).join('')

          agenciesBody.innerHTML = (dashboard.agencies || []).map((agency) => [
            '<tr>',
            '<td><strong>' + agency.name + '</strong><br><small>' + agency.id + '</small></td>',
            '<td>' + (agency.agencyType === 'private' ? 'Private' : 'Government') + '</td>',
            '<td>' + agency.region + '</td>',
            '<td>' + agency.crops.join(', ') + '</td>',
            '<td>' + agency.venue + '</td>',
            '<td>' + agency.timings + '</td>',
            '</tr>'
          ].join('')).join('')

          agencyChangesBody.innerHTML = (dashboard.agencyChanges || []).map((change) => [
            '<tr>',
            '<td>' + change.agencyName + '</td>',
            '<td>' + change.changedBy + '</td>',
            '<td><small>' + change.changes + '</small></td>',
            '<td>' + new Date(change.createdAt).toLocaleString() + '</td>',
            '</tr>'
          ].join('')).join('')

          actionsBody.innerHTML = (dashboard.resolvedToday || []).slice(0, 12).map((action) => [
            '<tr>',
            '<td>' + action.grievanceId + '</td>',
            '<td>' + action.officerName + '</td>',
            '<td>' + action.action + '</td>',
            '<td>' + new Date(action.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</td>',
            '</tr>'
          ].join('')).join('')
        }

        document.getElementById('bookingForm').addEventListener('submit', async (event) => {
          event.preventDefault()
          const formData = new FormData(event.target)
          const payload = {
            agencyId: formData.get('agencyId'),
            crop: formData.get('crop'),
            name: formData.get('name'),
            phone: formData.get('phone'),
            quantity: formData.get('quantity'),
            vehicle: formData.get('vehicle'),
            slotTime: formData.get('slotTime'),
          }

          const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

          if (response.ok) {
            event.target.reset()
            await loadDashboard()
          }
        })

        document.getElementById('grievanceForm').addEventListener('submit', async (event) => {
          event.preventDefault()
          const formData = new FormData(event.target)
          const payload = {
            center: formData.get('center'),
            category: formData.get('category'),
            desc: formData.get('desc'),
            phone: formData.get('phone'),
            reporterType: formData.get('reporterType'),
            affectedFrom: formData.get('affectedFrom'),
            affectedUntil: formData.get('affectedUntil'),
          }

          const response = await fetch('/api/grievances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

          if (response.ok) {
            event.target.reset()
            await loadDashboard()
          }
        })

        loadDashboard()
      </script>
    </body>
  </html>
`

app.get('/', (_req, res) => {
  res.type('html').send(dashboardHtml)
})

if (frontendExists) {
  app.get('/app', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
  app.use('/app', express.static(distPath))
  app.get('/app/*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const SLOT_TEMPLATES = [
  { time: '7:00 AM – 9:00 AM', capacity: 20 },
  { time: '9:00 AM – 11:00 AM', capacity: 20 },
  { time: '11:00 AM – 1:00 PM', capacity: 20 },
  { time: '2:00 PM – 4:00 PM', capacity: 20 },
  { time: '4:00 PM – 6:00 PM', capacity: 20 },
]

const getSlotsForAgency = async (agencyId) => allDb('SELECT id, time, capacity, booked FROM agency_slots WHERE agencyId = ? ORDER BY id', [agencyId])

const requireOfficer = (req, res, next) => {
  const token = req.get('Authorization')?.replace('Bearer ', '')
  const officer = token ? officerSessions.get(token) : null
  if (!officer) return res.status(401).json({ message: 'Officer login required.' })
  req.officer = officer
  next()
}

const requireFarmer = (req, res, next) => {
  const token = req.get('Authorization')?.replace('Bearer ', '')
  const farmer = token ? farmerSessions.get(token) : null
  if (!farmer) return res.status(401).json({ message: 'Farmer login required.' })
  req.farmer = farmer
  next()
}

const requireAgency = (req, res, next) => {
  const token = req.get('Authorization')?.replace('Bearer ', '')
  const agency = token ? agencySessions.get(token) : null
  if (!agency) return res.status(401).json({ message: 'Private agency login required.' })
  req.agency = agency
  next()
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'krishi-connect-api', time: new Date().toISOString() })
})

app.get('/api/agencies', async (_req, res) => {
  const rows = await allDb('SELECT * FROM agencies WHERE active = 1 ORDER BY name ASC')
  res.json(rows.map(serializeAgency))
})

app.get('/api/agencies/me', requireAgency, async (req, res) => {
  res.json(serializeAgency(await getDb('SELECT * FROM agencies WHERE id = ?', [req.agency.id])))
})

app.get('/api/agencies/:id', async (req, res) => {
  const agency = await getDb('SELECT * FROM agencies WHERE id = ? AND active = 1', [req.params.id])
  if (!agency) return res.status(404).json({ message: 'Agency not found' })
  res.json(serializeAgency(agency))
})

app.get('/api/agencies/:id/slots', async (req, res) => {
  const agencyExists = await getDb('SELECT id FROM agencies WHERE id = ? AND active = 1', [req.params.id])
  if (!agencyExists) return res.status(404).json({ message: 'Agency not found' })
  res.json(await getSlotsForAgency(req.params.id))
})

app.post('/api/agencies/private/register', async (req, res) => {
  if (req.get('Authorization')) return res.status(403).json({ message: 'Sign out of the current account before creating a private agency account.' })
  const { name, username, password, region, venue, timings, address, crops, capacityTonnes } = req.body || {}
  if (!name || !username || !password || !region || !venue || !timings || !address || !crops) return res.status(400).json({ message: 'Agency name, login details, region, address, venue, timings and crops are required.' })
  const id = `PRI-${Date.now().toString().slice(-7)}`
  const cropList = Array.isArray(crops) ? crops : String(crops).split(',').map((crop) => crop.trim()).filter(Boolean)
  try {
    await runDb('INSERT INTO agencies (id, name, region, crops, rating, capacityTonnes, bookedTonnes, address, agencyType, username, password, venue, timings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, name.trim(), region, JSON.stringify(cropList), 0, Number(capacityTonnes) || 100, 0, address, 'private', username.trim(), password, venue, timings])
  } catch (error) {
    if (error.message.includes('UNIQUE')) return res.status(409).json({ message: 'That agency username is already registered.' })
    throw error
  }
  const agency = await getDb('SELECT * FROM agencies WHERE id = ?', [id])
  const token = `${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  agencySessions.set(token, { id, name: agency.name, agencyType: 'private' })
  res.status(201).json({ token, agency: serializeAgency(agency) })
})

app.post('/api/agencies/login', async (req, res) => {
  const agency = await getDb("SELECT * FROM agencies WHERE username = ? AND password = ? AND agencyType = 'private'", [req.body?.username, req.body?.password])
  if (!agency) return res.status(401).json({ message: 'Invalid private agency credentials.' })
  const token = `${agency.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  agencySessions.set(token, { id: agency.id, name: agency.name, agencyType: 'private' })
  res.json({ token, agency: serializeAgency(agency) })
})

app.patch('/api/agencies/me', requireAgency, async (req, res) => {
  const allowed = ['name', 'region', 'address', 'venue', 'timings', 'crops', 'capacityTonnes']
  const current = await getDb('SELECT * FROM agencies WHERE id = ?', [req.agency.id])
  const next = { ...current }
  allowed.forEach((field) => { if (req.body?.[field] !== undefined) next[field] = field === 'crops' ? JSON.stringify(Array.isArray(req.body[field]) ? req.body[field] : String(req.body[field]).split(',').map((crop) => crop.trim()).filter(Boolean)) : req.body[field] })
  await runDb('UPDATE agencies SET name = ?, region = ?, address = ?, venue = ?, timings = ?, crops = ?, capacityTonnes = ? WHERE id = ?', [next.name, next.region, next.address, next.venue, next.timings, next.crops, Number(next.capacityTonnes) || 100, req.agency.id])
  await runDb('INSERT INTO agency_changes (agencyId, agencyName, changedBy, changes) VALUES (?, ?, ?, ?)', [req.agency.id, next.name, 'private-agency', JSON.stringify(req.body)])
  res.json(serializeAgency(await getDb('SELECT * FROM agencies WHERE id = ?', [req.agency.id])))
})

app.delete('/api/agencies/me', requireAgency, async (req, res) => {
  const now = new Date().toISOString()
  await runDb('UPDATE agencies SET active = 0, removedAt = ?, removedBy = ?, removedByType = ? WHERE id = ? AND agencyType = ?', [now, req.agency.name, 'private-agency', req.agency.id, 'private'])
  await runDb('INSERT INTO agency_changes (agencyId, agencyName, changedBy, changes) VALUES (?, ?, ?, ?)', [req.agency.id, req.agency.name, req.agency.name, JSON.stringify({ action: 'listing_removed', removedAt: now })])
  res.json({ removed: true, agencyId: req.agency.id, removedAt: now })
})

app.post('/api/agencies/me/slots', requireAgency, async (req, res) => {
  const { time, capacity } = req.body || {}
  if (!time || !capacity || Number(capacity) < 1) return res.status(400).json({ message: 'Slot time and a positive capacity are required.' })
  const id = `${req.agency.id}-S${Date.now()}`
  await runDb('INSERT INTO agency_slots (id, agencyId, time, capacity, booked) VALUES (?, ?, ?, ?, 0)', [id, req.agency.id, time.trim(), Number(capacity)])
  res.status(201).json(await getDb('SELECT id, time, capacity, booked FROM agency_slots WHERE id = ?', [id]))
})

app.patch('/api/agencies/:id', requireOfficer, async (req, res) => {
  const current = await getDb('SELECT * FROM agencies WHERE id = ?', [req.params.id])
  if (!current) return res.status(404).json({ message: 'Agency not found.' })
  const fields = ['name', 'region', 'address', 'venue', 'timings', 'capacityTonnes']
  const next = { ...current }
  fields.forEach((field) => { if (req.body?.[field] !== undefined) next[field] = req.body[field] })
  if (req.body?.crops !== undefined) next.crops = JSON.stringify(Array.isArray(req.body.crops) ? req.body.crops : String(req.body.crops).split(',').map((crop) => crop.trim()).filter(Boolean))
  await runDb('UPDATE agencies SET name = ?, region = ?, address = ?, venue = ?, timings = ?, crops = ?, capacityTonnes = ? WHERE id = ?', [next.name, next.region, next.address, next.venue, next.timings, next.crops, Number(next.capacityTonnes) || 100, req.params.id])
  await runDb('INSERT INTO agency_changes (agencyId, agencyName, changedBy, changes) VALUES (?, ?, ?, ?)', [req.params.id, next.name, req.officer.name, JSON.stringify(req.body)])
  res.json(serializeAgency(await getDb('SELECT * FROM agencies WHERE id = ?', [req.params.id])))
})

app.delete('/api/agencies/:id', requireOfficer, async (req, res) => {
  const agency = await getDb('SELECT id, name, agencyType FROM agencies WHERE id = ?', [req.params.id])
  if (!agency) return res.status(404).json({ message: 'Agency not found.' })
  const now = new Date().toISOString()
  await runDb('UPDATE agencies SET active = 0, removedAt = ?, removedBy = ?, removedByType = ? WHERE id = ?', [now, req.officer.name, 'officer', req.params.id])
  await runDb('INSERT INTO agency_changes (agencyId, agencyName, changedBy, changes) VALUES (?, ?, ?, ?)', [agency.id, agency.name, req.officer.name, JSON.stringify({ action: 'listing_removed', removedAt: now, agencyType: agency.agencyType })])
  res.json({ removed: true, agencyId: agency.id, agencyType: agency.agencyType, removedAt: now })
})

app.post('/api/agencies/government', requireOfficer, async (req, res) => {
  const { name, region, address, venue, timings, crops, capacityTonnes } = req.body || {}
  if (!name || !region || !address || !venue || !timings || !crops) return res.status(400).json({ message: 'Name, region, address, venue, timings and crops are required.' })
  const id = `GOV-${Date.now().toString().slice(-7)}`
  const cropList = Array.isArray(crops) ? crops : String(crops).split(',').map((crop) => crop.trim()).filter(Boolean)
  await runDb('INSERT INTO agencies (id, name, region, crops, rating, capacityTonnes, bookedTonnes, address, agencyType, venue, timings) VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?)', [id, name.trim(), region, JSON.stringify(cropList), Number(capacityTonnes) || 100, address, 'government', venue, timings])
  await runDb('INSERT INTO agency_changes (agencyId, agencyName, changedBy, changes) VALUES (?, ?, ?, ?)', [id, name.trim(), req.officer.name, JSON.stringify({ created: req.body })])
  res.status(201).json(serializeAgency(await getDb('SELECT * FROM agencies WHERE id = ?', [id])))
})

app.get('/api/agencies/me/farmers', requireAgency, async (req, res) => {
  res.json(await allDb('SELECT DISTINCT f.id, f.name, f.phone FROM farmers f JOIN bookings b ON b.phone = f.phone WHERE b.agencyId = ? ORDER BY f.name', [req.agency.id]))
})

app.get('/api/agency-changes', requireOfficer, async (_req, res) => {
  res.json(await allDb('SELECT * FROM agency_changes ORDER BY createdAt DESC'))
})

app.get('/api/agencies/:id/reviews', async (req, res) => {
  res.json(await allDb('SELECT * FROM reviews WHERE subjectType = ? AND subjectId = ? ORDER BY createdAt DESC', ['agency', req.params.id]))
})

app.post('/api/agencies/:id/reviews', requireFarmer, async (req, res) => {
  const rating = Number(req.body?.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5.' })
  await runDb('INSERT OR REPLACE INTO reviews (reviewerType, reviewerId, subjectType, subjectId, rating, comment) VALUES (?, ?, ?, ?, ?, ?)', ['farmer', req.farmer.id, 'agency', req.params.id, rating, req.body.comment || ''])
  const summary = await getDb('SELECT AVG(rating) AS rating, COUNT(*) AS count FROM reviews WHERE subjectType = ? AND subjectId = ?', ['agency', req.params.id])
  await runDb('UPDATE agencies SET rating = ? WHERE id = ?', [summary.rating, req.params.id])
  res.status(201).json({ rating, comment: req.body.comment || '' })
})

app.get('/api/farmers/:id/reviews', async (req, res) => {
  res.json(await allDb('SELECT * FROM reviews WHERE subjectType = ? AND subjectId = ? ORDER BY createdAt DESC', ['farmer', req.params.id]))
})

app.post('/api/farmers/:id/reviews', requireAgency, async (req, res) => {
  const rating = Number(req.body?.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5.' })
  await runDb('INSERT OR REPLACE INTO reviews (reviewerType, reviewerId, subjectType, subjectId, rating, comment) VALUES (?, ?, ?, ?, ?, ?)', ['agency', req.agency.id, 'farmer', req.params.id, rating, req.body.comment || ''])
  res.status(201).json({ rating, comment: req.body.comment || '' })
})

const fileDataUrl = (file) => file ? `data:${file.mimetype};base64,${file.buffer.toString('base64')}` : ''

app.get('/api/farmer/captcha', (_req, res) => {
  const left = Math.floor(Math.random() * 8) + 2
  const right = Math.floor(Math.random() * 8) + 1
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  captchaChallenges.set(id, String(left + right))
  res.json({ id, question: `${left} + ${right} = ?` })
})

// OTP verification for a farmer's registered mobile number.
// In production, swap sendSms's body (see src/utils/sms.js) for a real
// gateway call -- this endpoint's logic (generate, store, expire, check)
// stays the same either way.
const OTP_TTL_MS = 5 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 30 * 1000

app.post('/api/otp/request', async (req, res) => {
  const phone = String(req.body?.phone || '').trim()
  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' })

  const existing = otpChallenges.get(phone)
  if (existing && existing.expiresAt - OTP_TTL_MS + OTP_RESEND_COOLDOWN_MS > Date.now()) {
    return res.status(429).json({ message: 'Please wait before requesting another OTP.' })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  otpChallenges.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 })
  await sendSms(phone, `Krishi Connect: Your OTP is ${code}. It is valid for 5 minutes. Do not share it with anyone.`)
  res.json({ sent: true, phone, expiresInSeconds: OTP_TTL_MS / 1000 })
})

app.post('/api/otp/verify', async (req, res) => {
  const phone = String(req.body?.phone || '').trim()
  const otp = String(req.body?.otp || '').trim()
  const challenge = otpChallenges.get(phone)

  if (!challenge) return res.status(400).json({ message: 'Request an OTP for this number first.' })
  if (Date.now() > challenge.expiresAt) {
    otpChallenges.delete(phone)
    return res.status(400).json({ message: 'That OTP has expired. Request a new one.' })
  }
  challenge.attempts += 1
  if (challenge.attempts > 5) {
    otpChallenges.delete(phone)
    return res.status(429).json({ message: 'Too many incorrect attempts. Request a new OTP.' })
  }
  if (challenge.code !== otp) return res.status(400).json({ message: 'Incorrect OTP.' })

  otpChallenges.delete(phone)

  // Phone is now verified. If a farmer profile already exists for it,
  // log them straight in; otherwise let the caller proceed to register.
  const farmer = await getDb('SELECT id, name, phone, email, aadhaarNumber, panNumber, profilePhoto, aadhaarDocument, panDocument, createdAt FROM farmers WHERE phone = ?', [phone])
  if (!farmer) return res.json({ verified: true, farmer: null })

  const token = `${farmer.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  farmerSessions.set(token, farmer)
  res.json({ verified: true, token, farmer })
})

// Email OTP login -- same challenge/expiry/attempt pattern as the phone OTP
// above, just sent via sendEmail instead of sendSms.
app.post('/api/email-otp/request', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' })

  const existing = emailOtpChallenges.get(email)
  if (existing && existing.expiresAt - OTP_TTL_MS + OTP_RESEND_COOLDOWN_MS > Date.now()) {
    return res.status(429).json({ message: 'Please wait before requesting another code.' })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  emailOtpChallenges.set(email, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 })
  await sendEmail(email, 'Your Krishi Connect login code', `Your one-time login code is ${code}. It is valid for 5 minutes. Do not share it with anyone.`)
  res.json({ sent: true, email, expiresInSeconds: OTP_TTL_MS / 1000 })
})

app.post('/api/email-otp/verify', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const otp = String(req.body?.otp || '').trim()
  const challenge = emailOtpChallenges.get(email)

  if (!challenge) return res.status(400).json({ message: 'Request a code for this email first.' })
  if (Date.now() > challenge.expiresAt) {
    emailOtpChallenges.delete(email)
    return res.status(400).json({ message: 'That code has expired. Request a new one.' })
  }
  challenge.attempts += 1
  if (challenge.attempts > 5) {
    emailOtpChallenges.delete(email)
    return res.status(429).json({ message: 'Too many incorrect attempts. Request a new code.' })
  }
  if (challenge.code !== otp) return res.status(400).json({ message: 'Incorrect code.' })

  emailOtpChallenges.delete(email)

  // Email is now verified. If a farmer profile already exists for it,
  // log them straight in; otherwise let the caller proceed to register.
  const farmer = await getDb('SELECT id, name, phone, email, aadhaarNumber, panNumber, profilePhoto, aadhaarDocument, panDocument, createdAt FROM farmers WHERE lower(email) = ?', [email])
  if (!farmer) return res.json({ verified: true, farmer: null })

  const token = `${farmer.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  farmerSessions.set(token, farmer)
  res.json({ verified: true, token, farmer })
})

app.post('/api/farmer/register', upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'aadhaarDocument', maxCount: 1 },
  { name: 'panDocument', maxCount: 1 },
]), async (req, res) => {
  const { name, phone, email, aadhaarNumber, panNumber, captchaId, captchaAnswer } = req.body || {}
  if (!name || !phone || !aadhaarNumber || !panNumber || !captchaId || !captchaAnswer) return res.status(400).json({ message: 'Name, phone, Aadhaar number, PAN number and captcha are required.' })
  if (captchaChallenges.get(captchaId) !== String(captchaAnswer).trim()) return res.status(400).json({ message: 'Captcha answer is incorrect.' })
  captchaChallenges.delete(captchaId)
  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid 10-digit phone number.' })
  if (!/^\d{12}$/.test(aadhaarNumber)) return res.status(400).json({ message: 'Enter a valid 12-digit Aadhaar number.' })
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber.toUpperCase())) return res.status(400).json({ message: 'Enter a valid PAN number, for example ABCDE1234F.' })
  if (email && !isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address, or leave it blank.' })
  const existing = await getDb('SELECT id FROM farmers WHERE phone = ?', [phone])
  if (existing) return res.status(409).json({ message: 'A farmer profile already exists for this phone number.' })
  const files = req.files || {}
  const id = `FAR-${Date.now().toString().slice(-8)}`
  await runDb('INSERT INTO farmers (id, name, phone, email, aadhaarNumber, panNumber, profilePhoto, aadhaarDocument, panDocument) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, name.trim(), phone, String(email || '').trim(), aadhaarNumber, panNumber.toUpperCase(), fileDataUrl(files.profilePhoto?.[0]), fileDataUrl(files.aadhaarDocument?.[0]), fileDataUrl(files.panDocument?.[0])])
  const farmer = await getDb('SELECT id, name, phone, email, aadhaarNumber, panNumber, profilePhoto, aadhaarDocument, panDocument, createdAt FROM farmers WHERE id = ?', [id])
  const token = `${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  farmerSessions.set(token, farmer)
  res.status(201).json({ token, farmer })
})

app.get('/api/farmer/me', requireFarmer, async (req, res) => {
  const farmer = await getDb('SELECT id, name, phone, email, aadhaarNumber, panNumber, profilePhoto, aadhaarDocument, panDocument, createdAt FROM farmers WHERE id = ?', [req.farmer.id])
  res.json(farmer)
})

app.post('/api/farmer/logout', requireFarmer, (req, res) => {
  farmerSessions.delete(req.get('Authorization')?.replace('Bearer ', ''))
  res.status(204).end()
})

app.get('/api/farmers', requireOfficer, async (_req, res) => {
  const farmers = await allDb('SELECT id, name, phone, email, aadhaarNumber, panNumber, profilePhoto, aadhaarDocument, panDocument, createdAt FROM farmers ORDER BY createdAt DESC')
  res.json(farmers)
})

app.post('/api/officer/login', async (req, res) => {
  const { username, password } = req.body || {}
  const officer = await getDb('SELECT id, name, username, region FROM officers WHERE username = ? AND password = ?', [username, password])
  if (!officer) return res.status(401).json({ message: 'Invalid officer credentials.' })
  const token = `${officer.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  officerSessions.set(token, officer)
  res.json({ token, officer })
})

app.post('/api/officer/register', async (req, res) => {
  const { name, username, password, region } = req.body || {}
  if (!name || !username || !password || !region) return res.status(400).json({ message: 'Name, username, password and region are required.' })
  const id = `OFF-${Date.now().toString().slice(-6)}`
  try {
    await runDb('INSERT INTO officers (id, name, username, password, region) VALUES (?, ?, ?, ?, ?)', [id, name.trim(), username.trim(), password, region])
  } catch (error) {
    if (error.message.includes('UNIQUE')) return res.status(409).json({ message: 'That officer username is already registered.' })
    throw error
  }
  const officer = { id, name: name.trim(), username: username.trim(), region }
  const token = `${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  officerSessions.set(token, officer)
  res.status(201).json({ token, officer })
})

app.post('/api/farmer/login', async (req, res) => {
  const { phone, aadhaarNumber } = req.body || {}
  const farmer = await getDb('SELECT id, name, phone, email, aadhaarNumber, panNumber, profilePhoto, aadhaarDocument, panDocument, createdAt FROM farmers WHERE phone = ? AND aadhaarNumber = ?', [phone, aadhaarNumber])
  if (!farmer) return res.status(401).json({ message: 'No farmer account matches those details.' })
  const token = `${farmer.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  farmerSessions.set(token, farmer)
  res.json({ token, farmer })
})

app.post('/api/officer/logout', requireOfficer, (req, res) => {
  const token = req.get('Authorization')?.replace('Bearer ', '')
  officerSessions.delete(token)
  res.status(204).end()
})

const dashboardReader = (req, res, next) => {
  const token = req.get('Authorization')?.replace('Bearer ', '')
  if (token && !officerSessions.has(token)) return res.status(401).json({ message: 'Officer login required.' })
  if (token) req.officer = officerSessions.get(token)
  next()
}

app.get('/api/dashboard', dashboardReader, async (req, res) => {
  const [agencyRow, bookings, openIssues, farmers, agencies, agencyChanges] = await Promise.all([
    getDb('SELECT * FROM agencies ORDER BY name ASC LIMIT 1'),
    allDb("SELECT b.*, a.name AS agencyName, a.region, a.crops AS agencyCrops FROM bookings b LEFT JOIN agencies a ON a.id = b.agencyId WHERE date(b.createdAt, 'localtime') = date('now', 'localtime') ORDER BY b.createdAt DESC"),
    allDb('SELECT * FROM grievances WHERE status = ? ORDER BY createdAt DESC', ['open']),
    allDb('SELECT id, name, phone, email, aadhaarNumber, panNumber, profilePhoto, aadhaarDocument, panDocument, createdAt FROM farmers ORDER BY createdAt DESC'),
    allDb('SELECT * FROM agencies ORDER BY name'),
    allDb('SELECT * FROM agency_changes ORDER BY createdAt DESC LIMIT 50'),
  ])

  const serializedBookings = bookings.map(serializeBooking)

  res.json({
    agency: agencyRow ? serializeAgency(agencyRow) : null,
    bookings: serializedBookings,
    openIssues,
    farmerIssues: openIssues.filter((issue) => issue.reporterType !== 'center'),
    centerIssues: openIssues.filter((issue) => issue.reporterType === 'center'),
    resolvedToday: await allDb("SELECT * FROM issue_actions WHERE action = 'resolved' AND date(createdAt, 'localtime') = date('now', 'localtime') ORDER BY createdAt DESC"),
    officer: req.officer || null,
    farmers,
    agencies: agencies.map(serializeAgency),
    agencyChanges,
  })
})

app.get('/api/grievances', async (_req, res) => {
  const rows = await allDb('SELECT * FROM grievances ORDER BY createdAt DESC')
  res.json(rows)
})

app.patch('/api/grievances/:id/status', requireOfficer, async (req, res) => {
  const status = req.body?.status
  if (!['open', 'resolved'].includes(status)) return res.status(400).json({ message: 'Invalid issue status.' })
  const result = await runDb('UPDATE grievances SET status = ? WHERE id = ?', [status, req.params.id])
  if (!result.changes) return res.status(404).json({ message: 'Issue not found.' })
  await runDb('INSERT INTO issue_actions (grievanceId, officerId, officerName, action) VALUES (?, ?, ?, ?)', [req.params.id, req.officer.id, req.officer.name, status])
  const grievance = await getDb('SELECT * FROM grievances WHERE id = ?', [req.params.id])

  // Notify the reporter by email once resolved, but only to a valid address.
  // Prefer the email captured on the grievance itself; if there isn't one,
  // fall back to the email on the farmer account matching the phone number.
  if (status === 'resolved') {
    let resolvedEmail = String(grievance?.email || '').trim()
    if (!resolvedEmail && grievance?.phone) {
      const matchedFarmer = await getDb('SELECT email FROM farmers WHERE phone = ?', [grievance.phone])
      resolvedEmail = String(matchedFarmer?.email || '').trim()
    }
    if (isValidEmail(resolvedEmail)) {
      sendEmail(resolvedEmail, `Your Krishi Connect issue ${grievance.id} has been resolved`, `Your issue ${grievance.id} (${grievance.category}) has been resolved. Thank you for your patience.`).catch((err) => console.error('Resolved-issue email failed:', err))
    } else {
      console.warn(`Skipped resolved-issue email for grievance ${grievance?.id}: no valid email on file.`)
    }
  }

  res.json(grievance)
})

app.post('/api/grievances', async (req, res) => {
  const { center, category, desc, phone, email, reporterType, affectedFrom, affectedUntil } = req.body || {}
  if (!center || !category || !desc) {
    return res.status(400).json({ message: 'Center, category and description are required.' })
  }
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ message: 'Enter a valid email address, or leave it blank.' })
  }

  const id = `GRV-${Math.floor(1000 + Math.random() * 9000)}`
  await runDb(
    'INSERT INTO grievances (id, center, category, status, farmer, phone, email, description, reporterType, affectedFrom, affectedUntil) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, center, category, 'open', reporterType === 'center' ? 'Center operator' : 'Farmer', phone || '', String(email || '').trim(), desc, reporterType === 'center' ? 'center' : 'farmer', affectedFrom || '', affectedUntil || '']
  )

  res.status(201).json({ id, center, category, status: 'open', farmer: reporterType === 'center' ? 'Center operator' : 'Farmer', phone: phone || '', email: String(email || '').trim(), description: desc, reporterType: reporterType === 'center' ? 'center' : 'farmer', affectedFrom: affectedFrom || '', affectedUntil: affectedUntil || '' })
})

app.get('/api/bookings', requireOfficer, async (_req, res) => {
  const rows = await allDb("SELECT b.*, a.name AS agencyName, a.region, a.crops AS agencyCrops FROM bookings b LEFT JOIN agencies a ON a.id = b.agencyId WHERE date(b.createdAt, 'localtime') = date('now', 'localtime') ORDER BY b.createdAt DESC")
  res.json(rows.map(serializeBooking))
})

app.post('/api/bookings', requireFarmer, async (req, res) => {
  const { agencyId, name, phone, email, crop, quantity, vehicle, slotTime } = req.body || {}
  if (!agencyId || !name || !phone || !quantity) {
    return res.status(400).json({ message: 'Agency, name, phone and quantity are required.' })
  }
  const bookingEmail = String(email || req.farmer?.email || '').trim()
  if (bookingEmail && !isValidEmail(bookingEmail)) {
    return res.status(400).json({ message: 'Enter a valid email address, or leave it blank.' })
  }

  const agency = await getDb('SELECT * FROM agencies WHERE id = ?', [agencyId])
  if (!agency) return res.status(404).json({ message: 'Agency not found' })
  if (req.farmer && req.farmer.id === agencyId) return res.status(403).json({ message: 'An agency cannot book a slot with its own agency listing.' })

  const token = `TKN-${agencyId.slice(-3)}-${Math.floor(1000 + Math.random() * 9000)}`
  await runDb(
    'INSERT INTO bookings (token, agencyId, farmer, phone, email, crop, quantity, vehicle, slot, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [token, agencyId, name, phone, bookingEmail, crop || '', Number(quantity), vehicle || 'Tractor-trolley', slotTime || '9:00 AM – 11:00 AM', 'pending']
  )

  res.status(201).json({ booking: { token, agencyId, agencyName: agency.name, farmer: name, phone, email: bookingEmail, crop: crop || agency.crops && JSON.parse(agency.crops)[0], quantity: Number(quantity), vehicle: vehicle || 'Tractor-trolley', slot: slotTime || '9:00 AM – 11:00 AM', status: 'pending' }, agencyName: agency.name })
})

app.patch('/api/bookings/:token/status', requireOfficer, async (req, res) => {
  const { status } = req.body || {}
  await runDb('UPDATE bookings SET status = ? WHERE token = ?', [status, req.params.token])
  const booking = await getDb('SELECT * FROM bookings WHERE token = ?', [req.params.token])
  if (!booking) return res.status(404).json({ message: 'Booking not found' })

  // Notify the farmer by email once their booking is approved (fulfilled),
  // but only to a valid address on file for that booking.
  if (status === 'fulfilled') {
    const bookingEmail = String(booking?.email || '').trim()
    if (isValidEmail(bookingEmail)) {
      sendEmail(bookingEmail, `Your Krishi Connect booking ${booking.token} is approved`, `Your booking ${booking.token} for ${booking.quantity}q of ${booking.crop || 'produce'} at slot ${booking.slot} has been approved by the officer. Please arrive with your token for pickup.`).catch((err) => console.error('Booking-approved email failed:', err))
    } else {
      console.warn(`Skipped booking-approved email for ${booking?.token}: no valid email on file.`)
    }
  }

  res.json(booking)
})

await seedDatabase()

app.listen(PORT, () => {
  console.log(`Krishi Connect backend running on http://localhost:${PORT}`)
  console.log(`Farmer portal: http://localhost:${PORT}/app`)
})
