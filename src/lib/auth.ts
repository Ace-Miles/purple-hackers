import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;
        if (user.status === "BANNED") return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        await prisma.user.update({
          where: { id: user.id },
          data: { lastSeen: new Date() },
        });
        return {
          id: user.id,
          email: user.email,
          name: user.username,
          image: user.avatar,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        // Fetch fresh role
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true, avatar: true, reputation: true, title: true, username: true },
        });
        if (dbUser) {
          (session.user as any).role = dbUser.role;
          (session.user as any).status = dbUser.status;
          (session.user as any).avatar = dbUser.avatar;
          (session.user as any).reputation = dbUser.reputation;
          (session.user as any).title = dbUser.title;
          (session.user as any).username = dbUser.username;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
