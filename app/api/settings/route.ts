import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id?: string };
  if (!user.id) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.settings.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      briefTime: true,
      timezone: true,
      emailDigest: true,
      emailRecipients: true,
    },
  });

  return Response.json({
    success: true,
    data: settings ?? {
      briefTime: "08:00",
      timezone: "America/New_York",
      emailDigest: true,
      emailRecipients: "[]",
    },
  });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id?: string };
  if (!user.id) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    briefTime?: string;
    timezone?: string;
    emailDigest?: boolean;
    emailRecipients?: string[];
  };

  const data = {
    ...(body.briefTime !== undefined && { briefTime: body.briefTime }),
    ...(body.timezone !== undefined && { timezone: body.timezone }),
    ...(body.emailDigest !== undefined && { emailDigest: body.emailDigest }),
    ...(body.emailRecipients !== undefined && {
      emailRecipients: JSON.stringify(body.emailRecipients),
    }),
  };

  const settings = await prisma.settings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
    select: {
      id: true,
      briefTime: true,
      timezone: true,
      emailDigest: true,
      emailRecipients: true,
    },
  });

  return Response.json({ success: true, data: settings });
}
