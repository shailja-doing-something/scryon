import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateChatResponse, generateContent } from "@/lib/gemini";
import { logger } from "@/lib/logger";
import { runDailyBrief } from "@/lib/intelligence";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const VALID_STATUSES = ["GENERATED", "CONSIDERING", "PROTOTYPING", "WORKED", "FAILED"];

type Intent = "MOVE_IDEA" | "REGENERATE" | "ADD_SOURCE" | "SET_FOCUS" | "DRAFT_SLACK" | "STANDUP" | null;

type ActionResult = {
  type: string;
  description: string;
} | null;

type IdeaRecord = {
  id: string;
  type: string;
  text: string;
  status: string;
  createdAt: Date;
  development: { id: string; title: string };
  activities: Array<{ fromStatus: string; toStatus: string; createdAt: Date }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────

function ideaTitle(text: string): string {
  return text.split("\n")[0] ?? text;
}

function ideaAge(createdAt: Date): string {
  const days = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function detectIntent(msg: string): Intent {
  const lower = msg.toLowerCase();
  if (/\b(move|mark\s+as|update\s+status|change\s+.*\s+to|put\s+.*\s+in|set\s+.*\s+to)\b/.test(lower)) return "MOVE_IDEA";
  if (/\b(regenerate|generate\s+.*\s+brief|refresh\s+.*\s+brief|run\s+.*\s+pipeline|new\s+brief)\b/.test(lower)) return "REGENERATE";
  if (/\b(add\s+.*source|add\s+.*feed|track\s+this|add\s+.*url|add\s+.*rss)\b/.test(lower)) return "ADD_SOURCE";
  if (/\b(focus\s+on|set\s+focus|focus\s+area|next\s+brief.*focus|set.*focus)\b/.test(lower)) return "SET_FOCUS";
  if (/\b(draft\s+slack|slack\s+message|write\s+.*slack|share\s+.*idea|slack\s+post)\b/.test(lower)) return "DRAFT_SLACK";
  if (/\b(standup|stand[\s-]up|brief\s+me|morning\s+summary)\b/.test(lower)) return "STANDUP";
  return null;
}

function extractStatus(msg: string): string | null {
  const lower = msg.toLowerCase();
  if (/\bconsidering\b/.test(lower)) return "CONSIDERING";
  if (/\bprototyping\b|\bprototype\b/.test(lower)) return "PROTOTYPING";
  if (/\bworked\b|\bdone\b|\bcompleted?\b|\bsuccess\b/.test(lower)) return "WORKED";
  if (/\bfailed\b|\bfail\b|\babandon\b|\bdrop\b|\brejected?\b/.test(lower)) return "FAILED";
  if (/\bgenerated\b|\bbacklog\b/.test(lower)) return "GENERATED";
  return null;
}

function extractUrl(msg: string): string | null {
  const match = msg.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

function extractSourceType(msg: string): string {
  const lower = msg.toLowerCase();
  if (/\bgithub\b/.test(lower)) return "GitHub";
  if (/\btelegram\b/.test(lower)) return "Telegram";
  if (/\brss\b|\bfeed\b/.test(lower)) return "RSS";
  return "Manual";
}

function fuzzyScore(query: string, title: string): number {
  const q = query.toLowerCase();
  const t = title.toLowerCase();
  if (t.includes(q)) return 1.0;
  const qWords = q.split(/\s+/).filter((w) => w.length > 2);
  const tWords = new Set(t.split(/\s+/));
  if (qWords.length === 0) return 0;
  const hits = qWords.filter((w) => tWords.has(w) || [...tWords].some((tw) => tw.includes(w)));
  return hits.length / qWords.length;
}

function findBestIdeaMatches(message: string, ideas: IdeaRecord[]) {
  return ideas
    .map((idea) => ({ idea, score: fuzzyScore(message, ideaTitle(idea.text)) }))
    .filter((x) => x.score > 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ── Auth ──────────────────────────────────────────────────────────────────

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const expected = process.env.EXTENSION_TOKEN;
    if (expected && token === expected) {
      const owner = await prisma.user.findFirst({ where: { role: "OWNER" }, select: { id: true } });
      return owner?.id ?? null;
    }
  }
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  return user?.id ?? null;
}

// ── Context loader ────────────────────────────────────────────────────────

async function loadContext() {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [briefs, allIdeas, patterns, contextDocs] = await Promise.all([
    prisma.brief.findMany({
      where: { status: "READY", date: { gte: fourteenDaysAgo } },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        focusArea: true,
        developments: {
          orderBy: { rank: "asc" },
          select: {
            id: true,
            title: true,
            summary: true,
            scores: true,
            rank: true,
            whichTeam: true,
            fitInFello: true,
            prototypeThis: true,
            ignoreConsequence: true,
            ideas: {
              select: { id: true, type: true, text: true, status: true },
            },
          },
        },
      },
    }),
    prisma.idea.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        type: true,
        text: true,
        status: true,
        createdAt: true,
        development: { select: { id: true, title: true } },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { fromStatus: true, toStatus: true, createdAt: true },
        },
      },
    }),
    prisma.pattern.findMany({
      orderBy: { frequency: "desc" },
      take: 20,
      select: { theme: true, frequency: true, firstSeen: true, lastSeen: true },
    }),
    prisma.contextDoc.findMany({ select: { type: true, content: true } }),
  ]);

  return { briefs, allIdeas, patterns, contextDocs };
}

// ── System prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(
  briefs: Awaited<ReturnType<typeof loadContext>>["briefs"],
  allIdeas: IdeaRecord[],
  patterns: Awaited<ReturnType<typeof loadContext>>["patterns"],
  contextDocs: Awaited<ReturnType<typeof loadContext>>["contextDocs"],
  today: string
): string {
  const felloCtx = contextDocs.find((d) => d.type === "FELLO")?.content ?? "Not configured.";
  const gtmCtx = contextDocs.find((d) => d.type === "GTM")?.content ?? "Not configured.";
  const todayBrief = briefs[0];

  const briefsSection = briefs
    .map((brief) => {
      const date = brief.date.toLocaleDateString("en-US", { dateStyle: "medium" });
      const devLines = brief.developments.map((dev, i) => {
        const scores = JSON.parse(dev.scores || "{}") as Record<string, number>;
        const ideasLines = dev.ideas
          .map((idea) => `      - [${idea.type}] ${ideaTitle(idea.text)} (ID:${idea.id}, status:${idea.status})`)
          .join("\n");
        return (
          `  ${i + 1}. ${dev.title} | Team:${dev.whichTeam} | Scores:${Object.entries(scores).map(([k, v]) => `${k}=${v}`).join(",")}\n` +
          `     Fit: ${dev.fitInFello}\n` +
          `     Prototype: ${dev.prototypeThis}\n` +
          `     If ignored: ${dev.ignoreConsequence}\n` +
          (ideasLines ? `     Ideas:\n${ideasLines}` : "")
        );
      }).join("\n\n");
      return `BRIEF ${date}${brief.focusArea ? ` [focus:${brief.focusArea}]` : ""}:\n${devLines}`;
    })
    .join("\n\n---\n\n");

  const trackerSection =
    "IDEA TRACKER:\n" +
    allIdeas
      .map((idea) => {
        const age = ideaAge(idea.createdAt);
        return `- [${idea.status}] [${idea.type}] ${ideaTitle(idea.text)} | ID:${idea.id} | Source:${idea.development.title} | Added:${age}`;
      })
      .join("\n");

  const patternsSection =
    "DETECTED PATTERNS:\n" +
    patterns
      .map((p) => `- "${p.theme}" — ${p.frequency}x | first:${p.firstSeen.toLocaleDateString("en-US", { dateStyle: "short" })} last:${p.lastSeen.toLocaleDateString("en-US", { dateStyle: "short" })}`)
      .join("\n");

  const statusCounts = VALID_STATUSES.map((s) => `${s}:${allIdeas.filter((i) => i.status === s).length}`).join(", ");

  return `You are Scryon, an elite AI intelligence analyst embedded inside Fello's GTM AI team. You are not a generic assistant — you are a sharp, opinionated strategist who knows Fello's product and GTM AI team deeply and thinks in terms of competitive advantage, speed of execution, and practical impact.

YOUR PERSONALITY:
- Direct and confident. You have opinions. You share them.
- You never hedge with "it depends" without immediately giving your actual recommendation.
- You think across time — you notice when something has appeared before, when a pattern is accelerating, when an idea has been sitting too long.
- You are brief by default. 2-3 sentences unless asked for more. Use bullets for lists, never paragraphs.
- You occasionally push back: if the user asks about something low-scoring or irrelevant, you say so.
- You feel like a real conversation partner — reference earlier parts of the conversation, follow threads, never repeat yourself.

YOUR CAPABILITIES:
1. CROSS-BRIEF REASONING: Reason across all 14 days of briefs. Notice topics appearing multiple times (signal of acceleration), high-scoring developments that generated no action, contradictions, and gaps.
2. IDEA QUALITY OPINIONS: Give genuine opinions based on: original development score, how long the idea has been sitting, alignment with Fello's core product pillars (Enrich, Automate, Convert), and GTM AI team capacity.
3. PATTERN SPOTTING: Proactively mention patterns even when not asked.
4. SCORING INSIGHT: Reason about scores specifically — e.g., "high deployability but low relevance means easy to build but questionable impact."

RULES:
- Only discuss Scryon data and Fello/GTM topics. Decline anything else politely.
- When you take an action, confirm clearly.
- If asked something you cannot answer from the data, say exactly what data you would need.
- Never make up developments or ideas not in the database.
- Vary your conversational openers. Not every response starts the same way.

Current date: ${today}
Idea tracker: ${allIdeas.length} total | ${statusCounts}
Today's brief: ${todayBrief ? `${todayBrief.developments.length} developments` : "not yet generated"}

FELLO CONTEXT:
${felloCtx}

GTM AI TEAM CONTEXT:
${gtmCtx}

${briefsSection}

${patternsSection}

${trackerSection}`;
}

// ── Action handlers ───────────────────────────────────────────────────────

async function handleMoveIdea(
  message: string,
  userId: string,
  allIdeas: IdeaRecord[]
): Promise<{ response: string; action: ActionResult; needsClarification?: boolean }> {
  const status = extractStatus(message);
  if (!status) {
    return { response: "Which status should I move it to? Considering, Prototyping, Worked, or Failed?", action: null, needsClarification: true };
  }

  const matches = findBestIdeaMatches(message, allIdeas);
  if (matches.length === 0) {
    return { response: "I couldn't find a matching idea. Can you be more specific about the name?", action: null, needsClarification: true };
  }

  const top = matches[0];
  if (matches.length > 1 && top.score < 0.7) {
    const opts = matches.map((m) => `"${ideaTitle(m.idea.text)}"`).join(", ");
    return { response: `Which idea — ${opts}?`, action: null, needsClarification: true };
  }

  const idea = top.idea;
  const oldStatus = idea.status;

  try {
    await prisma.$transaction([
      prisma.idea.update({ where: { id: idea.id }, data: { status } }),
      prisma.ideaActivity.create({
        data: { ideaId: idea.id, userId, fromStatus: oldStatus, toStatus: status, comment: "Updated via Scryon AI" },
      }),
    ]);
    return {
      response: `Done — moved **${ideaTitle(idea.text)}** from ${oldStatus} to ${status}.`,
      action: { type: "MOVE_IDEA", description: `Moved "${ideaTitle(idea.text)}" to ${status}` },
    };
  } catch {
    return { response: "Something went wrong updating the tracker. Try again.", action: null };
  }
}

async function handleAddSource(message: string): Promise<{ response: string; action: ActionResult }> {
  const url = extractUrl(message);
  if (!url) {
    return { response: "What URL should I add? Paste the full link.", action: null };
  }
  const type = extractSourceType(message);
  try {
    await prisma.source.create({ data: { url, type, label: url, active: true } });
    return {
      response: `Added **${url}** as an active ${type} source. It will be included in the next brief generation.`,
      action: { type: "ADD_SOURCE", description: `Added ${type} source: ${url}` },
    };
  } catch {
    return { response: "Couldn't add that source — it may already exist.", action: null };
  }
}

async function handleSetFocus(message: string): Promise<{ response: string; action: ActionResult }> {
  const lower = message.toLowerCase();
  const focusMatch = lower.match(/(?:focus\s+(?:on|area|to)|set\s+focus\s+(?:on|to|area)|next\s+brief.*?(?:focus\s+on)?)\s+(.+)/);
  const focusArea = focusMatch ? focusMatch[1].trim().replace(/['"]/g, "") : message.slice(message.indexOf(" ") + 1).trim();

  const latestBrief = await prisma.brief.findFirst({ orderBy: { date: "desc" }, select: { id: true } });
  if (!latestBrief) {
    return { response: "No brief found to set focus on.", action: null };
  }
  await prisma.brief.update({ where: { id: latestBrief.id }, data: { focusArea } });
  return {
    response: `Focus area set to **"${focusArea}"**. This will influence the next regeneration.`,
    action: { type: "SET_FOCUS", description: `Focus set to "${focusArea}"` },
  };
}

function handleRegenerate(message: string): { response: string; action: ActionResult } {
  const lower = message.toLowerCase();
  const focusMatch = lower.match(/(?:focused?\s+on|about|for)\s+(.+)/);
  const focusArea = focusMatch ? focusMatch[1].trim() : "";

  // Fire and forget — continues running after response is returned
  void runDailyBrief(focusArea).catch((e: unknown) => logger.error("Background brief regen failed", { error: String(e) }));

  return {
    response: `Running the intelligence pipeline now${focusArea ? ` with focus on **"${focusArea}"**` : ""}. This takes about 60–90 seconds. Check the dashboard once it's done.`,
    action: { type: "REGENERATE", description: "Brief regeneration triggered" },
  };
}

async function generateSlackDraft(message: string, systemPrompt: string): Promise<string> {
  const prompt = `${systemPrompt}

---
The user asked: "${message}"

Generate a Slack message in this exact format (use actual data from the context above):

*🧠 AI Intel from Scryon*

*[Development title]*
[One paragraph on what it is and why it matters for Fello — max 3 sentences]

*Fello angle:* [fitInFello — 1 sentence]
*Team:* [whichTeam]

*Top idea:* [best immediate use case from ideas]
*If we ignore this:* [ignoreConsequence]

_Full brief: ${process.env.NEXTAUTH_URL ?? "https://scryon.app"}/dashboard_

Return ONLY the Slack message, no other text.`;

  return generateContent(prompt);
}

async function generateStandup(systemPrompt: string, today: string): Promise<string> {
  const prompt = `${systemPrompt}

---
Generate a concise AI standup for ${today} in plain prose (no markdown, full sentences — it will be read aloud):

"Here is your AI standup for [date]:

Top development today: [title] — [one sentence why it matters for Fello]. Score: [X.X].

Team should know: [whichTeam] — [one actionable sentence].

In the tracker: [X] ideas active, [X] considering, [X] in prototyping. Oldest unconsidered idea: [idea name] — [X] days in Generated.

Pattern alert: [most frequent recent theme] has appeared [X] times recently."

Return ONLY the standup text, no markdown formatting.`;

  return generateContent(prompt);
}

async function generateFollowUps(response: string): Promise<string[]> {
  try {
    const prompt = `Given this AI assistant response about a company's intelligence briefs and idea tracker:

"${response.slice(0, 400)}"

Suggest exactly 2 short follow-up questions the user might want to ask. Each question should be max 7 words, natural, and conversational. Return as a JSON array of 2 strings only, no other text.`;

    const raw = await generateContent(prompt);
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return [String(parsed[0]), String(parsed[1])];
    }
  } catch {
    // silently fail — follow-ups are optional
  }
  return [];
}

// ── Handlers ──────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId) return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers: CORS });

  const body = (await request.json()) as {
    message: string;
    conversationHistory: Array<{ role: "user" | "model"; text: string }>;
  };

  if (!body.message?.trim()) {
    return Response.json({ success: false, error: "Message required" }, { status: 400, headers: CORS });
  }

  const { briefs, allIdeas, patterns, contextDocs } = await loadContext();
  const today = new Date().toLocaleDateString("en-US", { dateStyle: "full" });
  const systemPrompt = buildSystemPrompt(briefs, allIdeas, patterns, contextDocs, today);
  const intent = detectIntent(body.message);

  try {
    let responseText = "";
    let action: ActionResult = null;
    let isSlackDraft = false;

    if (intent === "MOVE_IDEA") {
      const result = await handleMoveIdea(body.message, userId, allIdeas);
      responseText = result.response;
      action = result.action;
    } else if (intent === "ADD_SOURCE") {
      const result = await handleAddSource(body.message);
      responseText = result.response;
      action = result.action;
    } else if (intent === "SET_FOCUS") {
      const result = await handleSetFocus(body.message);
      responseText = result.response;
      action = result.action;
    } else if (intent === "REGENERATE") {
      const result = handleRegenerate(body.message);
      responseText = result.response;
      action = result.action;
    } else if (intent === "DRAFT_SLACK") {
      responseText = await generateSlackDraft(body.message, systemPrompt);
      action = { type: "DRAFT_SLACK", description: "Slack message drafted" };
      isSlackDraft = true;
    } else if (intent === "STANDUP") {
      responseText = await generateStandup(systemPrompt, today);
      action = { type: "STANDUP", description: "Standup generated" };
    } else {
      responseText = await generateChatResponse(
        systemPrompt,
        (body.conversationHistory ?? []).slice(-20),
        body.message
      );
    }

    const followUps = await generateFollowUps(responseText);

    return Response.json(
      { success: true, data: { response: responseText, action, followUps, isSlackDraft } },
      { headers: CORS }
    );
  } catch (error) {
    logger.error("Chat failed", { error: String(error) });
    return Response.json({ success: false, error: "Failed to get response" }, { status: 500, headers: CORS });
  }
}
