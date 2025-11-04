import NextAuth from "next-auth";

// Extend JWT token and Session to include the user ID
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}