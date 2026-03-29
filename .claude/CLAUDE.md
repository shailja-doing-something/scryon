# Scryon — Project Brain

## What this project is
A fully automated, collaborative AI intelligence platform that generates
daily AI development briefs, scores them against Fello's product context,
and turns them into actionable recommendations for the Fello product team
and GTM AI team.

## Tech stack
- Framework: Next.js 14 (App Router)
- Database: SQLite via Prisma (migrate to PostgreSQL on Railway when scaling)
- AI: Google Gemini API (gemini-1.5-pro)
- AI client: /lib/gemini.ts — always import from here, never instantiate directly
- Auth: NextAuth.js
- Email: Resend
- Styling: Tailwind CSS
- Deployment: Railway

## Folder structure
/app              → Next.js App Router pages and API routes
/app/api          → All API routes including /api/cron/generate-brief
/components       → Reusable UI components
/lib              → Shared utilities, Gemini client, Prisma client
/prisma           → Schema and migrations
/.claude          → Claude Code configuration (you are here)

## Environment variables
GEMINI_API_KEY
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
RESEND_API_KEY
CRON_SECRET

## Build commands
npm run dev               → local development
npm run build             → production build
npm run lint              → ESLint
npx prisma migrate dev    → run migrations locally
npx prisma migrate deploy → run migrations in production

## Test command
npm run test

## Coding conventions
- All components: functional, TypeScript, named exports
- API routes: always validate input, always return typed JSON responses
- Database: always go through Prisma, never raw SQL
- Error handling: never swallow errors silently, always log with context
- No console.log in production code — use a logger utility
- Tailwind only for styling — no inline styles, no CSS modules
- All Gemini responses must be prompted to return raw JSON only
- Always wrap Gemini calls in try/catch with 3 retries and 2s delay

## Key files to know
/lib/gemini.ts          → Gemini client and generateContent() function
/lib/prisma.ts          → Prisma client singleton
/lib/intelligence.ts    → The full daily generation pipeline
/app/api/cron/generate-brief/route.ts → Cron endpoint
