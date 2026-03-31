/**
 * One-time script: delete all ideas and their activities, then
 * delete all briefs/developments so a clean brief can be generated.
 *
 * Run with:
 *   DATABASE_URL="<your-railway-url>" npx tsx scripts/clear-ideas.ts
 */
import { prisma } from "../lib/prisma";

async function main() {
  const activities = await prisma.ideaActivity.deleteMany({});
  console.log(`Deleted ${activities.count} idea activities`);

  const ideas = await prisma.idea.deleteMany({});
  console.log(`Deleted ${ideas.count} ideas`);

  console.log("Done. Regenerate a brief from the dashboard.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
