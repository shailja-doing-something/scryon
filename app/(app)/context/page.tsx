import { prisma } from "@/lib/prisma";
import { ContextClient } from "./ContextClient";
import { getSession } from "@/lib/session";

export default async function ContextPage() {
  const session = await getSession();

  const docs = await prisma.contextDoc.findMany({
    select: { id: true, type: true, content: true, updatedAt: true },
  });

  const fello = docs.find((d) => d.type === "FELLO");
  const gtm = docs.find((d) => d.type === "GTM");

  return (
    <ContextClient
      felloContent={fello?.content ?? ""}
      gtmContent={gtm?.content ?? ""}
      felloUpdatedAt={fello?.updatedAt?.toISOString() ?? null}
      gtmUpdatedAt={gtm?.updatedAt?.toISOString() ?? null}
      userRole={session?.role ?? "MEMBER"}
    />
  );
}
