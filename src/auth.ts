import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { redis, sessionKey, CHANNELS } from "@/lib/redis";
import { ADMIN_ID } from "@/lib/config";

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

        // Admin: authenticated from env creds (no DB row). Checked first so the
        // admin email can never be a regular account.
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        if (adminEmail && email === adminEmail) {
          if (process.env.ADMIN_PASSWORD && parsed.data.password === process.env.ADMIN_PASSWORD) {
            return { id: ADMIN_ID, email: adminEmail, role: "ADMIN", tokenVersion: 0 };
          }
          return null;
        }

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
      // Only regular users are pinned to a single device; admin may log in
      // concurrently on multiple devices. On sign-in we take over the active
      // session and, if a different device held it, push a real-time revoke to
      // that device's session channel so it logs out immediately.
      if (params.user && token && token.role !== "ADMIN") {
        const prevSid = await redis.get(sessionKey(token.userId));
        await redis.set(sessionKey(token.userId), token.sid);
        if (prevSid && prevSid !== token.sid) {
          await redis.publish(CHANNELS.session(prevSid), JSON.stringify({ type: "sessionRevoked" }));
        }
      }
      return token;
    },
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : undefined;
      // Only clear the active-session record if THIS device still owns it.
      // A device that was kicked (its sid is no longer active) must not delete
      // the record now held by the device that took over.
      if (token?.userId) {
        const active = await redis.get(sessionKey(token.userId));
        if (active && active === token.sid) await redis.del(sessionKey(token.userId));
      }
    },
  },
});
