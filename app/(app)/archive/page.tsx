import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ArchivePage() {
  const briefs = await prisma.brief.findMany({
    where: { status: "READY" },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      focusArea: true,
      status: true,
      generatedAt: true,
      _count: { select: { developments: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hi">Archive</h1>
        <p className="text-sm text-mid mt-1">All past intelligence briefs</p>
      </div>

      {briefs.length === 0 ? (
        <div className="text-center py-16 text-lo">
          <p className="text-lg text-mid">No briefs yet</p>
          <p className="text-sm mt-1">Generate your first brief from the dashboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {briefs.map((brief) => (
            <Link
              key={brief.id}
              href={`/archive/${brief.id}`}
              className="block bg-surface border border-rim rounded-xl p-4 hover:border-accent/40 hover:bg-elevated transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-hi group-hover:text-accent-hi transition-colors">
                    {new Date(brief.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {brief.focusArea && (
                    <p className="text-sm text-accent-hi mt-0.5">Focus: {brief.focusArea}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-mid">
                    {brief._count.developments} developments
                  </span>
                  <p className="text-xs text-lo mt-0.5">
                    Generated{" "}
                    {new Date(brief.generatedAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
