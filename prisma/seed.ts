import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const FELLO_CONTEXT = `Fello is the #1 AI platform for real estate and mortgage professionals that turns dormant CRM databases into active deal pipelines.

ENRICH: Fills gaps in contact databases with property data, ownership history, mortgage data, and behavioural signals. Delivers personalised branded landing pages, widgets, and QR codes per contact.

AUTOMATE: AI-powered marketing engine (Fello IQ) that sends the right message to the right person at the right time. Supports email and postcard campaigns. Uses 500+ filtering parameters for hyper-targeting. Smart Send optimises email open rates with AI.

CONVERT: Lead scoring to surface who is most likely to transact. Segment Watch tracks changes in contact groups. Tracks every closing from the database — whether through the user or a competitor. Co-creates outreach with AI.

Users: Real estate agents, team leaders, brokers, mortgage professionals with large dormant databases (10k–5M contacts).

Core value: Unlock the hidden profit in your existing database.`;

const GTM_CONTEXT = `The GTM AI team at Fello builds internal AI-powered tools and workflows to make Fello's go-to-market motion smarter — prospecting tools, outreach automation, demo personalisation, competitive intelligence, and product feedback loops. They use AI APIs, internal CRM data, and web scraping. They prototype fast — days, not weeks.`;

async function main() {
  console.log("Seeding context documents…");

  const seedUser = await prisma.user.upsert({
    where: { email: "seed@scryon.internal" },
    update: {},
    create: {
      email: "seed@scryon.internal",
      name: "Seed",
      role: "OWNER",
    },
  });

  const existingFello = await prisma.contextDoc.findFirst({ where: { type: "FELLO" } });
  if (existingFello) {
    await prisma.contextDoc.update({
      where: { id: existingFello.id },
      data: { content: FELLO_CONTEXT, updatedBy: seedUser.id },
    });
    console.log("Updated FELLO context");
  } else {
    await prisma.contextDoc.create({
      data: { type: "FELLO", content: FELLO_CONTEXT, updatedBy: seedUser.id },
    });
    console.log("Created FELLO context");
  }

  const existingGtm = await prisma.contextDoc.findFirst({ where: { type: "GTM" } });
  if (existingGtm) {
    await prisma.contextDoc.update({
      where: { id: existingGtm.id },
      data: { content: GTM_CONTEXT, updatedBy: seedUser.id },
    });
    console.log("Updated GTM context");
  } else {
    await prisma.contextDoc.create({
      data: { type: "GTM", content: GTM_CONTEXT, updatedBy: seedUser.id },
    });
    console.log("Created GTM context");
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
