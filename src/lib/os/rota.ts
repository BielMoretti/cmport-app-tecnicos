/**
 * "Ir até o local": abre a rota no Google Maps ou no Waze. Com o ponto do condomínio, vai direto
 * nele; sem ponto, procura pelo endereço escrito. Os links abrem o app de mapa instalado (ou o
 * site, se não houver) — nada de GPS ligado aqui dentro.
 */
import { Linking } from 'react-native';

import type { OrdemServico } from './types';

export type AppDeMapa = 'google' | 'waze';

export function linkDaRota(os: Pick<OrdemServico, 'local' | 'endereco' | 'cliente'>, app: AppDeMapa): string {
  const destino = os.local ? `${os.local.lat},${os.local.lng}` : `${os.endereco || os.cliente.nome}`;
  if (app === 'waze') {
    return os.local
      ? `https://waze.com/ul?ll=${destino}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(destino)}&navigate=yes`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}&travelmode=driving`;
}

export async function irAteOLocal(os: Pick<OrdemServico, 'local' | 'endereco' | 'cliente'>, app: AppDeMapa): Promise<void> {
  await Linking.openURL(linkDaRota(os, app));
}
