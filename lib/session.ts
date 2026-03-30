import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
};

export async function getSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as { id?: string; role?: string; name?: string | null; email?: string | null };
  if (!user.id) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role ?? "MEMBER",
  };
}
