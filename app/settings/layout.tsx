import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SettingsShell } from "@/components/settings/settings-shell";
import { authOptions } from "@/lib/auth";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return <SettingsShell>{children}</SettingsShell>;
}
