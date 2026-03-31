import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const FELLO_CONTEXT = `Fello is the #1 AI platform for real estate and mortgage professionals that turns dormant CRM databases into active deal pipelines.

ENRICH: Automatically fills gaps in contact databases with property data, ownership history, mortgage data, and behavioural signals. Delivers personalised branded landing pages, widgets, and QR codes per contact.

AUTOMATE: AI-powered marketing engine (Fello IQ) that sends the right message to the right person at the right time. Supports email and postcard campaigns. Uses 500+ filtering parameters for hyper-targeting. Smart Send optimises email open rates with AI.

CONVERT: Lead scoring to surface who is most likely to transact. Segment Watch tracks changes in contact groups. Tracks every closing from the database — whether through the user or a competitor. Co-creates outreach with AI.

Users: Real estate agents, team leaders, brokers, mortgage professionals with large dormant databases (10,000–5,000,000 contacts).

Core value: Unlock the hidden profit in your existing database without buying new leads.

Key features:
- CRM sync with any provider
- Data enrichment (500+ parameters)
- Smart Send AI email optimisation
- Fello IQ lead scoring
- Segment Watch
- Branded landing pages per contact
- Postcard + email campaigns
- Competitor transaction tracking`;

const GTM_CONTEXT = `The GTM AI team at Fello builds internal AI-powered tools and workflows to make Fello's go-to-market motion smarter.

Responsibilities:
- Prospecting tools and outreach automation
- Demo personalisation
- Competitive intelligence gathering
- Product feedback loops
- AI-powered sales workflows
- Internal tooling for the sales and marketing team

Technical profile:
- Uses AI APIs (Gemini, Claude, OpenAI)
- Works with internal CRM data
- Builds web scrapers and data pipelines
- Deploys on Railway
- Prototypes fast — days not weeks
- Comfortable with Next.js, Python, and no-code tools

Current focus:
- Building Scryon (this platform)
- AI-powered outreach personalisation
- Automated competitive monitoring
- Lead intelligence enrichment workflows`;

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-seed-secret");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const seedUser = await prisma.user.upsert({
    where: { email: "seed@scryon.internal" },
    update: {},
    create: { email: "seed@scryon.internal", name: "Seed", role: "OWNER" },
  });

  const results: string[] = [];

  for (const [type, content] of [["FELLO", FELLO_CONTEXT], ["GTM", GTM_CONTEXT]] as const) {
    const existing = await prisma.contextDoc.findFirst({ where: { type } });
    if (existing) {
      await prisma.contextDoc.update({ where: { id: existing.id }, data: { content, updatedBy: seedUser.id } });
      results.push(`Updated ${type}`);
    } else {
      await prisma.contextDoc.create({ data: { type, content, updatedBy: seedUser.id } });
      results.push(`Created ${type}`);
    }
  }

  return Response.json({ success: true, data: results });
}
