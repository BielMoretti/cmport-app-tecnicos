/**
 * A foto tirada na hora fica também na galeria do celular (a original, sem carimbo nem riscos, que
 * são desenhados no servidor). Sem permissão ou sem espaço, a foto segue para a OS do mesmo jeito.
 * (No navegador: lib/os/galeria.web.ts.)
 */
import * as MediaLibrary from 'expo-media-library/legacy';

export async function salvarNaGaleria(uri: string): Promise<void> {
  try {
    // só para gravar: não pede acesso às fotos da pessoa
    const { granted } = await MediaLibrary.requestPermissionsAsync(true);
    if (granted) await MediaLibrary.saveToLibraryAsync(uri);
  } catch { /* a cópia é um extra: não atrapalha o serviço */ }
}
