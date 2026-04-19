/** Tamanho máximo decodificado (bytes) para foto de perfil enviada como data URL. */
export const PROFILE_IMAGE_MAX_BYTES = 350 * 1024;

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([\s\S]+)$/i;

export function validateProfileDataUrl(dataUrl: string): { ok: true } | { ok: false; error: string } {
  const trimmed = dataUrl.trim();
  const m = DATA_URL_RE.exec(trimmed);
  if (!m) {
    return { ok: false, error: "Formato de imagem inválido. Use PNG, JPEG, WebP ou GIF." };
  }
  const b64 = m[2].replace(/\s/g, "");
  let size: number;
  try {
    size = Buffer.from(b64, "base64").length;
  } catch {
    return { ok: false, error: "Imagem em base64 inválida." };
  }
  if (size > PROFILE_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Imagem muito grande (máx. 350 KB)." };
  }
  if (size < 32) {
    return { ok: false, error: "Imagem muito pequena ou corrompida." };
  }
  return { ok: true };
}
