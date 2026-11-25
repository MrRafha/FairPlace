import { getServerSession, type NextAuthOptions } from "next-auth";
import { connection } from "next/server";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/validations/common";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rateLimit";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 dias

// Limites de tentativa de login (janela de 15 min).
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_PER_EMAIL = 5;
const LOGIN_MAX_PER_IP = 20;

// Hash fictício (bcrypt cost 12): roda o compare mesmo quando o e-mail não
// existe, para o tempo de resposta não revelar quem tem conta.
const DUMMY_HASH = "$2b$12$ghEvDGJm7ErVoX0XSKr4GeHIiIDcyTs7w.cOqefrdubjSALcLeXvO";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, req) {
        const email = normalizeEmail(credentials?.email);
        const password = credentials?.password;
        if (!email || typeof password !== "string" || password.length === 0 || password.length > 200) {
          return null;
        }

        // Rate limit por IP e por e-mail (brute force / credential stuffing).
        const ip = clientIp(req?.headers);
        const byIp = rateLimit(`login:ip:${ip}`, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS);
        const byEmail = rateLimit(`login:email:${email}`, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_MS);
        if (byIp.limited || byEmail.limited) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        const isValidPassword = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
        if (!user?.password || !isValidPassword) {
          return null;
        }

        resetRateLimit(`login:email:${email}`);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ account, profile }) {
      // Google: só aceita e-mail verificado pelo Google.
      if (account?.provider === "google") {
        return Boolean((profile as { email_verified?: boolean } | undefined)?.email_verified && profile?.email);
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          // Sem adapter, o id do NextAuth seria o `sub` do Google (que não existe
          // na tabela User). Busca/cria o usuário pelo e-mail verificado.
          const email = normalizeEmail(user.email);
          if (!email) return {};
          const dbUser =
            (await prisma.user.findUnique({ where: { email } })) ??
            (await prisma.user.create({ data: { email, name: user.name ?? null, image: user.image ?? null } }));
          token.id = dbUser.id;
          token.role = dbUser.role;
        } else {
          token.id = user.id;
          token.role = (user as { role?: string }).role;
        }
        token.loginAt = Math.floor(Date.now() / 1000);
        return token;
      }

      // Revalida a cada uso: conta apagada ou senha trocada depois do login
      // invalidam o token (um cookie roubado não sobrevive à troca de senha).
      if (!token.id) return {};
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: { role: true, passwordChangedAt: true },
      });
      if (!dbUser) return {};
      const issuedAt = typeof token.loginAt === "number" ? token.loginAt : 0;
      if (dbUser.passwordChangedAt && Math.floor(dbUser.passwordChangedAt.getTime() / 1000) > issuedAt) {
        return {};
      }
      token.role = dbUser.role;
      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        // Token invalidado no callback jwt: trata como deslogado.
        return { ...session, user: undefined } as unknown as typeof session;
      }
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};

// Lê a sessão do usuário atual. O `connection()` avisa o Next (cacheComponents)
// que isto depende da requisição — sem ele, o getServerSession gera bytes
// aleatórios durante o prerender e o Next acusa erro em /mapa, /conta etc.
export async function getSession() {
  await connection();
  return getServerSession(authOptions);
}
