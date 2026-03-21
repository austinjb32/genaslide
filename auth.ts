import { PrismaClient } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare, hash } from "bcryptjs";

const prisma = new PrismaClient();

if (!process.env.AUTH_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production");
  }
  console.warn("WARNING: AUTH_SECRET not set. Using development secret.");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || "development-secret-do-not-use-in-production",
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/presentations",
        },
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        isSignUp: { label: "Is Sign Up", type: "text" },
      },
      async authorize(credentials) {
        const { email, password, name, isSignUp } = credentials as {
          email: string;
          password: string;
          name?: string;
          isSignUp?: string;
        };

        if (isSignUp === "true") {
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) {
            if (existing.password) {
              throw new Error("Email already registered. Please sign in instead.");
            }
            const hashedPassword = await hash(password, 10);
            const updated = await prisma.user.update({
              where: { id: existing.id },
              data: {
                password: hashedPassword,
                name: name || existing.name,
              },
            });
            return { id: updated.id, email: updated.email, name: updated.name };
          }
          const hashedPassword = await hash(password, 10);
          const newUser = await prisma.user.create({
            data: {
              email,
              password: hashedPassword,
              name: name || email.split("@")[0],
            },
          });
          return { id: newUser.id, email: newUser.email, name: newUser.name };
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw new Error("Invalid credentials");
        }
        if (!user.password) {
          throw new Error("Please sign in with Google for this account");
        }
        const isValid = await compare(password, user.password);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      console.log("Google signIn callback:", { email: user.email, account: !!account, provider: account?.provider });
      if (account?.provider === "google") {
        const existing = await prisma.user.findUnique({ where: { email: user.email! } });
        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              googleAccessToken: account.access_token,
              googleRefreshToken: account.refresh_token,
            },
          });
        } else {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || user.email!.split("@")[0],
              password: "",
              googleAccessToken: account.access_token,
              googleRefreshToken: account.refresh_token,
            },
          });
        }
      }
      return true;
    },
  },
  trustHost: true,
});
