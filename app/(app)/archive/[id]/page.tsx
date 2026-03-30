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

  const totalIdeas = brief.developments.reduce((s, d) => s + d.ideas.length, 0);

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <div className="animate-fade-up">
        <Link
          href="/archive"
          className="inline-flex items-center gap-1.5 text-sm text-lo hover:text-accent-hi transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Archive
        </Link>
      </div>

      {/* Header card */}
      <div
        className="rounded-2xl p-6 animate-fade-up relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(123,92,240,0.08), rgba(15,15,26,1))",
          border: "1px solid rgba(123,92,240,0.2)",
        }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)" }} />

        <div className="flex items-start justify-between relative">
          <div>
            <p className="text-xs text-lo uppercase tracking-widest mb-2">{dateStr}</p>
            <h1 className="text-2xl font-bold text-hi">Intelligence Brief</h1>
            {brief.focusArea && (
              <p className="text-sm text-accent-hi mt-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Focus: {brief.focusArea}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <span className="text-xs text-lo flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-accent-hi font-semibold font-mono">{brief.developments.length}</span> developments
              </span>
              <span className="text-xs text-lo flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-accent-hi font-semibold font-mono">{totalIdeas}</span> ideas
              </span>
            </div>
          </div>
          <a
            href={`/api/export/pdf?briefId=${brief.id}`}
            className="btn-ghost px-4 py-2 text-sm rounded-xl font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </a>
        </div>
      </div>

      {/* Developments */}
      <div className="space-y-4">
        {brief.developments.map((dev, i) => (
          <div key={dev.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <DevelopmentCard dev={dev} currentUserId={session?.id ?? ""} />
          </div>
        ))}
      </div>
    </div>
  );
}
