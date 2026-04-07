import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import LoginScreen from "@/components/login-screen";
import { authOptions } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession(authOptions);
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const errorParam = searchParams.error;
  const oauthError = typeof errorParam === "string" ? errorParam : undefined;

  if (session?.user) {
    redirect("/");
  }

  return <LoginScreen googleConfigured={googleConfigured} oauthError={oauthError} />;
}
