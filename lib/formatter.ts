interface Development {
  title: string;
  fitInFello: string;
  _count?: { upvotes: number };
}

interface Brief {
  id: string;
  date: Date | string;
  developments: Development[];
}

export function formatSlackMessage(brief: Brief): string {
  const dateStr = new Date(brief.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines: string[] = [`*Scryon Intel — ${dateStr}*`, ""];

  const top5 = brief.developments.slice(0, 5);
  for (const dev of top5) {
    const implication = dev.fitInFello
      ? dev.fitInFello.slice(0, 120) + (dev.fitInFello.length > 120 ? "…" : "")
      : "See full brief for details.";
    lines.push(`• *${dev.title}*: ${implication}`);
  }

  // Top upvoted idea (sort by upvotes)
  const sorted = [...brief.developments].sort(
    (a, b) => (b._count?.upvotes ?? 0) - (a._count?.upvotes ?? 0)
  );
  if (sorted[0]) {
    lines.push("");
    lines.push(`*Top idea:* ${sorted[0].title}`);
  }

  lines.push("");
  lines.push(`Full brief: ${process.env.NEXTAUTH_URL ?? ""}/dashboard`);

  return lines.join("\n");
}
