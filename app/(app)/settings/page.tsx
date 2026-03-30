import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getSession();

  const settings = await prisma.settings.findUnique({
    where: { userId: session!.id },
    select: {
      briefTime: true,
      timezone: true,
      emailDigest: true,
      emailRecipients: true,
    },
  });

  return (
    <SettingsClient
      settings={
        settings ?? {
          briefTime: "08:00",
          timezone: "America/New_York",
          emailDigest: true,
          emailRecipients: "[]",
        }
      }
    />
  );
}
