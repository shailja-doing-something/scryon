import { prisma } from "@/lib/prisma";
import { generateContent } from "@/lib/gemini";
import { logger } from "@/lib/logger";
import { sendBriefDigest } from "@/lib/email";

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

interface IdeaItem {
  type: "IMMEDIATE" | "STRATEGIC" | "WILD";
  title: string;
  description: string;
  timing?: string;
}

interface GeneratedRecommendation {
  fitInFello: string;
  whichTeam: string;
  ideas: IdeaItem[];
  prototypeThis: string;
  ignoreConsequence: string;
  whyNow: string;
}

interface TopAction {
  action: string;
  timeEstimate: string;
  developmentTitle: string;
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

// STEP 3: Generate all recommendations in ONE Gemini call to conserve quota
async function generateAllRecommendations(
  devs: FilteredDevelopment[],
  fellaContext: string,
  gtmContext: string
): Promise<GeneratedRecommendation[]> {
  const devList = devs
    .map(
      (d, i) =>
        `DEVELOPMENT ${i + 1}:\nTitle: ${d.title}\nSummary: ${d.summary}\nSource: ${d.url}`
    )
    .join("\n\n");

  const prompt = `You are Scryon, Fello's senior AI strategist. Analyse each AI development below through the lens of Fello's product and GTM team.

FELLO CONTEXT:
${fellaContext}

GTM AI TEAM CONTEXT:
${gtmContext}

DEVELOPMENTS TO ANALYSE:
${devList}

Return a JSON array with one object per development, in the same order. Each object must have exactly these fields:
{
  "fitInFello": "Paragraph naming Fello feature, user type, and workflow this touches",
  "whichTeam": "Product",
  "ideas": [
    { "type": "IMMEDIATE", "title": "Short action title", "description": "What to build, under 30 days" },
    { "type": "IMMEDIATE", "title": "Short action title", "description": "What to build, under 30 days" },
    { "type": "IMMEDIATE", "title": "Short action title", "description": "What to build, under 30 days" },
    { "type": "STRATEGIC", "title": "Short bet title", "description": "Higher upside play", "timing": "Q3 2026" },
    { "type": "STRATEGIC", "title": "Short bet title", "description": "Higher upside play", "timing": "Q4 2026" },
    { "type": "WILD", "title": "Creative title", "description": "Unexpected 2-sentence pitch" }
  ],
  "prototypeThis": "One concrete thing to build this week with named tools and expected output",
  "ignoreConsequence": "Realistic consequence if ignored — who benefits, what is ceded",
  "whyNow": "One sentence under 20 words — reference what threshold was just crossed, what just became available, or what window is opening right now"
}

Rules:
- Return a JSON array of ${devs.length} objects, one per development, in order
- "whichTeam" must be exactly one of: "Product", "GTM AI", "Both", "Leadership"
- "ideas" must contain exactly 6 items: 3 IMMEDIATE, 2 STRATEGIC, 1 WILD — in that order
- Every idea must have non-empty "title" and "description"
- "whyNow" must be under 20 words, specific to today — not general background
- Respond with valid JSON only. No markdown, no backticks, no explanation.`;

  const raw = await generateContent(prompt);
  logger.info("Raw batch recommendation JSON (first 1000 chars)", { raw: raw.slice(0, 1000) });

  let parsedArray: Record<string, unknown>[];
  try {
    parsedArray = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsedArray)) throw new Error("Not an array");
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Failed to parse batch recommendation — no JSON array found");
    parsedArray = JSON.parse(match[0]) as Record<string, unknown>[];
  }

  return parsedArray.map((parsed, idx) => {
    const ideasRaw = extractArray(parsed, "ideas", "recommendations", "actionItems", "action_items");

    const ideas: IdeaItem[] = [];
    for (const item of ideasRaw) {
      const type = extractString(item, "type").toUpperCase();
      if (type !== "IMMEDIATE" && type !== "STRATEGIC" && type !== "WILD") continue;
      const timing = extractString(item, "timing", "timeframe", "time_frame", "horizon");
      ideas.push({
        type,
        title: extractIdeaTitle(item),
        description: extractIdeaDescription(item),
        ...(timing ? { timing } : {}),
      });
    }

    logger.info("Parsed ideas for development", {
      index: idx,
      title: devs[idx]?.title,
      ideasCount: ideas.length,
      types: ideas.map((i) => i.type),
    });

    return {
      fitInFello: extractString(parsed, "fitInFello", "fit_in_fello", "fitFello", "fit"),
      whichTeam: extractString(parsed, "whichTeam", "which_team", "team"),
      ideas,
      prototypeThis: extractString(parsed, "prototypeThis", "prototype_this", "prototype", "buildThis", "build_this"),
      ignoreConsequence: extractString(
        parsed,
        "ignoreConsequence",
        "ignore_consequence",
        "consequence",
        "ignoringConsequence",
        "risk"
      ),
      whyNow: extractString(parsed, "whyNow", "why_now", "whynow", "urgency", "timing"),
    };
  });
}

// STEP 3.5: Generate top 3 actions for today
async function generateTopActions(
  briefId: string,
  developments: FilteredDevelopment[],
  recommendations: GeneratedRecommendation[]
): Promise<void> {
  const devSummary = developments
    .slice(0, 6)
    .map((d, i) => {
      const rec = recommendations[i];
      const firstImmediate = rec?.ideas.find((idea) => idea.type === "IMMEDIATE");
      return `${i + 1}. ${d.title}\n   Fello fit: ${rec?.fitInFello?.slice(0, 120) ?? ""}\n   Top immediate idea: ${firstImmediate?.title ?? ""}`;
    })
    .join("\n\n");

  const prompt = `You are a decisive GTM AI team lead at Fello. Based on today's AI developments and recommendations, generate exactly 3 concrete actions the team should take TODAY or THIS WEEK.

Rules:
- Each action must be specific and executable
- Include a time estimate in brackets (2-hour spike, 1-day analysis, 1-week build, etc.)
- Actions must connect directly to a development from today's brief
- Prioritise actions that touch Fello's core product (Enrich, Automate, Convert) or the GTM AI team's existing agents
- Do not suggest vague things like 'explore' or 'consider' — say exactly what to build or test
- Start each action with a verb: Test, Build, Compare, Prototype, Integrate, Replace, Audit

Today's developments:
${devSummary}

Return as JSON:
{
  "actions": [
    {
      "action": "Test Gemma 4 for Fello Author",
      "timeEstimate": "2-day spike",
      "developmentTitle": "Google releases Gemma 4"
    }
  ]
}

Respond with valid JSON only. No markdown.`;

  try {
    const raw = await generateContent(prompt);
    let parsed: { actions: TopAction[] };
    try {
      parsed = JSON.parse(raw) as { actions: TopAction[] };
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON object found in topActions response");
      parsed = JSON.parse(match[0]) as { actions: TopAction[] };
    }

    if (!Array.isArray(parsed.actions)) throw new Error("topActions.actions is not an array");

    await prisma.brief.update({
      where: { id: briefId },
      data: { topActions: JSON.stringify(parsed) },
    });

    logger.info("Top actions saved", { briefId, count: parsed.actions.length });
  } catch (err) {
    logger.error("generateTopActions failed", { briefId, error: String(err) });
  }
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
            whyNow: rec.whyNow || null,
          },
        });

        // Save all ideas — stored as "title\ndescription", type comes directly from each item
        for (const idea of rec.ideas ?? []) {
          const title = idea.title?.trim() ?? "";
          const descParts = [idea.description?.trim(), idea.timing?.trim()].filter(Boolean);
          const description = descParts.join(" — ");
          if (!title && !description) continue;
          await prisma.idea.create({
            data: {
              developmentId: development.id,
              type: idea.type,
              text: title ? `${title}\n${description}` : description,
              status: "GENERATED",
            },
          });
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

// STEP 5: Notify users + send email digest
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

  try {
    const result = await sendBriefDigest(briefId);
    if (result.skipped) {
      logger.info("Email digest skipped", { reason: result.skipped, briefId });
    } else if (result.success) {
      logger.info("Email digest sent", { emailId: result.id, briefId });
    } else {
      logger.error("Email digest failed", { error: result.error, briefId });
    }
  } catch (err) {
    logger.error("Email digest threw", { error: String(err), briefId });
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

    // Step 3: Generate all recommendations in a single Gemini call (conserves quota)
    let recommendations: GeneratedRecommendation[];
    try {
      recommendations = await generateAllRecommendations(topDevelopments, fellaContext, gtmContext);
      // Pad with empty fallbacks if Gemini returned fewer objects than developments
      while (recommendations.length < topDevelopments.length) {
        recommendations.push({ fitInFello: "", whichTeam: "", ideas: [], prototypeThis: "", ignoreConsequence: "", whyNow: "" });
      }
    } catch (err) {
      logger.error("Batch recommendation generation failed", { error: String(err) });
      recommendations = topDevelopments.map(() => ({
        fitInFello: "", whichTeam: "", ideas: [], prototypeThis: "", ignoreConsequence: "", whyNow: "",
      }));
    }

    // Step 3.5: Generate top actions (separate Gemini call, fire before save)
    void generateTopActions(brief.id, topDevelopments, recommendations);

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
