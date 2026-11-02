/**
 * Bloqueio do app por biometria (digital, rosto) ou pela tela de bloqueio do celular.
 * É opcional e fica ligado por aparelho. Protege quem pega o celular desbloqueado e abre o app;
 * a sessão continua guardada no cofre do aparelho (armazenamento.ts).
 */
import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

import { apagarItem, lerItem, salvarItem } from '@/lib/armazenamento';
import { passouDoTempo } from '@/lib/tempoDeBloqueio';

const CHAVE = 'cmport_biometria';

/** O celular tem leitor (ou bloqueio de tela) cadastrado? */
export async function biometriaDisponivel(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

export async function biometriaLigada(): Promise<boolean> {
  return (await lerItem(CHAVE).catch(() => null)) === 'sim';
}

export async function ligarBiometria(ligar: boolean): Promise<void> {
  if (ligar) await salvarItem(CHAVE, 'sim');
  else await apagarItem(CHAVE).catch(() => {});
}

/** Pede a biometria. true = passou. */
export async function pedirBiometria(motivo = 'Entrar no CMPort Técnico'): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: motivo,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar a senha do celular',
    });
    return r.success;
  } catch {
    return false;
  }
}

/** Avisa quando o app volta de segundo plano depois de passar do tempo. */
export function useBloquearAoVoltar(ativo: boolean, aoBloquear: () => void) {
  const saiuEm = useRef<number | null>(null);
  useEffect(() => {
    if (!ativo) return;
    const s = AppState.addEventListener('change', estado => {
      if (estado === 'background') saiuEm.current = Date.now();
      else if (estado === 'active' && saiuEm.current != null) {
        if (passouDoTempo(saiuEm.current, Date.now())) aoBloquear();
        saiuEm.current = null;
      }
    });
    return () => s.remove();
  }, [ativo, aoBloquear]);
}
