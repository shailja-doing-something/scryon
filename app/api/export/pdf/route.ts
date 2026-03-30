import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const briefId = searchParams.get("briefId");

  if (!briefId) {
    return Response.json({ success: false, error: "briefId required" }, { status: 400 });
  }

  const brief = await prisma.brief.findUnique({
    where: { id: briefId },
    include: {
      developments: {
        orderBy: { rank: "asc" },
        include: { ideas: true, _count: { select: { upvotes: true } } },
      },
    },
  });

  if (!brief) return Response.json({ success: false, error: "Not found" }, { status: 404 });

  // Build plain-text PDF-friendly content
  const lines: string[] = [
    `Scryon Daily Intelligence Brief`,
    `Date: ${new Date(brief.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    brief.focusArea ? `Focus Area: ${brief.focusArea}` : "",
    "",
    "═══════════════════════════════════════",
    "",
  ];

  for (const dev of brief.developments) {
    const scores = JSON.parse(dev.scores) as Record<string, number>;
    lines.push(`#${dev.rank} — ${dev.title}`);
    lines.push(`Team: ${dev.whichTeam} | Score: ${scores.weighted?.toFixed(2) ?? "N/A"}`);
    lines.push("");
    lines.push("SUMMARY");
    lines.push(dev.summary);
    lines.push("");

    if (dev.fitInFello) {
      lines.push("WHERE IT FITS IN FELLO");
      lines.push(dev.fitInFello);
      lines.push("");
    }

    const immediate = dev.ideas.filter((i) => i.type === "IMMEDIATE");
    if (immediate.length) {
      lines.push("IMMEDIATE USE CASES");
      immediate.forEach((idea, idx) => lines.push(`  ${idx + 1}. ${idea.text}`));
      lines.push("");
    }

    const strategic = dev.ideas.filter((i) => i.type === "STRATEGIC");
    if (strategic.length) {
      lines.push("STRATEGIC BETS");
      strategic.forEach((idea, idx) => lines.push(`  ${idx + 1}. ${idea.text}`));
      lines.push("");
    }

    const wild = dev.ideas.find((i) => i.type === "WILD");
    if (wild) {
      lines.push("WILD IDEA");
      lines.push(`  ${wild.text}`);
      lines.push("");
    }

    if (dev.prototypeThis) {
      lines.push("PROTOTYPE THIS WEEK");
      lines.push(dev.prototypeThis);
      lines.push("");
    }

    if (dev.ignoreConsequence) {
      lines.push("IF WE IGNORE THIS");
      lines.push(dev.ignoreConsequence);
      lines.push("");
    }

    lines.push("───────────────────────────────────────");
    lines.push("");
  }

  const text = lines.filter((l) => l !== undefined).join("\n");

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="scryon-brief-${briefId}.txt"`,
    },
  });
}
