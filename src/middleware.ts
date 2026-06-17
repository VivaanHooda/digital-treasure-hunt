import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge middleware uses ONLY the edge-safe config (no Redis/Prisma/bcrypt).
// The authoritative single-device/revocation check happens in route handlers.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Run on app routes, skip Next internals, the auth API, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)"],
};
