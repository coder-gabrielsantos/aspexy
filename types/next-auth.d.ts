import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    /** URL da foto de perfil (ex.: Google userinfo `picture`) */
    picture?: string | null;
  }
}
