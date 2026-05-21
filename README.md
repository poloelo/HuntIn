# TalentRadar — LinkedIn Talent Sourcing Tool

A full-stack recruiter tool that auto-searches LinkedIn for top candidates and ranks them using Claude AI.

## Tech Stack
- **Frontend**: React 18 + custom CSS (dark theme)
- **Backend**: Node.js + Express
- **Database**: SQLite via better-sqlite3
- **AI**: Anthropic Claude (`claude-sonnet-4-20250514`) for profile scoring
- **Scraper**: Puppeteer for live LinkedIn scraping

## Features
- Job position form with skills tag input
- LinkedIn People Search auto-query generation
- AI-powered candidate scoring (0–100) with explanations
- Results dashboard with filter/sort
- Search history with rerun capability
- CSV export
- Demo mode (no LinkedIn login needed)

## Setup

### 1. Clone and install
```bash
git clone <repo>
cd HuntIn
npm run install:all
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

`.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

### 3. Run in development
```bash
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:3000

## Usage

### Demo Mode (recommended to start)
1. Open http://localhost:3000
2. Fill in the job form (company, title, required skills)
3. Keep **Demo Mode ON** to use generated profiles
4. Click "Search LinkedIn"
5. Watch the real-time progress as Claude scores each candidate
6. Filter, sort, and export results as CSV

### Live LinkedIn Mode
Live scraping works best with a LinkedIn session cookie.

1. Log in to LinkedIn in Chrome
2. Copy your `li_at` cookie value from DevTools → Application → Cookies
3. Add to `.env`:
   ```
   LINKEDIN_COOKIE=AQE...your_li_at_value
   ```
4. Toggle **Demo Mode OFF** in the form

Note: LinkedIn may rate-limit or block automated access. The app automatically falls back to demo mode if scraping fails.

## Project Structure
```
/client          React frontend
  /src
    /components  TagInput, CandidateCard
    /pages       NewSearch, Results, History
/server
  /ai            Claude scoring (scorer.js)
  /db            SQLite schema & connection
  /routes        Express API routes
  /scraper       Puppeteer LinkedIn scraper
  index.js       Express server entry
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/searches | Create & start a new search |
| GET | /api/searches | List all past searches |
| GET | /api/searches/:id | Get search + ranked candidates |
| GET | /api/searches/:id/progress | SSE stream for live progress |
| POST | /api/searches/:id/rerun | Rerun a search |
| DELETE | /api/searches/:id | Delete a search |
| GET | /api/searches/:id/export | Download candidates as CSV |
