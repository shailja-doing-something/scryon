import { prisma } from "@/lib/prisma";
import { SourcesClient } from "./SourcesClient";

export default async function SourcesPage() {
  const sources = await prisma.source.findMany({ orderBy: { label: "asc" } });
  return <SourcesClient sources={sources} />;
}
