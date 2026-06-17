import type { NextAuthConfig } from "next-auth";

// EDGE-SAFE config shared with middleware. Must not import Prisma, Redis,
// bcrypt, or anything Node-only. Providers are added in src/auth.ts.
export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    // Copy identity onto the token at sign-in (edge-safe; randomUUID works on edge).
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.role = user.role;
        token.tokenVersion = user.tokenVersion ?? 0;
        token.sid = globalThis.crypto.randomUUID();
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.sid = token.sid;
      }
      return session;
    },
    // Route gating for middleware. Returning false redirects to signIn.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;

      if (pathname.startsWith("/admin")) {
        return isLoggedIn && role === "ADMIN";
      }
      const protectedPaths = ["/dashboard", "/game", "/leaderboard"];
      if (protectedPaths.some((p) => pathname.startsWith(p))) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
