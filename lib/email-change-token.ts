import { SignJWT, jwtVerify } from "jose";

import { normalizeEmail } from "@/lib/credentials-user";

const PURPOSE = "email_change";

function secretKey(): Uint8Array {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET é obrigatório para alterar o e-mail.");
  return new TextEncoder().encode(s);
}

export async function signEmailChangeToken(userId: string, newEmailNormalized: string): Promise<string> {
  return new SignJWT({ purpose: PURPOSE, newEmail: newEmailNormalized })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("20m")
    .sign(secretKey());
}

export async function verifyEmailChangeToken(token: string): Promise<{ userId: string; newEmail: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.purpose !== PURPOSE || typeof payload.sub !== "string" || !payload.sub) {
      return null;
    }
    const raw = payload.newEmail;
    if (typeof raw !== "string" || !raw.trim()) return null;
    const newEmail = normalizeEmail(raw);
    if (!newEmail) return null;
    return { userId: payload.sub, newEmail };
  } catch {
    return null;
  }
}
