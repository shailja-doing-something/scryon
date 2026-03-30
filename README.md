# Scryon — AI Intelligence Platform

Fully automated, collaborative AI intelligence platform that generates daily AI development briefs, scores them against Fello's product context, and turns them into actionable recommendations for the Fello product team and GTM AI team.

## Environment Variables

```env
GEMINI_API_KEY=          # Google Gemini API key
DATABASE_URL=            # SQLite: file:./dev.db — PostgreSQL on Railway: postgresql://...
NEXTAUTH_SECRET=         # Random secret for JWT (run: openssl rand -base64 32)
NEXTAUTH_URL=            # Full URL of your deployed app (e.g. https://scryon.railway.app)
RESEND_API_KEY=          # Resend API key for email
CRON_SECRET=             # Secret for protecting the cron endpoint (run: openssl rand -base64 32)
SERP_API_KEY=            # (Optional) SerpAPI key for web search in brief generation
```

## Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Fill in your API keys in .env

# Run migrations
npx prisma migrate dev --name init

# Seed Fello & GTM context
npm run seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your email.
The first user automatically becomes OWNER.

## Railway Deployment

1. Create a new Railway project
2. Connect your GitHub repo
3. Add a PostgreSQL service (Railway will set `DATABASE_URL` automatically)
4. Set all environment variables in Railway's variable panel
5. Update `NEXTAUTH_URL` to your Railway public domain
6. Deploy — Railway runs `npx prisma migrate deploy` on startup

### Railway Cron

The `railway.json` includes a cron that hits `/api/cron/generate-brief` daily at 8am ET.
Protect it with the `CRON_SECRET` env var.

To trigger manually:
```bash
curl -X POST https://your-app.railway.app/api/cron/generate-brief \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"focusArea": "real estate AI"}'
```

## Migrating to PostgreSQL (Railway)

Railway provides a hosted PostgreSQL service. When you add it to your project:

1. Update your Prisma schema datasource from `sqlite` to `postgresql`
2. Run `npx prisma migrate deploy` on Railway
3. Run `npm run seed` to seed the Fello & GTM context

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database | SQLite (dev) / PostgreSQL (prod) via Prisma 7 |
| AI | Google Gemini 1.5 Pro |
| Auth | NextAuth.js 4 |
| Email | Resend |
| Drag & Drop | @hello-pangea/dnd |
| Styling | Tailwind CSS 4 |
| Deployment | Railway |

## Architecture

```
/app
  /(app)          — Authenticated app pages (protected by layout.tsx)
    /dashboard    — Today's brief with all developments
    /tracker      — Kanban board for idea tracking
    /archive      — Historical briefs
    /patterns     — Recurring AI theme detection
    /sources      — RSS/GitHub/Telegram source management
    /context      — Fello & GTM context editor
    /team         — Team management & activity feed
    /settings     — Per-user preferences
  /api
    /auth         — NextAuth endpoints
    /cron         — /generate-brief cron endpoint
    /briefs       — Brief CRUD
    /sources      — Source management
    /context      — Context doc management
    /team         — Team management
    /ideas/[id]   — Idea status updates
    /developments — Comments & upvotes
    /notifications — In-app notifications
    /settings     — User settings
    /export/pdf   — Brief export
/lib
  /gemini.ts      — Gemini client (single import point for all AI calls)
  /prisma.ts      — Prisma singleton
  /intelligence.ts — Full 5-step generation pipeline
  /auth.ts        — NextAuth configuration
  /formatter.ts   — Slack/email message formatter
  /logger.ts      — Structured logging utility
/prisma
  /schema.prisma  — Database schema
  /seed.ts        — Seeds Fello & GTM context docs
```

## Intelligence Pipeline

The `/api/cron/generate-brief` endpoint runs a 5-step pipeline:

1. **Collect** — Web searches + active RSS/GitHub/Telegram sources → 30–50 candidates
2. **Filter** — Gemini ranks and selects top 10 by (relevance × 0.35) + (deployability × 0.25) + (competitive × 0.25) + (cost × 0.15)
3. **Generate** — Per-development recommendations: fit in Fello, which team, 3 immediate ideas, 2 strategic bets, 1 wild idea, prototype suggestion, ignore consequence
4. **Save** — Writes Brief, Developments, and Ideas to database
5. **Notify** — Creates in-app notifications for all users; sends email digest via Resend
