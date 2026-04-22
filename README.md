# SmartHub — ESP32 Smart Plug Dashboard

A real-time monitoring and control dashboard for an ESP32-based smart plug, built with Next.js 15.

## Features

- **Live Monitoring** — Voltage, current, power, and energy readings with animated gauges, auto-refreshed every 2 seconds
- **Relay Control** — Toggle, force ON / force OFF the plug remotely
- **Device Status** — Online/offline indicator with last-seen timestamp and last-known state when offline
- **Automated Scheduling** — Set time-based ON/OFF schedules (IST timezone), stored in localStorage
- **History Page** — Paginated data archive (50 records per page, fetched from backend), with relay status filter and power consumption chart
- **Dark / Light Theme** — Toggle persisted via `data-theme` attribute

## Tech Stack

- [Next.js 15](https://nextjs.org) (App Router, `'use client'`)
- TypeScript
- Tailwind CSS v4
- Google Fonts — Orbitron (display) + JetBrains Mono (monospace)

## Project Structure

```
app/
├── page.tsx              # Main dashboard (status, control, gauges, scheduler)
├── layout.tsx            # Root layout with fonts and metadata
├── globals.css           # All styles — dark/light themes, components
├── history/
│   └── page.tsx          # History page with server-side pagination
└── components/
    └── ThemeToggle.tsx   # Dark/light theme toggle button
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Backend API

All requests go to `https://smarthublite.vercel.app`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/device/status?device_id=smart_plug` | Latest device status |
| `POST` | `/api/device/command` | Send relay command (`toggle` / `on` / `off`) |
| `GET` | `/api/device/history?device_id=smart_plug&page=1&limit=50` | Paginated history |

### Command body

```json
{
  "device_id": "smart_plug",
  "command": { "action": "toggle" }
}
```

### History pagination

The history page fetches 50 records per page directly from the backend using `page` and `limit` query params. The **Next** button is disabled when the backend returns fewer than 50 records (no more pages).

## Scheduling

Schedules are stored in `localStorage` under the key `smart_plug_schedules`. The scheduler checks every 30 seconds against the current IST time and fires the configured command automatically.
