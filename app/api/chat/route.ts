import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateChatResponse } from "@/lib/gemini";
import { logger } from "@/lib/logger";

const VALID_STATUSES = ["GENERATED", "CONSIDERING", "PROTOTYPING", "WORKED", "FAILED"];

type TrackerAction = { ideaId: string; ideaTitle: string; newStatus: string };

function ideaTitle(text: string): string {
  return text.split("\n")[0] ?? text;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id?: string };
  if (!user.id) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    message: string;
    conversationHistory: Array<{ role: "user" | "model"; text: string }>;
  };

  if (!body.message?.trim()) {
    return Response.json({ success: false, error: "Message required" }, { status: 400 });
  }

  // Load context from DB in parallel
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [todayBrief, recentBriefs, allIdeas, patterns, contextDocs] = await Promise.all([
    prisma.brief.findFirst({
      where: { status: "READY" },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        developments: {
          orderBy: { rank: "asc" },
          select: {
            id: true, title: true, summary: true, scores: true,
            whichTeam: true, fitInFello: true, prototypeThis: true,
            ideas: { select: { id: true, type: true, text: true, status: true } },
          },
        },
      },
    }),
    prisma.brief.findMany({
      where: { status: "READY", date: { gte: sevenDaysAgo } },
      orderBy: { date: "desc" },
      take: 8,
      select: {
        id: true,
        date: true,
        developments: { take: 1, orderBy: { rank: "asc" }, select: { title: true } },
      },
    }),
    prisma.idea.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, type: true, text: true, status: true,
        development: { select: { title: true } },
      },
    }),
    prisma.pattern.findMany({
      orderBy: { frequency: "desc" },
      take: 15,
      select: { theme: true, frequency: true, lastSeen: true },
    }),
    prisma.contextDoc.findMany({ select: { type: true, content: true } }),
  ]);

  // Build context sections
  const today = new Date().toLocaleDateString("en-US", { dateStyle: "full" });

  const felloCtx = contextDocs.find((d) => d.type === "FELLO")?.content ?? "Not configured.";
  const gtmCtx = contextDocs.find((d) => d.type === "GTM")?.content ?? "Not configured.";

  const todayBriefSection = todayBrief
    ? `TODAY'S BRIEF (${todayBrief.date.toLocaleDateString("en-US", { dateStyle: "long" })}):\n` +
      todayBrief.developments
        .map((dev, i) => {
          const scores = JSON.parse(dev.scores) as Record<string, number>;
          const devIdeas = dev.ideas.map((idea) => `    - [${idea.type}] ${ideaTitle(idea.text)} (ID: ${idea.id}, status: ${idea.status})`).join("\n");
          return (
            `${i + 1}. ${dev.title}\n` +
            `   Summary: ${dev.summary}\n` +
            `   Team: ${dev.whichTeam} | Fit: ${dev.fitInFello}\n` +
            `   Scores: ${Object.entries(scores).map(([k, v]) => `${k}=${v}`).join(", ")}\n` +
            `   Prototype: ${dev.prototypeThis}\n` +
            (devIdeas ? `   Ideas:\n${devIdeas}` : "")
          );
        })
        .join("\n\n")
    : "No brief available for today yet.";

  const recentBriefsSection =
    "LAST 7 DAYS BRIEFS:\n" +
    recentBriefs
      .filter((b) => b.id !== todayBrief?.id)
      .slice(0, 7)
      .map((b) => `- ${b.date.toLocaleDateString("en-US", { dateStyle: "medium" })}: ${b.developments[0]?.title ?? "No developments"}`)
      .join("\n");

  const trackerSection =
    "IDEA TRACKER (all ideas):\n" +
    allIdeas
      .map((idea) => `- [${idea.status}] [${idea.type}] ${ideaTitle(idea.text)} | ID: ${idea.id} | Source: ${idea.development.title}`)
      .join("\n");

  const patternsSection =
    "DETECTED PATTERNS:\n" +
    patterns
      .map((p) => `- "${p.theme}" — seen ${p.frequency}x, last ${p.lastSeen.toLocaleDateString("en-US", { dateStyle: "medium" })}`)
      .join("\n");

  const systemPrompt = `You are Scryon's AI assistant — an intelligent briefing companion for the Fello GTM AI team. You have real-time access to Scryon's daily AI intelligence briefs, idea tracker, and pattern data.

Your personality: Direct, smart, and brief. You give sharp answers, not essays. When summarising, use bullets. When answering a specific question, answer it in 2-3 sentences max unless the user asks for more detail.

You can take actions on the tracker when asked. When you move an idea, always confirm exactly what you changed.

You only discuss topics related to Scryon's data and Fello/GTM context. If asked something unrelated, say: "I only have access to Scryon's intelligence data. Ask me about today's brief, your ideas, or past patterns."

When you update a tracker status, you MUST include this JSON on the very last line of your response with nothing after it:
SCRYON_ACTION:{"ideaId":"<exact id from context>","ideaTitle":"<title>","newStatus":"<STATUS>"}
Valid statuses: GENERATED, CONSIDERING, PROTOTYPING, WORKED, FAILED

Current date: ${today}

FELLO CONTEXT:
${felloCtx}

GTM AI TEAM CONTEXT:
${gtmCtx}

${todayBriefSection}

${recentBriefsSection}

${patternsSection}

${trackerSection}`;

  try {
    const rawResponse = await generateChatResponse(
      systemPrompt,
      (body.conversationHistory ?? []).slice(-10),
      body.message
    );

    // Parse and execute tracker action if present
    const lines = rawResponse.split("\n");
    const lastLine = lines[lines.length - 1].trim();
    let action: TrackerAction | null = null;
    let responseText = rawResponse;

    if (lastLine.startsWith("SCRYON_ACTION:")) {
      try {
        const parsed = JSON.parse(lastLine.replace("SCRYON_ACTION:", "").trim()) as TrackerAction;
        if (parsed && VALID_STATUSES.includes(parsed.newStatus)) {
          // Find idea — by ID first, then by title fuzzy match
          let ideaId = parsed.ideaId;
          const ideaExists = await prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true, status: true } });

          if (!ideaExists) {
            const match = allIdeas.find((i) =>
              ideaTitle(i.text).toLowerCase().includes(parsed.ideaTitle.toLowerCase())
            );
            if (match) ideaId = match.id;
          }

          if (ideaId) {
            const existing = await prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true, status: true } });
            if (existing) {
              await prisma.$transaction([
                prisma.idea.update({ where: { id: ideaId }, data: { status: parsed.newStatus } }),
                prisma.ideaActivity.create({
                  data: { ideaId, userId: user.id!, fromStatus: existing.status, toStatus: parsed.newStatus, comment: "Updated via Scryon AI" },
                }),
              ]);
              action = { ideaId, ideaTitle: parsed.ideaTitle, newStatus: parsed.newStatus };
            }
          }
        }
        responseText = lines.slice(0, -1).join("\n").trim();
      } catch {
        // malformed action line — just show response as-is
      }
    }

    return Response.json({ success: true, data: { response: responseText, action } });
  } catch (error) {
    logger.error("Chat failed", { error: String(error) });
    return Response.json({ success: false, error: "Failed to get response" }, { status: 500 });
  }
}
