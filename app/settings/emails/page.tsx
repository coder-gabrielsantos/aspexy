import { redirect } from "next/navigation";

export default function EmailsSettingsRedirectPage() {
  redirect("/settings/autenticacao");
}
