/**
 * As permissões que o app usa, num lugar só (a tela "Permissões" do primeiro acesso). Cada uma é
 * pedida também na hora do uso (check-in, foto, gravar), então negar aqui não trava nada: só faz o
 * app perguntar de novo quando precisar.
 */
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export type Permissao = 'localizacao' | 'notificacoes' | 'camera' | 'microfone';
/** 'indisponivel' = este aparelho (ou o navegador) não oferece essa permissão */
export type Situacao = 'permitida' | 'negada' | 'perguntar' | 'indisponivel';

interface Resposta { granted: boolean; canAskAgain?: boolean }

const PEDIR: Record<Permissao, { ver: () => Promise<Resposta>; pedir: () => Promise<Resposta> }> = {
  localizacao: { ver: Location.getForegroundPermissionsAsync, pedir: Location.requestForegroundPermissionsAsync },
  notificacoes: { ver: Notifications.getPermissionsAsync, pedir: () => Notifications.requestPermissionsAsync() },
  camera: { ver: ImagePicker.getCameraPermissionsAsync, pedir: ImagePicker.requestCameraPermissionsAsync },
  microfone: { ver: getRecordingPermissionsAsync, pedir: requestRecordingPermissionsAsync },
};

export const PERMISSOES: Permissao[] = ['localizacao', 'notificacoes', 'camera', 'microfone'];

function situacao(r: Resposta): Situacao {
  if (r.granted) return 'permitida';
  return r.canAskAgain === false ? 'negada' : 'perguntar';
}

export async function verPermissao(p: Permissao): Promise<Situacao> {
  try { return situacao(await PEDIR[p].ver()); } catch { return 'indisponivel'; }
}

export async function pedirPermissao(p: Permissao): Promise<Situacao> {
  try { return situacao(await PEDIR[p].pedir()); } catch { return 'indisponivel'; }
}
