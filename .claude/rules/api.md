# Rule: api

## When active
Any time Claude is writing or editing files in /app/api.

## Rules
- Every route checks authentication first via getServerSession
- Public routes use CRON_SECRET header protection instead
- Always validate request body before using it
- Always return: { success: true, data: ... } or { success: false, error: "..." }
- Never return stack traces to the client
- HTTP status codes must be semantically correct
- Rate limit any route that calls the Gemini API
