import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        try {
          // Find or create user (first user becomes OWNER)
          const existingUsers = await prisma.user.count();
          const role = existingUsers === 0 ? "OWNER" : "MEMBER";

          let user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: { id: true, email: true, name: true, role: true },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: credentials.email,
                name: credentials.name ?? credentials.email.split("@")[0],
                role,
              },
              select: { id: true, email: true, name: true, role: true },
            });
            logger.info("New user created", { email: user.email, role: user.role });
          }

          return { id: user.id, email: user.email, name: user.name, role: user.role };
        } catch (error) {
          logger.error("Auth error", { error: String(error) });
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "MEMBER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};
