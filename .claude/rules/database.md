# Rule: database

## When active
Any time Claude is writing or editing files that touch the database.

## Rules
- Always use Prisma — never write raw SQL
- Never call PrismaClient directly — always import from /lib/prisma.ts
- Every database write must be wrapped in try/catch
- Never expose full database objects to the client — select only
  needed fields
- Never edit existing migration files — always create new ones
- Seeding goes in /prisma/seed.ts only
