import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { DevelopmentCard } from "@/components/DevelopmentCard";
import Link from "next/link";

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  const brief = await prisma.brief.findUnique({
    where: { id },
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

  if (!brief) notFound();

  const dateStr = new Date(brief.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/archive" className="text-sm text-lo hover:text-accent-hi transition-colors">
          ← Archive
        </Link>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-lo mb-1 uppercase tracking-wider">{dateStr}</p>
          <h1 className="text-2xl font-bold text-hi">Intelligence Brief</h1>
          {brief.focusArea && (
            <p className="text-sm text-accent-hi mt-1">Focus: {brief.focusArea}</p>
          )}
        </div>
        <a
          href={`/api/export/pdf?briefId=${brief.id}`}
          className="px-3 py-1.5 text-sm border border-rim rounded-lg hover:bg-elevated font-medium text-mid hover:text-hi transition-all"
        >
          Export
        </a>
      </div>

      <div className="space-y-4">
        {brief.developments.map((dev) => (
          <DevelopmentCard
            key={dev.id}
            dev={dev}
            currentUserId={session?.id ?? ""}
          />
        ))}
      </div>
    </div>
  );
}
