/** Origem absoluta do app (links em e-mail, redirects). */
export function getAppOrigin(): string {
  const base = process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "");
  if (base) return base;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}
