import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();

  // Get today's latest ready brief, or the most recent one
  const brief = await prisma.brief.findFirst({
    where: { status: "READY" },
    orderBy: { date: "desc" },
    include: {
      developments: {
        orderBy: { rank: "asc" },
        include: {
          ideas: { orderBy: { createdAt: "asc" } },
          comments: {
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { upvotes: true } },
        },
      },
    },
  });

  // Check for a failed brief more recent than the last ready one
  const failedBrief = await prisma.brief.findFirst({
    where: { status: "FAILED" },
    orderBy: { generatedAt: "desc" },
    select: { id: true, generatedAt: true },
  });

  const hasFailed =
    !!failedBrief &&
    (!brief || new Date(failedBrief.generatedAt) > new Date(brief.date));

  const patternSummary = await prisma.pattern.findMany({
    where: { frequency: { gte: 3 } },
    orderBy: { frequency: "desc" },
    take: 5,
    select: { id: true, theme: true, frequency: true, lastSeen: true },
  });

  return (
    <DashboardClient
      brief={brief}
      patternSummary={patternSummary}
      currentUserId={session!.id}
      hasFailed={hasFailed}
    />
  );
}
