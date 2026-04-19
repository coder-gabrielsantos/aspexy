import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import {
  CREDENTIALS_AUTH_METHOD_EMAIL,
  CREDENTIALS_AUTH_METHOD_OAUTH,
  CREDENTIALS_DISPLAY_NAME_MAX,
  CREDENTIALS_USERS_COLLECTION,
  defaultDisplayNameFromEmail,
  normalizeEmail
} from "@/lib/credentials-user";
import { ensureCredentialsUsersIndexes } from "@/lib/credentials-users-index";
import clientPromise from "@/lib/mongodb";
import { verifyPassword } from "@/lib/password";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleEnabled = Boolean(googleClientId && googleClientSecret);

async function authorizeCredentials(email: string, password: string) {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) return null;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB ?? "aspexy");
  const doc = await db.collection(CREDENTIALS_USERS_COLLECTION).findOne<{
    _id: { toString(): string };
    email: string;
    password_hash: string;
    name?: string;
  }>({ email: normalized, auth_method: CREDENTIALS_AUTH_METHOD_EMAIL });

  if (!doc?.password_hash) return null;
  const match = await verifyPassword(password, doc.password_hash);
  if (!match) return null;

  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name || undefined,
    image: null as string | null
  };
}

async function upsertGoogleCredentialsUser(params: {
  email: string;
  name: string | null;
  image: string | null;
}): Promise<{ id: string; name: string }> {
  const email = normalizeEmail(params.email);
  if (!email) throw new Error("E-mail ausente no perfil Google.");

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB ?? "aspexy");
  const coll = db.collection(CREDENTIALS_USERS_COLLECTION);
  await ensureCredentialsUsersIndexes(coll);

  const now = new Date();
  const fromGoogle = (params.name ?? "").trim();
  const name = (fromGoogle || defaultDisplayNameFromEmail(email)).slice(0, CREDENTIALS_DISPLAY_NAME_MAX);
  const image = (params.image ?? "").trim() || null;

  const doc = await coll.findOneAndUpdate(
    { email, auth_method: CREDENTIALS_AUTH_METHOD_OAUTH },
    {
      $set: {
        updated_at: now,
        name,
        image
      },
      $setOnInsert: {
        email,
        auth_method: CREDENTIALS_AUTH_METHOD_OAUTH,
        created_at: now
      }
    },
    { upsert: true, returnDocument: "after" }
  );

  const id = doc?._id;
  if (!id) throw new Error("Falha ao sincronizar conta Google.");
  return { id: id.toString(), name };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60
  },
  debug: process.env.NODE_ENV === "development",
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "E-mail",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;
        return authorizeCredentials(email, password);
      }
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: googleClientId!,
            clientSecret: googleClientSecret!
          })
        ]
      : [])
  ],
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        const fromProfile =
          profile && typeof profile === "object" && "picture" in profile
            ? String((profile as { picture?: string }).picture ?? "").trim()
            : "";
        const fromUser = typeof user.image === "string" ? user.image.trim() : "";
        const picture = (fromUser || fromProfile || "").trim() || null;

        if (account?.provider === "google" && user.email) {
          const { id: mongoId, name: storedName } = await upsertGoogleCredentialsUser({
            email: user.email,
            name: typeof user.name === "string" ? user.name : null,
            image: picture
          });
          token.id = mongoId;
          token.email = normalizeEmail(user.email);
          token.name = storedName;
          if (picture) token.picture = picture;
        } else {
          token.id = user.id;
          if (user.email) token.email = user.email;
          if (user.name) token.name = user.name;
          if (picture) token.picture = picture;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? (token.sub as string);
        if (typeof token.email === "string" && token.email) {
          session.user.email = token.email;
        }
        if (typeof token.name === "string" && token.name) {
          session.user.name = token.name;
        }
        if (typeof token.picture === "string") {
          session.user.image = token.picture;
        }
      }
      return session;
    }
  }
};
