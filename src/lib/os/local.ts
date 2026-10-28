/**
 * Onde o técnico está, para o check-in e a conclusão — pensado para gastar pouca bateria:
 *
 *   1. a última posição que o celular já sabe, se tiver até 2 minutos e precisão de até 100 m
 *      (o Maps ou o próprio sistema acabaram de achar): zero GPS ligado;
 *   2. senão, uma leitura só, na precisão "equilibrada" (rede + GPS, bem mais barata que a alta),
 *      com no máximo 12 segundos.
 *
 * Nunca rastreia: nada em segundo plano (a permissão de segundo plano está bloqueada no app.json).
 * Sem permissão ou sem sinal, a marcação vai só com a hora e o atendimento não trava.
 */
import * as Location from 'expo-location';

import type { Marcacao } from './types';

const LIMITE_MS = 12_000;
const IDADE_MAXIMA_MS = 2 * 60 * 1000;
const PRECISAO_ACEITA_M = 100;

export async function marcarAqui(): Promise<Marcacao> {
  const em = new Date().toISOString();
  const sem = { em, lat: null, lng: null, precisao: null };
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return sem;
    const ultima = await Location.getLastKnownPositionAsync({ maxAge: IDADE_MAXIMA_MS, requiredAccuracy: PRECISAO_ACEITA_M })
      .catch(() => null);
    const pos = ultima ?? await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>(r => setTimeout(() => r(null), LIMITE_MS)),
    ]);
    if (!pos) return sem;
    return {
      em,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      precisao: pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null,
    };
  } catch {
    return sem;
  }
}

/** "10:42 · GPS (±12 m)" / "10:42 · sem localização" — para mostrar na tela. */
export function descreverMarcacao(m: Marcacao): string {
  const hora = new Date(m.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (m.lat == null) return `${hora} · sem localização`;
  return m.precisao != null ? `${hora} · GPS (±${m.precisao} m)` : `${hora} · GPS`;
}
