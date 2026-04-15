import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleEnabled = Boolean(googleClientId && googleClientSecret);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // Sem MongoDB adapter no login: OAuth + JWT apenas. O adapter costuma gerar erro "Callback"
  // se o Atlas bloquear IP, credencial ou gravação de usuário na hora do retorno do Google.
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
    async jwt({ token, user, profile }) {
      if (user) {
        token.id = user.id;
        // Google envia `picture` no perfil OpenID; `user.image` nem sempre vem preenchido no JWT flow.
        const fromProfile =
          profile && typeof profile === "object" && "picture" in profile
            ? String((profile as { picture?: string }).picture ?? "").trim()
            : "";
        const fromUser = typeof user.image === "string" ? user.image.trim() : "";
        const picture = fromUser || fromProfile || undefined;
        if (picture) token.picture = picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Com Google OAuth sem adapter, `sub` e o id estavel do usuario no provedor.
        session.user.id = (token.id as string) ?? (token.sub as string);
        if (typeof token.picture === "string") {
          session.user.image = token.picture;
        }
      }
      return session;
    }
  }
};
