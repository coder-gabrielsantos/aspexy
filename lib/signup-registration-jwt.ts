import { SignJWT, jwtVerify } from "jose";

const PURPOSE = "signup_register";

function secretKey(): Uint8Array {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET é obrigatório para concluir o cadastro.");
  return new TextEncoder().encode(s);
}

/** JWT de curta duração após validar o código por e-mail; obrigatório no POST /api/auth/register. */
export async function signSignupRegistrationToken(emailNormalized: string): Promise<string> {
  return new SignJWT({ purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(emailNormalized)
    .setIssuedAt()
    .setExpirationTime("20m")
    .sign(secretKey());
}

export async function verifySignupRegistrationToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.purpose !== PURPOSE || typeof payload.sub !== "string" || !payload.sub) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}
