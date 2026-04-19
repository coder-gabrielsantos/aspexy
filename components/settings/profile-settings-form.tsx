"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import ConfirmDialog from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function initialsFromName(name: string): string {
  return (name || "U").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === "string") resolve(r.result);
      else reject(new Error("Não foi possível ler o arquivo."));
    };
    r.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    r.readAsDataURL(file);
  });
}

export default function ProfileSettingsForm() {
  const { data: session, status, update } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** null = remover foto ao salvar; undefined = não alterar imagem no servidor */
  const [pendingImage, setPendingImage] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const sessionImage = session?.user?.image ?? null;
  const displayImage = pendingImage !== undefined ? pendingImage : sessionImage;

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  const openFilePicker = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 350 * 1024) {
      setError("Imagem muito grande (máx. 350 KB).");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreviewUrl(dataUrl);
      setPendingImage(dataUrl);
      setError(null);
    } catch {
      setError("Não foi possível carregar a imagem.");
    }
  }, []);

  const removePhoto = useCallback(() => {
    setPreviewUrl(null);
    setPendingImage(null);
    setError(null);
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const trimmed = name.replace(/\s+/g, " ").trim();
      if (!trimmed) {
        setError("Digite um nome de exibição.");
        return;
      }

      setSaving(true);
      try {
        const body: { name: string; image?: string | null } = { name: trimmed };
        if (pendingImage !== undefined) {
          body.image = pendingImage;
        }

        const r = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const data = (await r.json().catch(() => null)) as { error?: string; name?: string; image?: string | null };
        if (!r.ok) {
          setError(typeof data?.error === "string" ? data.error : "Não foi possível salvar.");
          return;
        }

        const saved = data as { name?: string; image?: string | null };
        const nextName = typeof saved.name === "string" ? saved.name : trimmed;

        setName(nextName);
        await update({});
        setPendingImage(undefined);
        setPreviewUrl(null);
      } catch {
        setError("Não foi possível salvar.");
      } finally {
        setSaving(false);
      }
    },
    [name, pendingImage, update]
  );

  const handleDeleteAccount = useCallback(async () => {
    setDeletePending(true);
    setError(null);
    try {
      const r = await fetch("/api/user/account", { method: "DELETE" });
      const data = (await r.json().catch(() => null)) as { error?: string };
      if (!r.ok) {
        setError(typeof data?.error === "string" ? data.error : "Não foi possível excluir a conta.");
        setDeleteOpen(false);
        return;
      }
      await signOut({ callbackUrl: "/login" });
    } catch {
      setError("Não foi possível excluir a conta.");
      setDeleteOpen(false);
    } finally {
      setDeletePending(false);
    }
  }, []);

  if (status === "loading") {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 h-10 max-w-md animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const initials = initialsFromName(name || session?.user?.name || "U");

  return (
    <form onSubmit={onSubmit} className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Perfil</h1>
      <p className="mt-1 text-sm text-slate-500">
        Personalize como seu nome e sua foto aparecem no Aspexy.
      </p>

      <hr className="my-8 border-slate-200" />

      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <div className="min-w-0 flex-1 space-y-6">
          <div>
            <label htmlFor="display-name" className="mb-1.5 block text-sm font-medium text-slate-800">
              Nome
            </label>
            <Input
              id="display-name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              autoComplete="name"
              maxLength={120}
              className="max-w-xl"
            />
            <p className="mt-2 text-xs text-slate-500">
              Você pode alterá-lo a qualquer momento.
            </p>
          </div>
        </div>

        <div className="shrink-0 lg:w-[220px]">
          <p className="mb-3 text-sm font-medium text-slate-800">Foto de perfil</p>
          <div className="relative inline-block">
            {displayImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl ?? displayImage}
                alt=""
                width={160}
                height={160}
                referrerPolicy="no-referrer"
                className="h-36 w-36 rounded-full border border-slate-200 object-cover shadow-sm sm:h-40 sm:w-40"
              />
            ) : (
              <div className="grid h-36 w-36 place-items-center rounded-full border border-slate-200 bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-600 text-2xl font-semibold text-white shadow-sm sm:h-40 sm:w-40">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={openFilePicker}
              className={cn(
                "absolute bottom-0 left-0 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm",
                "transition-colors hover:bg-slate-50"
              )}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Editar
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFileChange} />
          </div>
          {(sessionImage || typeof pendingImage === "string") && pendingImage !== null && (
            <button type="button" onClick={removePhoto} className="mt-3 text-xs font-medium text-indigo-600 hover:underline">
              Remover foto
            </button>
          )}
          {pendingImage === null && sessionImage && (
            <button
              type="button"
              onClick={() => {
                setPendingImage(undefined);
                setPreviewUrl(null);
              }}
              className="mt-3 block text-xs font-medium text-slate-600 hover:underline"
            >
              Manter foto atual
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6 max-[387px]:flex-col max-[387px]:items-stretch">
        <Button type="submit" disabled={saving} className="max-[387px]:w-full">
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || deletePending}
          onClick={() => setDeleteOpen(true)}
          className={cn(
            "inline-flex gap-1.5 border border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700",
            "max-[387px]:w-full"
          )}
        >
          <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
          Excluir conta
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir conta?"
        description="Exclusão permanente da conta e de todos os dados. Não dá para desfazer."
        confirmText="Excluir conta"
        cancelText="Cancelar"
        variant="danger"
        isPending={deletePending}
        onConfirm={handleDeleteAccount}
      />
    </form>
  );
}
