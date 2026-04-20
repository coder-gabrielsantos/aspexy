import { redirect } from "next/navigation";

export default function PasswordSettingsRedirectPage() {
  redirect("/configuracoes/autenticacao");
}
