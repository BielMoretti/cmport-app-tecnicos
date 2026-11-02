import { Paths } from 'expo-file-system';

/** Abaixo disto o celular pode falhar ao gravar foto, áudio ou vídeo. */
export const MINIMO_LIVRE_BYTES = 200 * 1024 * 1024;

/** Espaço livre em bytes; null se o aparelho não informa. */
export function espacoLivre(): number | null {
  try {
    const n = Paths.availableDiskSpace;
    return typeof n === 'number' && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

/** Texto de aviso se o celular está quase sem espaço; null = ok ou não dá para saber. */
export function avisoDeEspaco(livre = espacoLivre()): string | null {
  if (livre == null || livre >= MINIMO_LIVRE_BYTES) return null;
  const mb = Math.floor(livre / (1024 * 1024));
  return `O celular está com pouco espaço (${mb} MB livres). Apague fotos ou apps antes de gravar, para não perder o registro.`;
}
