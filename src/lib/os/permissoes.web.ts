/** No navegador (prévia) não há aviso push: as notificações ficam "indisponível"; o resto é igual. */
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export type Permissao = 'localizacao' | 'notificacoes' | 'camera' | 'microfone';
export type Situacao = 'permitida' | 'negada' | 'perguntar' | 'indisponivel';

interface Resposta { granted: boolean; canAskAgain?: boolean }

const PEDIR: Record<Exclude<Permissao, 'notificacoes'>, { ver: () => Promise<Resposta>; pedir: () => Promise<Resposta> }> = {
  localizacao: { ver: Location.getForegroundPermissionsAsync, pedir: Location.requestForegroundPermissionsAsync },
  camera: { ver: ImagePicker.getCameraPermissionsAsync, pedir: ImagePicker.requestCameraPermissionsAsync },
  microfone: { ver: getRecordingPermissionsAsync, pedir: requestRecordingPermissionsAsync },
};

export const PERMISSOES: Permissao[] = ['localizacao', 'notificacoes', 'camera', 'microfone'];

function situacao(r: Resposta): Situacao {
  if (r.granted) return 'permitida';
  return r.canAskAgain === false ? 'negada' : 'perguntar';
}

export async function verPermissao(p: Permissao): Promise<Situacao> {
  if (p === 'notificacoes') return 'indisponivel';
  try { return situacao(await PEDIR[p].ver()); } catch { return 'indisponivel'; }
}

export async function pedirPermissao(p: Permissao): Promise<Situacao> {
  if (p === 'notificacoes') return 'indisponivel';
  try { return situacao(await PEDIR[p].pedir()); } catch { return 'indisponivel'; }
}
