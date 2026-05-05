# Wedding Website

A modern, mobile-first wedding invitation website with RSVP via Google Sheets.

## Features

- Responsive design (Bootstrap 5) — optimized for mobile
- RSVP form → Google Sheets (serverless, free)
- Anti-spam: honeypot field + optional reCAPTCHA v3
- Guest personalization via URL (`?to=GuestName`)
- Photo gallery with lazy loading and lightbox
- Background music with play/pause
- Countdown timer
- Add to Calendar (Google, Apple, Outlook, Yahoo)
- Light/dark/auto theme
- Offline detection
- AOS scroll animations + confetti effects
- i18n support (zh-TW, English, and more)

## Quick Start

```bash
npm install
npm run dev        # http://localhost:8080
npm run build      # Production build → dist/
```

## Customization

1. Edit `index.html` — replace all `TODO` placeholders with your wedding details
2. Replace images in `assets/images/` with your photos
3. Replace `assets/music/` with your background music
4. Set up Google Sheets RSVP (see below)
5. Push to GitHub → auto-deploys via GitHub Actions

## Google Sheets RSVP Setup

1. Create a new Google Sheet with columns: `Timestamp | Name | Email | Attendance | Guest Count | Message`
2. Open **Extensions > Apps Script**
3. Paste the code from `docs/google-apps-script.js`
4. **Deploy > New deployment > Web app** (Execute as: Me, Access: Anyone)
5. Copy the web app URL → set as `data-rsvp-url` in `index.html`

## Deployment

Pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/deploy.yml`.

## Based On

[dewanakl/undangan](https://github.com/dewanakl/undangan) — MIT License
