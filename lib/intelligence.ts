import { Resend } from "resend";
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

interface BriefForEmail {
  id: string;
  date: Date;
  topActions: string | null;
}

interface DevelopmentForEmail {
  rank: number;
  title: string;
  scores: string;
  whyNow: string | null;
  fitInFello: string;
  ideas: { id: string }[];
}

// Normalise whichTeam to one of the four canonical values
function normaliseTeam(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("gtm") || lower.includes("marketing") || lower.includes("go-to-market"))
    return "GTM AI";
  if (lower.includes("product") || lower.includes("feature") || lower.includes("engineering"))
    return "Product";
  if (lower.includes("both") || lower.includes("all") || lower.includes("entire"))
    return "Both";
  if (
    lower.includes("leader") ||
    lower.includes("execut") ||
    lower.includes("strategic") ||
    lower.includes("management")
  )
    return "Leadership";
  return "Both";
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

// Strip CDATA wrappers and HTML tags from RSS text content
function cleanRssText(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

// Build HTML email body
function buildEmailHtml(brief: BriefForEmail, developments: DevelopmentForEmail[]): string {
  const top5 = [...developments]
    .sort((a, b) => {
      const aScore = (JSON.parse(a.scores || "{}") as { weighted?: number }).weighted ?? 0;
      const bScore = (JSON.parse(b.scores || "{}") as { weighted?: number }).weighted ?? 0;
      return bScore - aScore;
    })
    .slice(0, 5);

  const devRows = top5
    .map(
      (d, i) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #2A2A45;">
        <div style="display: flex; gap: 12px; align-items: flex-start;">
          <div style="
            width: 24px; height: 24px; background: #7B5CF0;
            border-radius: 6px; color: white; font-size: 11px;
            font-weight: 600; text-align: center; line-height: 24px;
            flex-shrink: 0;
          ">${i + 1}</div>
          <div>
            <p style="margin: 0 0 4px; font-size: 14px; font-weight: 500; color: #F0F0FF;">
              ${d.title}
            </p>
            ${
              d.whyNow
                ? `<p style="margin: 0; font-size: 12px; color: #F59E0B; font-style: italic;">${d.whyNow}</p>`
                : ""
            }
          </div>
        </div>
      </td>
    </tr>`
    )
    .join("");

  let actionsHtml = "";
  if (brief.topActions) {
    try {
      const parsed = JSON.parse(brief.topActions) as { actions?: TopAction[] };
      const actions = parsed.actions ?? [];
      actionsHtml = actions
        .map(
          (a, i) => `
        <p style="margin: 0 0 8px; font-size: 13px; color: #F0F0FF;">
          ${i + 1}. ${a.action}
          <span style="color: #7B5CF0; margin-left: 8px;">→ ${a.timeEstimate}</span>
        </p>`
        )
        .join("");
    } catch {
      actionsHtml = "";
    }
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://scryon.app";
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background: #080810; font-family: -apple-system, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">

    <div style="margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 11px; color: #8888AA; letter-spacing: 0.08em; text-transform: uppercase;">
        SCRYON BRIEF
      </p>
      <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #F0F0FF;">${dateLabel}</h1>
    </div>

    <div style="background: #0F0F1A; border: 1px solid #2A2A45; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
      <p style="margin: 0 0 16px; font-size: 11px; color: #8888AA; letter-spacing: 0.08em; text-transform: uppercase;">
        TOP DEVELOPMENTS TODAY
      </p>
      <table style="width: 100%; border-collapse: collapse;">
        ${devRows}
      </table>
    </div>

    ${
      actionsHtml
        ? `<div style="background: #0F0F1A; border: 1px solid #2A2A45; border-left: 3px solid #7B5CF0; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
      <p style="margin: 0 0 16px; font-size: 11px; color: #8888AA; letter-spacing: 0.08em; text-transform: uppercase;">
        TOP ACTIONS TODAY
      </p>
      ${actionsHtml}
    </div>`
        : ""
    }

    <div style="text-align: center; margin-top: 32px;">
      <a href="${appUrl}/dashboard"
        style="display: inline-block; background: linear-gradient(135deg, #7B5CF0, #A78BFA);
        color: white; padding: 12px 24px; border-radius: 8px;
        text-decoration: none; font-size: 14px; font-weight: 500;">
        View Full Brief
      </a>
    </div>

    <p style="margin-top: 32px; font-size: 11px; color: #55557A; text-align: center;">
      Scryon · Fello.ai GTM AI Team ·
      <a href="${appUrl}/settings" style="color: #7B5CF0; text-decoration: none;">Manage preferences</a>
    </p>

  </div>
</body>
</html>`;
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

          // Extract feed/channel title for logging only — never used as candidate title
          const feedTitleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const feedTitle = feedTitleMatch ? cleanRssText(feedTitleMatch[1]) : src.label;
          console.log("[RSS] Feed title:", feedTitle);

          // Extract individual <item> (RSS) or <entry> (Atom) blocks
          const itemBlocks =
            text.match(/<item[\s\S]*?<\/item>/gi) ??
            text.match(/<entry[\s\S]*?<\/entry>/gi) ??
            [];

          for (const block of itemBlocks.slice(0, 6)) {
            const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            const linkMatch =
              block.match(/<link[^>]*>(https?:\/\/[^\s<]+)<\/link>/i) ??
              block.match(/<link[^>]+href="([^"]+)"/i);
            const descMatch =
              block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ??
              block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);

            const itemTitle = titleMatch ? cleanRssText(titleMatch[1]) : "";
            const articleUrl = linkMatch ? linkMatch[1].trim() : src.url;
            const summary = descMatch ? cleanRssText(descMatch[1]).slice(0, 200) : "";

            console.log("[RSS] Item title:", itemTitle);

            if (itemTitle && itemTitle.length > 10) {
              candidates.push({ title: itemTitle, summary, url: articleUrl, source: src.label });
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

// STEP 2: Filter to top 10 most significant, avoiding recently covered topics
async function filterDevelopments(
  candidates: RawCandidate[],
  recentTitles: string[]
): Promise<FilteredDevelopment[]> {
  const candidateList = candidates
    .map((c, i) => `${i + 1}. Title: ${c.title}\n   Summary: ${c.summary}\n   URL: ${c.url}`)
    .join("\n\n");

  const recentTitlesBlock =
    recentTitles.length > 0
      ? `\nThese developments have already been covered in the last 7 days — do not include them or anything substantially similar:\n${recentTitles.join("\n")}\n\nPrioritise genuinely new developments. If a topic has appeared in the last 3 days, cap its relevance score at 4 regardless of other factors.\n`
      : "";

  const prompt = `You are a ruthless AI signal filter. From these candidates, identify the 10 most significant AI developments of today.
Reject: repackaged old news, vague announcements, incremental updates, pure marketing.

CRITICAL RULE FOR TITLES:
Every development title must be the specific article or announcement headline — never the source or feed name.

Examples of WRONG titles:
- "LangChain Blog"
- "Hugging Face - Blog"
- "OpenAI News"
- "GitHub Trending"
- "The Batch"

Examples of CORRECT titles:
- "Gemma 4: Byte for byte, the most capable open models"
- "Google updates Workspace to make AI your new office intern"
- "LangChain releases LangGraph 0.4 with persistent memory"
- "Hugging Face open-sources SmolVLM, a 2B vision model"

If the raw source title is a feed name or blog name rather than an article headline, you MUST rewrite it into a specific descriptive headline based on the article content provided. A good title names the specific thing that happened, could stand alone as a news headline, is 6–15 words long, and contains a subject (who/what) and an action or descriptor.
${recentTitlesBlock}
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

Respond with valid JSON only. No markdown, no backticks, no explanation. Just the raw JSON array.`;

  const raw = await generateContent(prompt);

  let parsed: FilteredDevelopment[];
  try {
    parsed = JSON.parse(raw) as FilteredDevelopment[];
  } catch {
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
      prototypeThis: extractString(
        parsed,
        "prototypeThis",
        "prototype_this",
        "prototype",
        "buildThis",
        "build_this"
      ),
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
            whichTeam: normaliseTeam(rec.whichTeam ?? ""),
            fitInFello: rec.fitInFello ?? "",
            prototypeThis: rec.prototypeThis ?? "",
            ignoreConsequence: rec.ignoreConsequence ?? "",
            whyNow: rec.whyNow || null,
          },
        });

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
  // In-app notifications
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

  // Email digest
  try {
    console.log("[Email] Reading settings...");
    const settings = await prisma.settings.findFirst({
      where: { user: { role: "OWNER" } },
    });
    console.log("[Email] Settings found:", !!settings);
    console.log("[Email] emailDigest:", settings?.emailDigest);
    console.log("[Email] emailRecipients:", settings?.emailRecipients);
    console.log("[Email] RESEND_API_KEY present:", !!process.env.RESEND_API_KEY);

    if (!settings) {
      console.log("[Email] No settings found, skipping.");
      return;
    }

    if (!settings.emailDigest) {
      console.log("[Email] Digest disabled, skipping.");
      return;
    }

    let recipients: string[] = [];

    if (Array.isArray(settings.emailRecipients)) {
      recipients = (settings.emailRecipients as string[]).filter((e) => e.trim().length > 0);
    } else if (typeof settings.emailRecipients === "string") {
      // Could be a JSON array string or a comma-separated string
      try {
        const parsed: unknown = JSON.parse(settings.emailRecipients);
        if (Array.isArray(parsed)) {
          recipients = (parsed as unknown[]).filter(
            (r): r is string => typeof r === "string" && r.trim().length > 0
          );
        } else {
          recipients = settings.emailRecipients
            .split(",")
            .map((e) => e.trim())
            .filter((e) => e.length > 0);
        }
      } catch {
        recipients = settings.emailRecipients
          .split(",")
          .map((e) => e.trim())
          .filter((e) => e.length > 0);
      }
    }

    console.log("[Email] Parsed recipients:", recipients);

    if (recipients.length === 0) {
      console.log("[Email] No valid recipients, skipping.");
      return;
    }

    // Fetch brief + developments for email
    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
      select: { id: true, date: true, topActions: true },
    });

    if (!brief) {
      console.log("[Email] Brief not found:", briefId);
      return;
    }

    const developments = await prisma.development.findMany({
      where: { briefId },
      orderBy: { rank: "asc" },
      take: 5,
      select: {
        rank: true,
        title: true,
        scores: true,
        whyNow: true,
        fitInFello: true,
        ideas: { select: { id: true } },
      },
    });

    const html = buildEmailHtml(brief, developments);

    const formattedDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    console.log("[Email] Attempting to send via Resend...");

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: "Scryon <onboarding@resend.dev>",
      to: recipients,
      subject: `Scryon Intel — ${formattedDate}`,
      html,
    });

    if (error) {
      console.error("[Email] Resend error:", JSON.stringify(error, null, 2));
      logger.error("Email digest failed", { error: JSON.stringify(error), briefId });
    } else {
      console.log("[Email] Sent successfully. ID:", data?.id);
      console.log("[Email] Sent to:", recipients);
      logger.info("Email digest sent", { emailId: data?.id, briefId });
    }
  } catch (err) {
    console.error("[Email] Unexpected error:", err);
    logger.error("Email digest threw", { error: String(err), briefId });
  }
}

async function updatePatterns(briefId: string, developments: FilteredDevelopment[]) {
  try {
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
  // Guard: skip if a READY brief already exists for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingBrief = await prisma.brief.findFirst({
    where: { generatedAt: { gte: today }, status: "READY" },
  });

  if (existingBrief) {
    console.log("[Pipeline] Brief already generated today, skipping.", existingBrief.id);
    return existingBrief.id;
  }

  // Guard: skip if a run is already in progress
  const inProgress = await prisma.brief.findFirst({
    where: { status: "PENDING" },
  });

  if (inProgress) {
    console.log("[Pipeline] Brief generation already in progress, skipping.");
    return inProgress.id;
  }

  // Create a pending brief to claim the slot
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

    // Load titles from the last 7 days to avoid repetition
    const recentDevelopments = await prisma.development.findMany({
      where: {
        brief: {
          generatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      select: { title: true },
    });
    const recentTitles = recentDevelopments.map((d) => d.title);
    logger.info("Loaded recent titles for deduplication", { count: recentTitles.length });

    // Step 2: Filter
    const topDevelopments = await filterDevelopments(candidates, recentTitles);

    // Step 3: Generate all recommendations in a single Gemini call (conserves quota)
    let recommendations: GeneratedRecommendation[];
    try {
      recommendations = await generateAllRecommendations(topDevelopments, fellaContext, gtmContext);
      while (recommendations.length < topDevelopments.length) {
        recommendations.push({
          fitInFello: "",
          whichTeam: "",
          ideas: [],
          prototypeThis: "",
          ignoreConsequence: "",
          whyNow: "",
        });
      }
    } catch (err) {
      logger.error("Batch recommendation generation failed", { error: String(err) });
      recommendations = topDevelopments.map(() => ({
        fitInFello: "",
        whichTeam: "",
        ideas: [],
        prototypeThis: "",
        ignoreConsequence: "",
        whyNow: "",
      }));
    }

    // Step 3.5: Generate top actions (separate Gemini call, fire before save)
    void generateTopActions(brief.id, topDevelopments, recommendations);

    // Step 4: Save
    await saveBrief(brief.id, topDevelopments, recommendations, candidates);

    // Step 5: Notify + patterns (fire and forget)
    void notifyUsers(brief.id);
    void updatePatterns(brief.id, topDevelopments);

    logger.info("Brief generation complete", {
      briefId: brief.id,
      developments: topDevelopments.length,
    });
    return brief.id;
  } catch (err) {
    console.error("[Pipeline] Failed:", err);
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
