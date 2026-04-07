import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleEnabled = Boolean(googleClientId && googleClientSecret);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // Sem MongoDB adapter no login: OAuth + JWT apenas. O adapter costuma gerar erro "Callback"
  // se o Atlas bloquear IP, credencial ou gravacao de usuario na hora do retorno do Google.
  // Os perfis da escola continuam salvos via API em `school_profiles`.
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60
  },
  debug: process.env.NODE_ENV === "development",
  providers: googleEnabled
    ? [
        GoogleProvider({
          clientId: googleClientId!,
          clientSecret: googleClientSecret!
        })
      ]
    : [],
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Com Google OAuth sem adapter, `sub` e o id estavel do usuario no provedor.
        session.user.id = (token.id as string) ?? (token.sub as string);
      }
      return session;
    }
  }
};
