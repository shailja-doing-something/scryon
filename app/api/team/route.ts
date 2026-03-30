import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return Response.json({ success: true, data: users });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { email?: string; name?: string };
  if (!body.email) {
    return Response.json({ success: false, error: "email is required" }, { status: 400 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    // Send invite email
    await resend.emails.send({
      from: "Scryon <noreply@scryon.app>",
      to: body.email,
      subject: "You've been invited to Scryon",
      html: `<p>You've been invited to join Scryon, Fello's AI intelligence platform.</p>
<p>Visit <a href="${process.env.NEXTAUTH_URL}/login">your Scryon instance</a> and sign in with this email address to get started.</p>`,
    });

    logger.info("Invite sent", { to: body.email });
    return Response.json({ success: true, data: { invited: body.email } });
  } catch (error) {
    logger.error("Failed to send invite", { error: String(error) });
    return Response.json({ success: false, error: "Failed to send invite" }, { status: 500 });
  }
}
