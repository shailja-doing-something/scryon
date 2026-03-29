# Rule: frontend

## When active
Any time Claude is writing or editing files in /app or /components.

## Rules
- Tailwind utility classes only — no inline styles
- All components must be TypeScript with explicit prop types
- Use Next.js App Router conventions
- Client components must have "use client" at top — only when
  using hooks or browser APIs
- Never fetch data in a client component
- Split any component over 150 lines into smaller ones
- Loading and error states required for every data-fetching component
