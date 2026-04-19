import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      loginProvider?: "google" | "credentials";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string | null;
    /** URL da foto de perfil (ex.: Google userinfo `picture`) */
    picture?: string | null;
    loginProvider?: "google" | "credentials";
  }
}
