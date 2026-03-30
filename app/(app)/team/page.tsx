import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TeamClient } from "./TeamClient";

export default async function TeamPage() {
  const session = await getSession();

  const [users, activityLog] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.ideaActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true } },
        idea: { select: { id: true, text: true } },
      },
    }),
  ]);

  return (
    <TeamClient
      users={users}
      activityLog={activityLog}
      currentUserId={session!.id}
      currentUserRole={session!.role}
    />
  );
}
