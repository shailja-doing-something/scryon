import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

function validateToken(request: NextRequest): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7).trim();
  const expected = process.env.EXTENSION_TOKEN;
  if (!expected) return false;
  return token === expected;
}

export async function GET(request: NextRequest) {
  if (!validateToken(request)) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const [todayBrief, allIdeasCount] = await Promise.all([
    prisma.brief.findFirst({
      where: { status: "READY" },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        developments: {
          orderBy: { rank: "asc" },
          take: 3,
          select: {
            id: true,
            title: true,
            summary: true,
            scores: true,
            rank: true,
            whichTeam: true,
            fitInFello: true,
            ideas: {
              where: { type: "IMMEDIATE" },
              take: 3,
              select: { text: true },
            },
          },
        },
      },
    }),
    prisma.idea.count(),
  ]);

  const [ideasConsidering] = await Promise.all([
    prisma.idea.count({ where: { status: "CONSIDERING" } }),
  ]);

  if (!todayBrief) {
    return Response.json({
      success: true,
      data: {
        date: today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
        totalDevelopments: 0,
        avgScore: 0,
        topDevelopments: [],
        ideasInTracker: allIdeasCount,
        ideasConsidering,
      },
    });
  }

  const allDevsForAvg = await prisma.development.findMany({
    where: { briefId: todayBrief.id },
    select: { scores: true },
  });

  const avgScore =
    allDevsForAvg.length > 0
      ? (
          allDevsForAvg.reduce((sum, d) => {
            const s = JSON.parse(d.scores || "{}") as { weighted?: number };
            return sum + (s.weighted ?? 0);
          }, 0) / allDevsForAvg.length
        ).toFixed(1)
      : "0.0";

  const topDevelopments = todayBrief.developments.map((dev, i) => {
    const scores = JSON.parse(dev.scores || "{}") as { weighted?: number };
    const immediateIdeas = dev.ideas.map((idea) => idea.text.split("\n")[0] ?? idea.text);
    return {
      rank: dev.rank || i + 1,
      title: dev.title,
      summary: dev.summary,
      score: scores.weighted ?? 0,
      whichTeam: dev.whichTeam,
      fitInFello: dev.fitInFello,
      immediateIdeas,
    };
  });

  return Response.json({
    success: true,
    data: {
      date: todayBrief.date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      totalDevelopments: allDevsForAvg.length,
      avgScore,
      topDevelopments,
      ideasInTracker: allIdeasCount,
      ideasConsidering,
    },
  });
}
