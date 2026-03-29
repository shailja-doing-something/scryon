# Skills index

## intelligence-pipeline
Triggered when: working on /lib/intelligence.ts or /api/cron/generate-brief
Skill: Pipeline runs in 5 strict steps — collect, filter, generate,
save, notify. Never collapse steps. All Gemini calls use generateContent()
from /lib/gemini.ts and must include retry logic (3 attempts, 2s delay).
Always end Gemini prompts with: "Respond with valid JSON only. No markdown,
no backticks, no explanation. Just the raw JSON object."

## gemini-calls
Triggered when: writing any function that calls the Gemini API
Skill: Always import generateContent from /lib/gemini.ts. Never
instantiate GoogleGenerativeAI directly. Wrap every call in try/catch.
Parse response as JSON using JSON.parse(). If parse fails, retry.

## scoring-system
Triggered when: writing or modifying scoring logic
Skill: Scores are 1–10 per axis. Fixed formula:
(relevance × 0.35) + (deployability × 0.25) + (competitive × 0.25)
+ (costImpact × 0.15). Never change weights without updating CLAUDE.md.

## prisma-migrations
Triggered when: modifying prisma/schema.prisma
Skill: After every schema change remind user to run
npx prisma migrate dev --name <name> and npx prisma generate.
Never modify existing migration files.

## auth-check
Triggered when: writing any new API route
Skill: First line of every API route must be a session check.
If no session, return 401 immediately. No logic runs before auth.
