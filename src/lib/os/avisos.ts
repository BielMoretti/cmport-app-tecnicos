/**
 * Aviso no celular: OS nova para o técnico, passada para ele, remarcada, cancelada, solicitação
 * aprovada. O servidor manda pela Expo (push); aqui o app registra o endereço do aparelho e, ao
 * tocar no aviso, abre a OS. Nada fica consultando: quem acorda o celular é o próprio sistema.
 *
 * O endereço só existe depois que o app tem projeto no EAS (`eas init` grava o projectId no
 * app.json) e, no Android, o google-services.json. Sem isso o registro é pulado em silêncio.
 * (No navegador: lib/avisos.web.ts.)
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import type { useRouter } from 'expo-router';

import { api } from './api';

type Router = ReturnType<typeof useRouter>;

let tokenAtual: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

function projectId(): string | undefined {
  return (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ?? Constants.easConfig?.projectId;
}

/** Depois do login: pede permissão, cria o canal e manda o endereço para o servidor. */
export async function registrarAvisos(): Promise<'ok' | 'sem-permissao' | 'sem-projeto' | 'falhou'> {
  const id = projectId();
  if (!id) return 'sem-projeto';
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('os', {
        name: 'Ordens de serviço', importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return 'sem-permissao';
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    tokenAtual = data;
    await api('/auth/push', { method: 'POST', body: { token: data, plataforma: Platform.OS } });
    return 'ok';
  } catch {
    return 'falhou';
  }
}

/** Ao sair da conta: este aparelho para de receber os avisos do técnico que saiu. */
export async function desligarAvisos(): Promise<void> {
  if (!tokenAtual) return;
  try { await api('/auth/push/desligar', { method: 'POST', body: { token: tokenAtual } }); } catch { /* sem sinal: o servidor desliga quando a Expo disser que o endereço morreu */ }
  tokenAtual = null;
}

/** Tocar no aviso abre a OS dele. */
export function useAvisoAbreOS(router: Router, liberado: boolean) {
  useEffect(() => {
    if (!liberado) return;
    const abrir = (r: Notifications.NotificationResponse | null) => {
      const id = r?.notification.request.content.data?.os_id;
      if (typeof id === 'number') router.push({ pathname: '/os/[id]', params: { id: String(id) } });
    };
    void Notifications.getLastNotificationResponseAsync().then(abrir);
    const sub = Notifications.addNotificationResponseReceivedListener(abrir);
    return () => sub.remove();
  }, [router, liberado]);
}
