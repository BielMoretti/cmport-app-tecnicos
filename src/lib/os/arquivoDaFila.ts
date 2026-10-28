/**
 * A foto que espera sinal na fila precisa sobreviver ao app fechar: a reduzida fica na pasta de
 * cache, que o sistema pode limpar. Aqui ela vai para os documentos do app até subir.
 * (No navegador: lib/arquivoDaFila.web.ts.)
 */
import { Directory, File, Paths } from 'expo-file-system';

function pasta(): Directory {
  const d = new Directory(Paths.document, 'fila-fotos');
  if (!d.exists) d.create({ idempotent: true, intermediates: true });
  return d;
}

export async function guardarFotoDaFila(uri: string, id: string, extensao = 'jpg'): Promise<string> {
  // o áudio usa a mesma pasta (extensao 'm4a'): o que muda é só o nome do arquivo
  const destino = new File(pasta(), `${id}.${extensao}`);
  if (!destino.exists) await new File(uri).copy(destino);
  return destino.uri;
}

export function apagarFotoDaFila(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch { /* já não existe */ }
}

export function apagarTodasAsFotosDaFila() {
  try {
    const d = new Directory(Paths.document, 'fila-fotos');
    if (d.exists) d.delete();
  } catch { /* nada */ }
}
