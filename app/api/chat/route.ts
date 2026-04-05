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

const FORMATTING_INSTRUCTION = `
Respond conversationally. Do not use headers. Do not copy text from the brief verbatim. Synthesise and give your opinion. Maximum 4 sentences unless the user asked for something detailed. No bullet points unless listing 3 or more distinct items that genuinely need a list. Use contractions. Never start with "Certainly!", "Great question!", or "Based on the data".`;

// ── Types ─────────────────────────────────────────────────────────────────

type ActionIntent = "MOVE_IDEA" | "REGENERATE" | "ADD_SOURCE" | "SET_FOCUS" | "DRAFT_SLACK" | "STANDUP";
type QueryIntent = "BRIEF_QUESTION" | "IDEA_QUESTION" | "PATTERN_QUESTION" | "CROSS_BRIEF" | "GENERAL";
type Intent = ActionIntent | QueryIntent;

type ActionResult = { type: string; description: string } | null;

type IdeaRecord = {
  id: string;
  type: string;
  text: string;
  status: string;
  createdAt: Date;
  development: { id: string; title: string };
  activities: Array<{ fromStatus: string; toStatus: string; createdAt: Date }>;
};

type ContextDoc = { type: string; content: string };

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

// ── Intent detection ──────────────────────────────────────────────────────

function detectIntent(msg: string): Intent {
  const lower = msg.toLowerCase();

  // Action intents — checked first
  if (/\b(move|mark\s+as|update\s+status|change\s+.*\s+to|put\s+.*\s+in|set\s+.*\s+to)\b/.test(lower)) return "MOVE_IDEA";
  if (/\b(regenerate|generate\s+.*\s+brief|refresh\s+.*\s+brief|run\s+.*\s+pipeline|new\s+brief)\b/.test(lower)) return "REGENERATE";
  if (/\b(add\s+.*source|add\s+.*feed|track\s+this|add\s+.*url|add\s+.*rss)\b/.test(lower)) return "ADD_SOURCE";
  if (/\b(focus\s+on|set\s+focus|focus\s+area|next\s+brief.*focus|set.*focus)\b/.test(lower)) return "SET_FOCUS";
  if (/\b(draft\s+slack|slack\s+message|write\s+.*slack|share\s+.*idea|slack\s+post)\b/.test(lower)) return "DRAFT_SLACK";
  if (/\b(standup|stand[\s-]up|brief\s+me|morning\s+summary)\b/.test(lower)) return "STANDUP";

  // Query intents — for smart context loading
  if (/\b(today|this brief|development|top development|score|what happened|what came up|what's new|latest)\b/.test(lower)) return "BRIEF_QUESTION";
  if (/\b(idea|tracker|prototype|considering|status|which.*pursue|worth doing|move forward)\b/.test(lower)) return "IDEA_QUESTION";
  if (/\b(trend|pattern|week|last.*brief|history|before|recurring|appeared|come up|keep seeing)\b/.test(lower)) return "PATTERN_QUESTION";
  if (/\b(across|compare|over time|multiple brief|last.*days|been happening)\b/.test(lower)) return "CROSS_BRIEF";

  return "GENERAL";
}

// ── DB query helpers ──────────────────────────────────────────────────────

async function getContextDocs(): Promise<ContextDoc[]> {
  return prisma.contextDoc.findMany({ select: { type: true, content: true } });
}

async function getTodayBriefStats() {
  const brief = await prisma.brief.findFirst({
    where: { status: "READY" },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      developments: {
        orderBy: { rank: "asc" },
        take: 1,
        select: { title: true, scores: true },
      },
      _count: { select: { developments: true } },
    },
  });
  if (!brief) return null;
  const topScores = JSON.parse(brief.developments[0]?.scores || "{}") as Record<string, number>;
  return {
    id: brief.id,
    date: brief.date.toLocaleDateString("en-US", { dateStyle: "full" }),
    count: brief._count.developments,
    topTitle: brief.developments[0]?.title ?? null,
    topScore: topScores.weighted ?? null,
  };
}

async function getTodayBriefFull() {
  return prisma.brief.findFirst({
    where: { status: "READY" },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      focusArea: true,
      developments: {
        orderBy: { rank: "asc" },
        select: {
          id: true, title: true, summary: true, scores: true, rank: true,
          whichTeam: true, fitInFello: true, prototypeThis: true, ignoreConsequence: true,
          ideas: { select: { id: true, type: true, text: true, status: true } },
        },
      },
    },
  });
}

async function getAllIdeasWithAge(): Promise<IdeaRecord[]> {
  return prisma.idea.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, type: true, text: true, status: true, createdAt: true,
      development: { select: { id: true, title: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { fromStatus: true, toStatus: true, createdAt: true },
      },
    },
  });
}

async function getTrackerCounts() {
  const counts = await prisma.idea.groupBy({ by: ["status"], _count: { id: true } });
  const map: Record<string, number> = {};
  counts.forEach((c) => { map[c.status] = c._count.id; });
  // Oldest unactioned idea
  const oldest = await prisma.idea.findFirst({
    where: { status: "GENERATED" },
    orderBy: { createdAt: "asc" },
    select: { text: true, createdAt: true },
  });
  return { counts: map, oldest };
}

async function getPatterns() {
  return prisma.pattern.findMany({
    orderBy: { frequency: "desc" },
    take: 15,
    select: { theme: true, frequency: true, firstSeen: true, lastSeen: true },
  });
}

async function getTopPattern() {
  return prisma.pattern.findFirst({
    orderBy: { frequency: "desc" },
    select: { theme: true, frequency: true, lastSeen: true },
  });
}

async function getLastNBriefSummaries(n: number) {
  const cutoff = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return prisma.brief.findMany({
    where: { status: "READY", date: { gte: cutoff } },
    orderBy: { date: "desc" },
    take: n,
    select: {
      date: true,
      developments: {
        orderBy: { rank: "asc" },
        take: 3,
        select: { title: true, scores: true, whichTeam: true },
      },
    },
  });
}

async function findRelevantDevelopment(message: string) {
  const devs = await prisma.development.findMany({
    orderBy: { rank: "asc" },
    take: 20,
    select: {
      id: true, title: true, summary: true, fitInFello: true,
      whichTeam: true, prototypeThis: true, ignoreConsequence: true, scores: true,
      ideas: { take: 3, select: { type: true, text: true } },
      brief: { select: { date: true } },
    },
  });
  const lower = message.toLowerCase();
  const scored = devs.map((d) => ({ dev: d, score: fuzzyScore(lower, d.title) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0.2 ? scored[0].dev : devs[0];
}

// ── Context loader by intent ──────────────────────────────────────────────

type LoadedContext = {
  contextDocs: ContextDoc[];
  todayStats: Awaited<ReturnType<typeof getTodayBriefStats>>;
  todayBrief?: Awaited<ReturnType<typeof getTodayBriefFull>>;
  ideas?: IdeaRecord[];
  trackerCounts?: Awaited<ReturnType<typeof getTrackerCounts>>;
  patterns?: Awaited<ReturnType<typeof getPatterns>>;
  topPattern?: Awaited<ReturnType<typeof getTopPattern>>;
  recentSummaries?: Awaited<ReturnType<typeof getLastNBriefSummaries>>;
  slackSubject?: Awaited<ReturnType<typeof findRelevantDevelopment>>;
};

async function loadContextForIntent(message: string, intent: Intent): Promise<LoadedContext> {
  const [contextDocs, todayStats] = await Promise.all([getContextDocs(), getTodayBriefStats()]);
  const base = { contextDocs, todayStats };

  if (intent === "BRIEF_QUESTION" || intent === "DRAFT_SLACK") {
    const [todayBrief, slackSubject] = await Promise.all([
      getTodayBriefFull(),
      intent === "DRAFT_SLACK" ? findRelevantDevelopment(message) : Promise.resolve(undefined),
    ]);
    return { ...base, todayBrief, slackSubject };
  }

  if (intent === "IDEA_QUESTION" || intent === "MOVE_IDEA") {
    const ideas = await getAllIdeasWithAge();
    return { ...base, ideas };
  }

  if (intent === "PATTERN_QUESTION" || intent === "CROSS_BRIEF") {
    const [patterns, recentSummaries] = await Promise.all([getPatterns(), getLastNBriefSummaries(14)]);
    return { ...base, patterns, recentSummaries };
  }

  if (intent === "STANDUP") {
    const [todayBrief, trackerCounts, topPattern] = await Promise.all([
      getTodayBriefFull(),
      getTrackerCounts(),
      getTopPattern(),
    ]);
    return { ...base, todayBrief, trackerCounts, topPattern };
  }

  // GENERAL, ADD_SOURCE, SET_FOCUS, REGENERATE — base only
  return base;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function ideaTitle(text: string): string {
  return text.split("\n")[0] ?? text;
}

function ideaAge(createdAt: Date): string {
  const days = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
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

// ── System prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: LoadedContext, today: string): string {
  const felloCtx = ctx.contextDocs.find((d) => d.type === "FELLO")?.content ?? "Not configured.";
  const gtmCtx = ctx.contextDocs.find((d) => d.type === "GTM")?.content ?? "Not configured.";

  // Build data sections — only include what was loaded
  const dataSections: string[] = [];

  if (ctx.todayStats) {
    const s = ctx.todayStats;
    dataSections.push(
      `TODAY (${s.date}): ${s.count} developments. Top: "${s.topTitle ?? "none"}"${s.topScore ? ` (score: ${s.topScore})` : ""}.`
    );
  } else {
    dataSections.push("TODAY: No brief generated yet.");
  }

  if (ctx.todayBrief) {
    const devLines = ctx.todayBrief.developments.map((dev, i) => {
      const scores = JSON.parse(dev.scores || "{}") as Record<string, number>;
      const ideasLines = dev.ideas
        .map((idea) => `      [${idea.type}] ${ideaTitle(idea.text)} (id:${idea.id}, status:${idea.status})`)
        .join("\n");
      return (
        `  ${i + 1}. ${dev.title}\n` +
        `     Team: ${dev.whichTeam} | Scores: ${Object.entries(scores).map(([k, v]) => `${k}=${v}`).join(", ")}\n` +
        `     Fello fit: ${dev.fitInFello}\n` +
        `     Prototype: ${dev.prototypeThis}\n` +
        `     If ignored: ${dev.ignoreConsequence}` +
        (ideasLines ? `\n     Ideas:\n${ideasLines}` : "")
      );
    }).join("\n\n");
    dataSections.push(`TODAY'S FULL BRIEF:\n${devLines}`);
  }

  if (ctx.ideas && ctx.ideas.length > 0) {
    const statusCounts = VALID_STATUSES.map((s) => `${s}:${ctx.ideas!.filter((i) => i.status === s).length}`).join(", ");
    const ideaLines = ctx.ideas.map((idea) => {
      const age = ideaAge(idea.createdAt);
      return `  [${idea.status}] [${idea.type}] ${ideaTitle(idea.text)} | id:${idea.id} | from: ${idea.development.title} | age: ${age}`;
    }).join("\n");
    dataSections.push(`IDEA TRACKER (${ctx.ideas.length} total — ${statusCounts}):\n${ideaLines}`);
  }

  if (ctx.trackerCounts) {
    const counts = Object.entries(ctx.trackerCounts.counts).map(([k, v]) => `${k}:${v}`).join(", ");
    const oldest = ctx.trackerCounts.oldest;
    const oldestLine = oldest
      ? `Oldest unactioned: "${ideaTitle(oldest.text)}" — ${ideaAge(oldest.createdAt)} in Generated`
      : "";
    dataSections.push(`TRACKER COUNTS: ${counts}${oldestLine ? `\n${oldestLine}` : ""}`);
  }

  if (ctx.patterns && ctx.patterns.length > 0) {
    const lines = ctx.patterns.map((p) =>
      `  "${p.theme}" — ${p.frequency}x | first seen: ${p.firstSeen.toLocaleDateString("en-US", { dateStyle: "short" })} | last: ${p.lastSeen.toLocaleDateString("en-US", { dateStyle: "short" })}`
    ).join("\n");
    dataSections.push(`DETECTED PATTERNS:\n${lines}`);
  }

  if (ctx.topPattern) {
    dataSections.push(`TOP PATTERN: "${ctx.topPattern.theme}" — seen ${ctx.topPattern.frequency} times, last ${ctx.topPattern.lastSeen.toLocaleDateString("en-US", { dateStyle: "short" })}`);
  }

  if (ctx.recentSummaries && ctx.recentSummaries.length > 0) {
    const lines = ctx.recentSummaries.map((b) => {
      const devSummaries = b.developments.map((d) => {
        const scores = JSON.parse(d.scores || "{}") as Record<string, number>;
        return `"${d.title}" (${d.whichTeam}, score:${scores.weighted ?? "?"})`;
      }).join(", ");
      return `  ${b.date.toLocaleDateString("en-US", { dateStyle: "medium" })}: ${devSummaries || "no developments"}`;
    }).join("\n");
    dataSections.push(`RECENT BRIEFS (last 14 days):\n${lines}`);
  }

  if (ctx.slackSubject) {
    const dev = ctx.slackSubject;
    const scores = JSON.parse(dev.scores || "{}") as Record<string, number>;
    const ideas = dev.ideas.map((i) => `[${i.type}] ${ideaTitle(i.text)}`).join("; ");
    dataSections.push(
      `SUBJECT FOR SLACK DRAFT:\n  Title: ${dev.title}\n  Team: ${dev.whichTeam}\n  Fit: ${dev.fitInFello}\n  Score: ${scores.weighted ?? "?"}\n  Ideas: ${ideas}\n  Prototype: ${dev.prototypeThis}\n  If ignored: ${dev.ignoreConsequence}`
    );
  }

  const loadedData = dataSections.join("\n\n");

  return `You are Kira — Scryon's embedded AI strategist for the Fello GTM AI team.

You are not a search engine. You do not copy and paste from documents. You read the data, form an opinion, and speak like a sharp, experienced colleague who has been watching AI developments for months and knows Fello's business deeply.

WHO YOU ARE:
You have been embedded in Fello's GTM AI team for a while. You know what Fello does (AI-powered marketing engine that turns dormant CRM databases into deals — Enrich, Automate, Convert). You know the GTM AI team builds internal agents fast and ships in days. You have seen what kinds of AI developments actually move the needle for them and what is just noise.

HOW YOU THINK:
- You synthesise, you do not summarise. Synthesising is "here is what this means for us and what I think we should do about it."
- You have a point of view. When asked which idea is worth pursuing, you pick one and defend it.
- You notice things. If voice AI has come up four times this week, you mention it unprompted. If an idea has been sitting in Generated for 12 days, you call it out.
- You connect dots. A new model release + Fello's lead scoring feature + the GTM team's current agent stack — you see how these fit together.

HOW YOU SPEAK:
- Like a smart colleague on Slack, not a report.
- Short by default. 2-3 sentences unless they ask for more.
- Direct. Never say "That is a great question." Never say "Certainly!" Never say "I would be happy to help."
- Use contractions. "It's", "you'll", "we've", "I'd" — not formal written English.
- Occasionally push back: "Honestly, I'd skip that one."
- Reference the conversation when relevant.
- Vary your openers. Never start two responses the same way.

WHAT YOU NEVER DO:
- Paste raw data from the brief into your response
- List everything when they asked for one thing
- Say "Based on the brief..." or "According to the data..." — you just answer
- Make up developments or ideas not in the data below
- Answer questions unrelated to Scryon, Fello, or the GTM AI team

FELLO CONTEXT:
${felloCtx}

GTM AI TEAM CONTEXT:
${gtmCtx}

CURRENT DATA (${today}):
${loadedData}
${FORMATTING_INSTRUCTION}`;
}

// ── Action handlers ───────────────────────────────────────────────────────

async function handleMoveIdea(
  message: string,
  userId: string,
): Promise<{ response: string; action: ActionResult }> {
  const ideas = await getAllIdeasWithAge();
  const status = extractStatus(message);
  if (!status) {
    return { response: "Which status should I move it to? Considering, Prototyping, Worked, or Failed?", action: null };
  }

  const matches = findBestIdeaMatches(message, ideas);
  if (matches.length === 0) {
    return { response: "I couldn't find a matching idea. Can you be more specific about the name?", action: null };
  }

  const top = matches[0];
  if (matches.length > 1 && top.score < 0.7) {
    const opts = matches.map((m) => `"${ideaTitle(m.idea.text)}"`).join(", ");
    return { response: `Which idea — ${opts}?`, action: null };
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
      response: `Added **${url}** as an active ${type} source. It'll be included in the next brief.`,
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
    response: `Focus area set to **"${focusArea}"**. Next regeneration will prioritise that angle.`,
    action: { type: "SET_FOCUS", description: `Focus set to "${focusArea}"` },
  };
}

function handleRegenerate(message: string): { response: string; action: ActionResult } {
  const lower = message.toLowerCase();
  const focusMatch = lower.match(/(?:focused?\s+on|about|for)\s+(.+)/);
  const focusArea = focusMatch ? focusMatch[1].trim() : "";

  void runDailyBrief(focusArea).catch((e: unknown) =>
    logger.error("Background brief regen failed", { error: String(e) })
  );

  return {
    response: `Running the intelligence pipeline now${focusArea ? ` with focus on **"${focusArea}"**` : ""}. Takes about 60–90 seconds — check the dashboard when it's done.`,
    action: { type: "REGENERATE", description: "Brief regeneration triggered" },
  };
}

async function generateSlackDraft(ctx: LoadedContext, message: string, systemPrompt: string): Promise<string> {
  const subject = ctx.slackSubject;
  const scores = subject ? (JSON.parse(subject.scores || "{}") as Record<string, number>) : {};
  const bestIdea = subject?.ideas.find((i) => i.type === "IMMEDIATE") ?? subject?.ideas[0];

  const prompt = `${systemPrompt}

The user asked: "${message}"

Generate a Slack message using the development data above. Use this exact format:

*🧠 AI Intel from Scryon*

*${subject?.title ?? "[Development title]"}*
[One paragraph — what it is and why it matters for Fello. Max 3 sentences. Write it, don't copy from the data.]

*Fello angle:* [1 sentence synthesising the fit]
*Team:* ${subject?.whichTeam ?? "[team]"}
*Score:* ${scores.weighted ?? "?"}

*Top idea:* ${bestIdea ? ideaTitle(bestIdea.text) : "[best immediate idea]"}
*If we ignore this:* [ignoreConsequence — rephrase, don't copy verbatim]

_Full brief: ${process.env.NEXTAUTH_URL ?? "https://scryon.app"}/dashboard_

Return ONLY the Slack message, no other text.`;

  return generateContent(prompt);
}

async function generateStandup(ctx: LoadedContext, systemPrompt: string, today: string): Promise<string> {
  const prompt = `${systemPrompt}

Generate a concise AI standup for ${today}. Plain prose, full sentences, no markdown — it will be read aloud.

Use this structure:
"Here's your AI standup for [date].

Top development: [title] — [one sentence on why it matters for Fello]. Score: [weighted score].

[whichTeam] team should know: [one actionable sentence].

Tracker: [X] ideas total, [X] considering, [X] prototyping.${ctx.trackerCounts?.oldest ? ` Oldest waiting: "${ideaTitle(ctx.trackerCounts.oldest.text)}" — ${ideaAge(ctx.trackerCounts.oldest.createdAt)} in Generated.` : ""}

${ctx.topPattern ? `Pattern to watch: "${ctx.topPattern.theme}" has appeared ${ctx.topPattern.frequency} times recently.` : ""}"

Return ONLY the standup text. No asterisks, no headers, no markdown.`;

  return generateContent(prompt);
}

async function generateFollowUps(response: string, message: string): Promise<string[]> {
  try {
    const prompt = `Given this conversation in a Fello GTM AI intelligence assistant:

User asked: "${message.slice(0, 200)}"
Assistant said: "${response.slice(0, 350)}"

Suggest exactly 2 natural follow-up questions the user might want to ask next. Make them specific to what was just discussed, not generic. Max 7 words each. Return as JSON array of 2 strings only, nothing else.`;

    const raw = await generateContent(prompt);
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return [String(parsed[0]), String(parsed[1])];
    }
  } catch {
    // follow-ups are optional
  }
  return [];
}

// ── Route handlers ────────────────────────────────────────────────────────

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

  const intent = detectIntent(body.message);
  const today = new Date().toLocaleDateString("en-US", { dateStyle: "full" });

  try {
    // For pure action intents that don't need a system prompt, handle directly
    if (intent === "MOVE_IDEA") {
      const result = await handleMoveIdea(body.message, userId);
      const followUps = await generateFollowUps(result.response, body.message);
      return Response.json({ success: true, data: { response: result.response, action: result.action, followUps, isSlackDraft: false } }, { headers: CORS });
    }

    if (intent === "ADD_SOURCE") {
      const result = await handleAddSource(body.message);
      const followUps = await generateFollowUps(result.response, body.message);
      return Response.json({ success: true, data: { response: result.response, action: result.action, followUps, isSlackDraft: false } }, { headers: CORS });
    }

    if (intent === "SET_FOCUS") {
      const result = await handleSetFocus(body.message);
      const followUps = await generateFollowUps(result.response, body.message);
      return Response.json({ success: true, data: { response: result.response, action: result.action, followUps, isSlackDraft: false } }, { headers: CORS });
    }

    if (intent === "REGENERATE") {
      const result = handleRegenerate(body.message);
      return Response.json({ success: true, data: { response: result.response, action: result.action, followUps: [], isSlackDraft: false } }, { headers: CORS });
    }

    // For everything else, load context then call Gemini
    const ctx = await loadContextForIntent(body.message, intent);
    const systemPrompt = buildSystemPrompt(ctx, today);

    let responseText = "";
    let action: ActionResult = null;
    let isSlackDraft = false;

    if (intent === "DRAFT_SLACK") {
      responseText = await generateSlackDraft(ctx, body.message, systemPrompt);
      action = { type: "DRAFT_SLACK", description: "Slack message drafted" };
      isSlackDraft = true;
    } else if (intent === "STANDUP") {
      responseText = await generateStandup(ctx, systemPrompt, today);
      action = { type: "STANDUP", description: "Standup generated" };
    } else {
      responseText = await generateChatResponse(
        systemPrompt,
        (body.conversationHistory ?? []).slice(-20),
        body.message
      );
    }

    const followUps = await generateFollowUps(responseText, body.message);

    return Response.json(
      { success: true, data: { response: responseText, action, followUps, isSlackDraft } },
      { headers: CORS }
    );
  } catch (error) {
    logger.error("Chat failed", { error: String(error) });
    return Response.json({ success: false, error: "Failed to get response" }, { status: 500, headers: CORS });
  }
}
