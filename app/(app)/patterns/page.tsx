import { prisma } from "@/lib/prisma";

export default async function PatternsPage() {
  const patterns = await prisma.pattern.findMany({
    orderBy: { frequency: "desc" },
    include: {
      briefIds: {
        include: { brief: { select: { id: true, date: true } } },
        orderBy: { brief: { date: "desc" } },
      },
    },
  });

  const strategyWorthy = patterns.filter((p) => p.frequency >= 3);
  const emerging = patterns.filter((p) => p.frequency >= 2 && p.frequency < 3);
  const oneOff = patterns.filter((p) => p.frequency < 2);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-hi">Pattern Watch</h1>
        <p className="text-sm text-mid mt-1">
          Recurring themes across your daily intelligence briefs
        </p>
      </div>

      {patterns.length === 0 && (
        <div className="text-center py-16 text-lo">
          <p>No patterns detected yet. Generate at least 2 briefs to see patterns.</p>
        </div>
      )}

      {strategyWorthy.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-hi">Strategy-Worthy</h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium text-err"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              3+ days
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategyWorthy.map((p) => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
        </section>
      )}

      {emerging.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-hi mb-4">Emerging</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {emerging.map((p) => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
        </section>
      )}

      {oneOff.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-hi mb-4">One-Off Signals</h2>
          <div className="flex flex-wrap gap-2">
            {oneOff.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1.5 rounded-lg text-sm text-mid"
                style={{ background: "#0F0F1A", border: "1px solid #2A2A45" }}
              >
                {p.theme}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface PatternCardProps {
  pattern: {
    id: string;
    theme: string;
    frequency: number;
    firstSeen: Date;
    lastSeen: Date;
    briefIds: { brief: { id: string; date: Date } }[];
  };
}

function PatternCard({ pattern }: PatternCardProps) {
  return (
    <div className="bg-surface border border-rim rounded-xl p-4 hover:border-accent/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-hi text-sm capitalize">{pattern.theme}</h3>
        <span className="text-lg font-bold text-accent-hi font-mono">{pattern.frequency}×</span>
      </div>
      <p className="text-xs text-lo mt-1">
        First:{" "}
        {new Date(pattern.firstSeen).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </p>
      <p className="text-xs text-lo">
        Last:{" "}
        {new Date(pattern.lastSeen).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </p>
      {pattern.frequency >= 3 && (
        <span
          className="mt-3 inline-block text-xs px-2 py-0.5 rounded-full font-medium text-err"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          Strategy-worthy
        </span>
      )}
    </div>
  );
}
