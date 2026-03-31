import { prisma } from "@/lib/prisma";
import { ArchiveClient } from "./ArchiveClient";

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

  return <ArchiveClient briefs={briefs} />;
}
