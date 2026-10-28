/**
 * Foto do serviço antes de subir: no máximo 1600 px de largura, JPEG 60%. Uma foto de câmera
 * de celular (4 a 8 MB) vira uns 200 a 400 KB — sobe rápido no 4G e cabe no limite do servidor (3 MB).
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const LARGURA_MAXIMA = 1600;

export async function reduzirFoto(uri: string, largura: number): Promise<{ uri: string; tipo: string; nome: string }> {
  const contexto = ImageManipulator.manipulate(uri);
  if (largura > LARGURA_MAXIMA) contexto.resize({ width: LARGURA_MAXIMA });
  const imagem = await contexto.renderAsync();
  const salva = await imagem.saveAsync({ compress: 0.6, format: SaveFormat.JPEG });
  return { uri: salva.uri, tipo: 'image/jpeg', nome: `foto-${Date.now()}.jpg` };
}
