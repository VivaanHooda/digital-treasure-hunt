import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { redis, sessionKey } from "@/lib/redis";

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Run the edge-safe jwt first, then record the active session id in Redis
    // (Node-only) to enforce single-device login + revocation.
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      if (params.user && token) {
        await redis.set(sessionKey(token.userId), token.sid);
      }
      return token;
    },
  },
  events: {
    async signOut(message) {
      const userId = "token" in message ? message.token?.userId : undefined;
      if (userId) await redis.del(sessionKey(userId));
    },
  },
});
