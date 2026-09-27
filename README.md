# PG Backup & Recovery — Frontend

A React (Vite) frontend for the FastAPI backup/recovery backend.

## Run it

```bash
npm install
npm run dev
```

Opens on http://localhost:5173. In dev, requests to `/api`, `/login`, `/signup`, `/me`
are proxied to `http://localhost:8000` (see `vite.config.js`) — start your FastAPI
backend on port 8000 first (`uvicorn main:app --reload`).

## Pointing at a deployed backend

For a production build, set the backend's real URL as an env var before building:

```bash
VITE_API_BASE_URL=https://your-backend.onrender.com npm run build
```

`npm run build` outputs static files to `dist/` — deploy that anywhere that serves
static files (Vercel, Netlify, Render static site, GitHub Pages, etc).

## What's covered

- Sign up / sign in (JWT stored in localStorage)
- Database connections: create, list, test, delete
- Storage backends: local or S3-compatible (bucket/region/keys, custom endpoint for R2/MinIO)
- Backup schedules: cron expression + retention, per connection, pause/resume
- Backups: trigger manually, list with live status, download, delete, kick off a restore
- Restore jobs: history with status, auto-refreshes while a job is pending/running

## Structure

```
src/
  api.js              -- fetch wrapper for every backend endpoint
  App.jsx             -- auth gate + sidebar nav
  StatusBadge.jsx
  pages/
    Auth.jsx
    Connections.jsx
    StorageBackends.jsx
    Schedules.jsx
    Backups.jsx
    RestoreJobs.jsx
```
