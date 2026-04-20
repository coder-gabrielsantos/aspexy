import { redirect } from "next/navigation";

/** Rota antiga; mantida para links salvos. */
export default function EmailSenhaSettingsRedirectPage() {
  redirect("/configuracoes/autenticacao");
}
