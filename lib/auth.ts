/**
 * lib/auth.ts — NextAuth v5 configuration
 * Uses JWT strategy (no DB adapter required for sessions)
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            image: true,
            emailVerifiedAt: true,
          },
        });

        if (!user || !user.password) return null;
        if (!user.emailVerifiedAt) return null;

        let isValid = false;
        const looksHashed = user.password.startsWith("$2a$") || user.password.startsWith("$2b$");

        if (looksHashed) {
          isValid = await bcrypt.compare(password, user.password);
        } else {
          // Backward-compatible login for legacy plain-text passwords.
          isValid = password === user.password;

          if (isValid) {
            const hashed = await bcrypt.hash(password, 12);
            await prisma.user.update({
              where: { id: user.id },
              data: { password: hashed },
            });
          }
        }

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email as string;
        session.user.image = token.image as string | null | undefined;
      }
      return session;
    },
  },
  trustHost: true,
});
