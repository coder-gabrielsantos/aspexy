import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { ObjectId } from "mongodb";

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
    image?: string | null;
  }>({ email: normalized, auth_method: CREDENTIALS_AUTH_METHOD_EMAIL });

  if (!doc?.password_hash) return null;
  const match = await verifyPassword(password, doc.password_hash);
  if (!match) return null;

  const img = typeof doc.image === "string" && doc.image.trim() ? doc.image.trim() : null;

  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name || undefined,
    image: img
  };
}

async function upsertGoogleCredentialsUser(params: {
  email: string;
  name: string | null;
  image: string | null;
}): Promise<{ id: string; name: string; image: string | null }> {
  const email = normalizeEmail(params.email);
  if (!email) throw new Error("E-mail ausente no perfil Google.");

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB ?? "aspexy");
  const coll = db.collection(CREDENTIALS_USERS_COLLECTION);
  await ensureCredentialsUsersIndexes(coll);

  const now = new Date();
  const fromGoogle = (params.name ?? "").trim();
  const googleName = (fromGoogle || defaultDisplayNameFromEmail(email)).slice(0, CREDENTIALS_DISPLAY_NAME_MAX);
  const googleImage = (params.image ?? "").trim() || null;

  const existing = await coll.findOne<{ _id: { toString(): string }; name?: string; image?: string | null }>({
    email,
    auth_method: CREDENTIALS_AUTH_METHOD_OAUTH
  });

  if (!existing) {
    await coll.insertOne({
      email,
      auth_method: CREDENTIALS_AUTH_METHOD_OAUTH,
      name: googleName,
      image: googleImage,
      created_at: now,
      updated_at: now
    });
    const inserted = await coll.findOne<{ _id: { toString(): string }; name?: string; image?: string | null }>({
      email,
      auth_method: CREDENTIALS_AUTH_METHOD_OAUTH
    });
    if (!inserted?._id) throw new Error("Falha ao sincronizar conta Google.");
    return {
      id: inserted._id.toString(),
      name: typeof inserted.name === "string" ? inserted.name : googleName,
      image: typeof inserted.image === "string" ? inserted.image : null
    };
  }

  await coll.updateOne({ _id: existing._id }, { $set: { updated_at: now } });
  const refreshed = await coll.findOne<{ name?: string; image?: string | null }>({ _id: existing._id });
  return {
    id: existing._id.toString(),
    name: typeof refreshed?.name === "string" && refreshed.name.trim() ? refreshed.name : googleName,
    image: typeof refreshed?.image === "string" ? refreshed.image : null
  };
}

async function loadCredentialsUserProfile(userId: string): Promise<{ name: string; image: string | null } | null> {
  if (!ObjectId.isValid(userId)) return null;
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const doc = await db.collection(CREDENTIALS_USERS_COLLECTION).findOne<{ name?: string; image?: string | null }>(
      { _id: new ObjectId(userId) },
      { projection: { name: 1, image: 1 } }
    );
    if (!doc) return null;
    const name =
      typeof doc.name === "string" && doc.name.trim()
        ? doc.name.trim().slice(0, CREDENTIALS_DISPLAY_NAME_MAX)
        : "Usuário";
    const image = typeof doc.image === "string" && doc.image.trim() ? doc.image.trim() : null;
    return { name, image };
  } catch {
    return null;
  }
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
          token.loginProvider = "google";
        } else {
          token.id = user.id;
          if (user.email) token.email = user.email;
          if (user.name) token.name = user.name;
          token.loginProvider = "credentials";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const id = ((token.id as string) || (token.sub as string)) ?? "";
        session.user.id = id;
        if (typeof token.email === "string" && token.email) {
          session.user.email = token.email;
        }
        if (token.loginProvider === "google" || token.loginProvider === "credentials") {
          session.user.loginProvider = token.loginProvider;
        }

        const fromDb = id ? await loadCredentialsUserProfile(id) : null;
        if (fromDb) {
          session.user.name = fromDb.name;
          session.user.image = fromDb.image;
        } else if (typeof token.name === "string" && token.name) {
          session.user.name = token.name;
          session.user.image = null;
        }
      }
      return session;
    }
  }
};
