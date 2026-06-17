import type { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    sid?: string;
    user: {
      id: string;
      role: Role;
      email: string;
    };
  }

  interface User {
    role: Role;
    tokenVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: Role;
    sid: string;
    tokenVersion: number;
  }
}
