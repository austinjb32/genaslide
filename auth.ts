import { PrismaClient } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";

const prisma = new PrismaClient();

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
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
            throw new Error("User already exists");
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
  },
  trustHost: true,
});
