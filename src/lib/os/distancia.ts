/**
 * Concluir a OS só perto do condomínio. O técnico assinava no local e fechava a OS em casa,
 * o que atrasa o fechamento e o cliente pede outro chamado. Por isso a conclusão confere onde
 * o celular está NA HORA de enviar.
 *
 * Ponto de referência: o ponto do condomínio no cadastro (os.local); se não houver, o lugar do
 * check-in. Sem nenhum dos dois não há como julgar e a conclusão passa.
 */
import type { Marcacao, OrdemServico } from './types';

/** distância máxima do condomínio para concluir (metros) */
export const RAIO_PARA_CONCLUIR_M = 1000;

/** distância em metros entre dois pontos (fórmula de haversine) */
export function distanciaM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** quanto tempo vale uma assinatura até o envio (se a OS não foi liberada pelo escritório) */
export const VALIDADE_DA_ASSINATURA_MS = 30 * 60 * 1000;

/** Texto do porquê não pode concluir agora; null = pode. A liberação da dash vale só para o envio. */
export function motivoLongeDoLocal(os: OrdemServico, aqui: Marcacao): string | null {
  // o escritório liberou esta OS pela dash: pode fechar de onde estiver
  if (os.liberada_longe) return null;
  return conferirPerto(os, aqui, 'A OS só fecha no local', 'Se precisar fechar daqui, peça ao escritório para liberar. A assinatura e o relato ficam guardados.');
}

/** Texto do porquê não pode assinar aqui; null = pode. Nem a liberação da dash dispensa: assina-se no local. */
export function motivoLongeParaAssinar(os: OrdemServico, aqui: Marcacao): string | null {
  return conferirPerto(os, aqui, 'A assinatura só vale no local', 'Assine no condomínio.');
}

/** A assinatura de antes ainda vale? (sem local ou velha demais = não; OS liberada pelo escritório ignora o tempo) */
export function assinaturaValeAinda(os: OrdemServico, assinou: Marcacao | null, agora = Date.now()): boolean {
  if (!assinou) return false;
  if (os.liberada_longe) return true;
  return agora - new Date(assinou.em).getTime() <= VALIDADE_DA_ASSINATURA_MS;
}

function conferirPerto(os: OrdemServico, aqui: Marcacao, fecha: string, orienta: string): string | null {
  const ref = os.local
    ?? (os.checkin && os.checkin.lat != null && os.checkin.lng != null ? { lat: os.checkin.lat, lng: os.checkin.lng } : null);
  if (!ref) return null;
  if (aqui.lat == null || aqui.lng == null) {
    return 'Não consegui saber onde você está. Ligue a localização do celular, permita ao app e tente de novo.';
  }
  // a imprecisão do GPS joga a favor do técnico: não barra por erro de leitura
  const folga = Math.min(aqui.precisao ?? 0, 100);
  const longe = distanciaM({ lat: aqui.lat, lng: aqui.lng }, ref) - folga;
  if (longe <= RAIO_PARA_CONCLUIR_M) return null;
  const km = longe >= 1000 ? `${(longe / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(longe / 10) * 10} m`;
  return `Você está a cerca de ${km} do condomínio. ${fecha} (até ${RAIO_PARA_CONCLUIR_M / 1000} km). ${orienta}`;
}
