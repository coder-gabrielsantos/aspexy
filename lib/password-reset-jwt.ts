import { SignJWT, jwtVerify } from "jose";

const PURPOSE = "password_reset";

function secretKey(): Uint8Array {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET é obrigatório para redefinição de senha.");
  return new TextEncoder().encode(s);
}

/** JWT de 1h; `sub` = id Mongo; `jti` = id único do pedido (uso único no banco). */
export async function signPasswordResetToken(userId: string, jti: string): Promise<string> {
  return new SignJWT({ purpose: PURPOSE, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secretKey());
}

export type PasswordResetClaims = { userId: string; jti: string };

export async function verifyPasswordResetToken(token: string): Promise<PasswordResetClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.purpose !== PURPOSE || typeof payload.sub !== "string" || !payload.sub) {
      return null;
    }
    const jti = typeof payload.jti === "string" ? payload.jti : "";
    if (!jti) return null;
    return { userId: payload.sub, jti };
  } catch {
    return null;
  }
}
