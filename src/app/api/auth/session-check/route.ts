import bcrypt from "bcryptjs";
import { z } from "zod";
import { handle, json, assertSameOrigin, getClientIp } from "@/lib/api";
import { rateLimit, POLICIES } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { redis, sessionKey } from "@/lib/redis";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

/**
 * Pre-login probe: validates credentials and reports whether the account
 * already holds an active session on another device — so the login screen can
 * warn the operative and offer a takeover before signing in. Admin accounts
 * allow concurrent sessions, so they never report an active session.
 */
export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    await rateLimit({ ...POLICIES.login, id: getClientIp(req) });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ valid: false, hasActiveSession: false });
    const email = parsed.data.email.toLowerCase();

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (adminEmail && email === adminEmail) {
      const valid = !!process.env.ADMIN_PASSWORD && parsed.data.password === process.env.ADMIN_PASSWORD;
      return json({ valid, hasActiveSession: false });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return json({ valid: false, hasActiveSession: false });

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return json({ valid: false, hasActiveSession: false });

    const active = await redis.get(sessionKey(user.id));
    return json({ valid: true, hasActiveSession: !!active });
  });
}
