import { prisma } from "@/lib/prisma";
import { TrackerClient } from "./TrackerClient";

export default async function TrackerPage() {
  const ideas = await prisma.idea.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      development: {
        select: { id: true, title: true, briefId: true },
      },
      activities: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  return <TrackerClient ideas={ideas} />;
}
