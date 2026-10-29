/**
 * O arquivo do aparelho como parte do formulário de envio (foto e áudio da OS).
 *
 * O Expo troca o fetch do React Native pelo dele (expo/fetch), que não aceita o { uri, name, type } de
 * antes: a foto falhava no próprio celular com "Unsupported FormDataPart implementation" e nunca
 * chegava ao servidor. Ele quer um objeto com bytes(), como o File do expo-file-system.
 * (No navegador: parteDoArquivo.web.ts.)
 */
import { File } from 'expo-file-system';

export async function parteDoArquivo(uri: string): Promise<Blob> {
  return new File(uri);
}
