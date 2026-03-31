import { prisma } from "@/lib/prisma";
import { PatternsClient } from "./PatternsClient";

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

  return <PatternsClient patterns={patterns} />;
}
