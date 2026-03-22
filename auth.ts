import { PrismaClient } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare, hash } from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      userType?: string;
    };
  }
}

const prisma = new PrismaClient();

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "development-secret-fallback",
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

        const user = await prisma.user.findUnique({ where: { email } });

        if (isSignUp === "true") {
          if (user) {
            if (user.password && user.password.length > 0) {
              throw new Error("Email already registered. Please sign in instead.");
            }
            const hashedPassword = await hash(password, 10);
            const updated = await prisma.user.update({
              where: { id: user.id },
              data: {
                password: hashedPassword,
                name: name || user.name,
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

        if (!user) {
          throw new Error("Invalid credentials");
        }

        if (!user.password || user.password.length === 0) {
          throw new Error("Please sign in with Google or set up a password");
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
    async jwt({ token, user, account, trigger }) {
      if (trigger === "signIn" || trigger === "signUp") {
        if (account?.provider === "google" && user?.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (existingUser) {
            token.sub = existingUser.id;
          }
        } else if (account?.provider === "credentials" && user?.id) {
          token.sub = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        if (token.sub) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: { userType: true },
          });
          if (dbUser) {
            session.user.userType = dbUser.userType;
          }
        }
      }
      return session;
    },
    async signIn({ user, account }) {
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
          return true;
        } else {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || user.email!.split("@")[0],
              password: "",
              userType: "customer",
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
