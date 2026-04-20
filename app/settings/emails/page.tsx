import { redirect } from "next/navigation";

export default function EmailsSettingsRedirectPage() {
  redirect("/configuracoes/autenticacao");
}
