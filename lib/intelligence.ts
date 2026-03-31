import { prisma } from "@/lib/prisma";
import { generateContent } from "@/lib/gemini";
import { logger } from "@/lib/logger";

interface RawCandidate {
  title: string;
  summary: string;
  url: string;
  source: string;
}

interface FilteredDevelopment {
  rank: number;
  title: string;
  summary: string;
  url: string;
  scores: {
    relevance: number;
    deployability: number;
    competitive: number;
    costImpact: number;
    weighted: number;
  };
}

interface GeneratedRecommendation {
  fitInFello: string;
  whichTeam: string;
  immediateCases: { title: string; description: string }[];
  strategicBets: { title: string; description: string; timing: string }[];
  wildIdea: { title: string; description: string };
  prototypeThis: string;
  ignoreConsequence: string;
}

// Robust field extractors to handle camelCase and snake_case from Gemini
function extractString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function extractArray(obj: Record<string, unknown>, ...keys: string[]): Record<string, unknown>[] {
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) return val as Record<string, unknown>[];
  }
  return [];
}

function extractObject(obj: Record<string, unknown>, ...keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const val = obj[key];
    if (val && typeof val === "object" && !Array.isArray(val)) return val as Record<string, unknown>;
  }
  return null;
}

function extractIdeaTitle(idea: Record<string, unknown>): string {
  return extractString(idea, "title", "name", "heading", "action", "idea", "label");
}

function extractIdeaDescription(idea: Record<string, unknown>): string {
  return extractString(idea, "description", "desc", "details", "body", "summary", "text", "content");
}

// STEP 1: Collect raw AI news from web searches
async function collectSources(focusArea: string): Promise<RawCandidate[]> {
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const queries = [
    `AI model releases ${today}`,
    `AI research breakthroughs ${today}`,
    `open source AI releases ${today}`,
    `AI product launches ${today}`,
    `AI developer tools ${today}`,
    ...(focusArea ? [`${focusArea} AI ${today}`] : []),
  ];

  const candidates: RawCandidate[] = [];

  for (const query of queries) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://serpapi.com/search.json?q=${encodedQuery}&api_key=${process.env.SERP_API_KEY}&num=10`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (response.ok) {
        const data = (await response.json()) as {
          organic_results?: { title: string; snippet: string; link: string }[];
        };
        const results = data.organic_results ?? [];
        for (const r of results) {
          candidates.push({
            title: r.title ?? "",
            summary: r.snippet ?? "",
            url: r.link ?? "",
            source: "web",
          });
        }
      }
    } catch (error) {
      logger.warn("Web search failed for query", { query, error: String(error) });
    }
  }

  // Fetch active RSS/GitHub/Telegram sources from DB
  try {
    const sources = await prisma.source.findMany({ where: { active: true } });
    for (const src of sources) {
      try {
        const res = await fetch(src.url, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const text = await res.text();
          // Simple title extraction from RSS/HTML
          const titleMatches = text.match(/<title[^>]*>([^<]+)<\/title>/gi) ?? [];
          for (const match of titleMatches.slice(0, 5)) {
            const title = match.replace(/<[^>]+>/g, "").trim();
            if (title && title.length > 10) {
              candidates.push({ title, summary: "", url: src.url, source: src.label });
            }
          }
        }
        await prisma.source.update({
          where: { id: src.id },
          data: { lastFetched: new Date() },
        });
      } catch (err) {
        logger.warn("Source fetch failed", { url: src.url, error: String(err) });
      }
    }
  } catch (err) {
    logger.error("Failed to fetch sources from DB", { error: String(err) });
  }

  // Deduplicate by title
  const seen = new Set<string>();
  const deduped = candidates.filter((c) => {
    const key = c.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  logger.info("Collected raw candidates", { count: deduped.length });
  return deduped.slice(0, 50);
}

// STEP 2: Filter to top 10 most significant
async function filterDevelopments(
  candidates: RawCandidate[]
): Promise<FilteredDevelopment[]> {
  const candidateList = candidates
    .map((c, i) => `${i + 1}. Title: ${c.title}\n   Summary: ${c.summary}\n   URL: ${c.url}`)
    .join("\n\n");

  const prompt = `You are a ruthless AI signal filter. From these candidates, identify the 10 most significant AI developments of today.
Reject: repackaged old news, vague announcements, incremental updates, pure marketing.

Score each on 4 axes (1–10):
1. relevance: touches database marketing, CRM enrichment, AI nurture, lead scoring, or personalisation at scale
2. deployability: can a team prototype this within 30 days
3. competitive: upside if Fello moves first
4. costImpact: 10 = free and high impact, 1 = expensive and marginal

Weighted total = (relevance×0.35)+(deployability×0.25)+(competitive×0.25)+(costImpact×0.15)

Candidates:
${candidateList}

Return top 10 ranked by weighted total as a JSON array with this shape:
[{
  "rank": 1,
  "title": "...",
  "summary": "...",
  "url": "...",
  "scores": {
    "relevance": 8,
    "deployability": 7,
    "competitive": 9,
    "costImpact": 6,
    "weighted": 7.85
  }
}]

Respond with valid JSON only. No markdown, no backticks, no explanation. Just the raw JSON object.`;

  const raw = await generateContent(prompt);

  let parsed: FilteredDevelopment[];
  try {
    parsed = JSON.parse(raw) as FilteredDevelopment[];
  } catch {
    // Try to extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Failed to parse filter response");
    parsed = JSON.parse(match[0]) as FilteredDevelopment[];
  }

  return parsed.slice(0, 10);
}

// STEP 3: Generate per-development recommendations
async function generateRecommendation(
  dev: FilteredDevelopment,
  fellaContext: string,
  gtmContext: string
): Promise<GeneratedRecommendation> {
  const prompt = `You are Scryon, Fello's senior AI strategist. Analyse this AI development through the lens of Fello's product and GTM team.

FELLO CONTEXT:
${fellaContext}

GTM AI TEAM CONTEXT:
${gtmContext}

AI DEVELOPMENT TO ANALYSE:
Title: ${dev.title}
Summary: ${dev.summary}
Source: ${dev.url}

Generate a structured analysis with these exact fields:
1. fitInFello: A specific paragraph naming the Fello feature, user type, and workflow this touches
2. whichTeam: One of "Product" | "GTM AI" | "Both" | "Leadership" — plus one sentence why
3. immediateCases: Array of 3 objects with {title, description} — low effort, under 30 days each
4. strategicBets: Array of 2 objects with {title, description, timing} — higher upside, longer horizon
5. wildIdea: Object with {title, description} — creative, unexpected 2-sentence pitch
6. prototypeThis: One concrete thing to build this week. Name tools, data source, expected output
7. ignoreConsequence: Realistic competitive consequence if ignored. Who benefits. What is ceded.

Respond with valid JSON only. No markdown, no backticks, no explanation. Just the raw JSON object.`;

  const raw = await generateContent(prompt);
  logger.info("Raw recommendation JSON", { title: dev.title, raw: raw.slice(0, 500) });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Failed to parse recommendation");
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  }

  // Robust extraction handling both camelCase and snake_case field names
  const immediateCasesRaw = extractArray(
    parsed,
    "immediateCases",
    "immediate_cases",
    "immediates",
    "immediate",
    "immediateIdeas",
    "immediate_ideas"
  );

  const strategicBetsRaw = extractArray(
    parsed,
    "strategicBets",
    "strategic_bets",
    "strategic",
    "strategicIdeas",
    "strategic_ideas",
    "bets"
  );

  const wildIdeaRaw = extractObject(
    parsed,
    "wildIdea",
    "wild_idea",
    "wild",
    "wildcard",
    "wildcardIdea",
    "wildcard_idea"
  );

  logger.info("Parsed recommendation fields", {
    title: dev.title,
    immediateCasesCount: immediateCasesRaw.length,
    strategicBetsCount: strategicBetsRaw.length,
    hasWildIdea: !!wildIdeaRaw,
  });

  return {
    fitInFello: extractString(parsed, "fitInFello", "fit_in_fello", "fitFello", "fit"),
    whichTeam: extractString(parsed, "whichTeam", "which_team", "team"),
    immediateCases: immediateCasesRaw.map((idea) => ({
      title: extractIdeaTitle(idea),
      description: extractIdeaDescription(idea),
    })),
    strategicBets: strategicBetsRaw.map((bet) => ({
      title: extractIdeaTitle(bet),
      description: extractIdeaDescription(bet),
      timing: extractString(bet, "timing", "timeframe", "time_frame", "horizon"),
    })),
    wildIdea: wildIdeaRaw
      ? {
          title: extractIdeaTitle(wildIdeaRaw),
          description: extractIdeaDescription(wildIdeaRaw),
        }
      : { title: "", description: "" },
    prototypeThis: extractString(parsed, "prototypeThis", "prototype_this", "prototype", "buildThis", "build_this"),
    ignoreConsequence: extractString(
      parsed,
      "ignoreConsequence",
      "ignore_consequence",
      "consequence",
      "ignoringConsequence",
      "risk"
    ),
  };
}

// STEP 4: Save to database
async function saveBrief(
  briefId: string,
  developments: FilteredDevelopment[],
  recommendations: GeneratedRecommendation[],
  rawSources: RawCandidate[]
) {
  try {
    await prisma.brief.update({
      where: { id: briefId },
      data: {
        rawSources: JSON.stringify(rawSources),
        status: "READY",
        generatedAt: new Date(),
      },
    });

    for (let i = 0; i < developments.length; i++) {
      const dev = developments[i];
      const rec = recommendations[i];
      if (!dev || !rec) continue;

      try {
        const development = await prisma.development.create({
          data: {
            briefId,
            title: dev.title,
            summary: dev.summary,
            sourceUrl: dev.url ?? "",
            scores: JSON.stringify(dev.scores),
            rank: dev.rank ?? i + 1,
            whichTeam: rec.whichTeam ?? "",
            fitInFello: rec.fitInFello ?? "",
            prototypeThis: rec.prototypeThis ?? "",
            ignoreConsequence: rec.ignoreConsequence ?? "",
          },
        });

        // Save immediate ideas — title and description stored as "title\ndescription"
        for (const idea of rec.immediateCases ?? []) {
          const title = idea.title?.trim() ?? "";
          const description = idea.description?.trim() ?? "";
          if (!title && !description) continue;
          await prisma.idea.create({
            data: {
              developmentId: development.id,
              type: "IMMEDIATE",
              text: title ? `${title}\n${description}` : description,
              status: "GENERATED",
            },
          });
        }

        // Save strategic bets
        for (const bet of rec.strategicBets ?? []) {
          const title = bet.title?.trim() ?? "";
          const description = [bet.description?.trim(), bet.timing?.trim()]
            .filter(Boolean)
            .join(" — ");
          if (!title && !description) continue;
          await prisma.idea.create({
            data: {
              developmentId: development.id,
              type: "STRATEGIC",
              text: title ? `${title}\n${description}` : description,
              status: "GENERATED",
            },
          });
        }

        // Save wild idea
        if (rec.wildIdea) {
          const title = rec.wildIdea.title?.trim() ?? "";
          const description = rec.wildIdea.description?.trim() ?? "";
          if (title || description) {
            await prisma.idea.create({
              data: {
                developmentId: development.id,
                type: "WILD",
                text: title ? `${title}\n${description}` : description,
                status: "GENERATED",
              },
            });
          }
        }
      } catch (err) {
        logger.error("Failed to save development", { title: dev.title, error: String(err) });
      }
    }
  } catch (err) {
    logger.error("Failed to save brief", { briefId, error: String(err) });
    throw err;
  }
}

// STEP 5: Notify users
async function notifyUsers(briefId: string) {
  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: "BRIEF_READY",
        message: "Your daily AI intelligence brief is ready.",
        read: false,
      })),
    });
    logger.info("Notifications created", { count: users.length, briefId });
  } catch (err) {
    logger.error("Failed to create notifications", { error: String(err) });
  }
}

async function updatePatterns(briefId: string, developments: FilteredDevelopment[]) {
  try {
    // Extract themes from development titles
    const themes = developments.map((d) => {
      const words = d.title.toLowerCase().split(/\s+/);
      return words.filter((w) => w.length > 4).slice(0, 3).join(" ");
    });

    for (const theme of themes) {
      const existing = await prisma.pattern.findFirst({ where: { theme } });
      if (existing) {
        await prisma.pattern.update({
          where: { id: existing.id },
          data: { frequency: { increment: 1 } },
        });
        // Link brief to pattern if not already linked
        await prisma.patternBrief.upsert({
          where: { patternId_briefId: { patternId: existing.id, briefId } },
          update: {},
          create: { patternId: existing.id, briefId },
        });
      } else {
        const pattern = await prisma.pattern.create({
          data: { theme, frequency: 1 },
        });
        await prisma.patternBrief.create({
          data: { patternId: pattern.id, briefId },
        });
      }
    }
  } catch (err) {
    logger.error("Failed to update patterns", { error: String(err) });
  }
}

// Main pipeline
export async function runDailyBrief(focusArea = ""): Promise<string> {
  // Create a pending brief first
  const brief = await prisma.brief.create({
    data: { focusArea, status: "PENDING" },
  });

  logger.info("Starting daily brief generation", { briefId: brief.id });

  try {
    // Load Fello + GTM context from DB
    const [fellaDoc, gtmDoc] = await Promise.all([
      prisma.contextDoc.findFirst({ where: { type: "FELLO" } }),
      prisma.contextDoc.findFirst({ where: { type: "GTM" } }),
    ]);

    const fellaContext = fellaDoc?.content ?? DEFAULT_FELLO_CONTEXT;
    const gtmContext = gtmDoc?.content ?? DEFAULT_GTM_CONTEXT;

    // Step 1: Collect
    const candidates = await collectSources(focusArea);

    if (candidates.length === 0) {
      logger.warn("No candidates collected — using fallback");
      await prisma.brief.update({
        where: { id: brief.id },
        data: { status: "FAILED" },
      });
      return brief.id;
    }

    // Step 2: Filter
    const topDevelopments = await filterDevelopments(candidates);

    // Step 3: Generate recommendations (sequential to respect API limits)
    const recommendations: GeneratedRecommendation[] = [];
    for (const dev of topDevelopments) {
      try {
        const rec = await generateRecommendation(dev, fellaContext, gtmContext);
        recommendations.push(rec);
      } catch (err) {
        logger.error("Recommendation generation failed", { title: dev.title, error: String(err) });
        recommendations.push({
          fitInFello: "",
          whichTeam: "",
          immediateCases: [],
          strategicBets: [],
          wildIdea: { title: "", description: "" },
          prototypeThis: "",
          ignoreConsequence: "",
        });
      }
    }

    // Step 4: Save
    await saveBrief(brief.id, topDevelopments, recommendations, candidates);

    // Step 5: Notify + patterns (fire and forget)
    void notifyUsers(brief.id);
    void updatePatterns(brief.id, topDevelopments);

    logger.info("Brief generation complete", { briefId: brief.id, developments: topDevelopments.length });
    return brief.id;
  } catch (err) {
    logger.error("Brief generation failed", { briefId: brief.id, error: String(err) });
    await prisma.brief.update({
      where: { id: brief.id },
      data: { status: "FAILED" },
    }).catch(() => {});
    throw err;
  }
}

const DEFAULT_FELLO_CONTEXT = `Fello is the #1 AI platform for real estate and mortgage professionals that turns dormant CRM databases into active deal pipelines.

ENRICH: Fills gaps in contact databases with property data, ownership history, mortgage data, and behavioural signals. Delivers personalised branded landing pages, widgets, and QR codes per contact.

AUTOMATE: AI-powered marketing engine (Fello IQ) that sends the right message to the right person at the right time. Supports email and postcard campaigns. Uses 500+ filtering parameters for hyper-targeting. Smart Send optimises email open rates with AI.

CONVERT: Lead scoring to surface who is most likely to transact. Segment Watch tracks changes in contact groups. Tracks every closing from the database — whether through the user or a competitor. Co-creates outreach with AI.

Users: Real estate agents, team leaders, brokers, mortgage professionals with large dormant databases (10k–5M contacts).

Core value: Unlock the hidden profit in your existing database.`;

const DEFAULT_GTM_CONTEXT = `The GTM AI team at Fello builds internal AI-powered tools and workflows to make Fello's go-to-market motion smarter — prospecting tools, outreach automation, demo personalisation, competitive intelligence, and product feedback loops. They use AI APIs, internal CRM data, and web scraping. They prototype fast — days, not weeks.`;
