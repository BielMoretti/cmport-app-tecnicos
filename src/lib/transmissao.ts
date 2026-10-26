import { useEffect, useState } from 'react';

import { api } from './api';
import { estadoDe, type Estado } from './saude';
import type { Camera } from './types';

const INTERVALO_MS = 5_000;
// ninguém configura câmera por mais de meia hora com a tela aberta: depois disso para de perguntar
const DESISTE_EM_MS = 30 * 60_000;

/**
 * Durante a instalação: pergunta ao servidor, a cada 5 s, quais destas câmeras já estão
 * mandando vídeo (o `online` da lista vem do MediaMTX na hora). Para sozinho quando todas
 * transmitem, quando a tela fecha ou depois de meia hora.
 *
 * Uma consulta só por rodada, a lista do condomínio, e nunca duas ao mesmo tempo.
 */
export function useTransmissao(condominioId: number, ids: number[]): { estados: Map<number, Estado>; conferindo: boolean; retomar: () => void } {
  const [estados, setEstados] = useState<Map<number, Estado>>(new Map());
  const [conferindo, setConferindo] = useState(ids.length > 0);
  const [rodada, setRodada] = useState(0);   // "Conferir de novo" depois que parou
  const chave = ids.join(',');

  useEffect(() => {
    const procurados = chave === '' ? [] : chave.split(',').map(Number);
    if (procurados.length === 0) { setConferindo(false); return; }
    let parado = false;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const inicio = Date.now();
    setConferindo(true);

    async function conferir() {
      try {
        const lista = await api<Camera[]>(`/cameras/por-condominio/${condominioId}`);
        if (parado) return;
        const novo = new Map<number, Estado>();
        for (const c of lista) if (procurados.includes(c.id)) novo.set(c.id, estadoDe(c));
        setEstados(novo);
        if (procurados.every(id => novo.get(id) === 'online')) { setConferindo(false); return; }
      } catch {
        // sinal fraco no poste: tenta de novo na próxima rodada, sem mensagem de erro
        if (parado) return;
      }
      if (Date.now() - inicio > DESISTE_EM_MS) { setConferindo(false); return; }
      espera = setTimeout(() => { void conferir(); }, INTERVALO_MS);
    }

    void conferir();
    return () => { parado = true; clearTimeout(espera); };
  }, [condominioId, chave, rodada]);

  return { estados, conferindo, retomar: () => setRodada(r => r + 1) };
}

/** O texto da pílula de cada câmera durante a instalação. */
export function rotuloDaTransmissao(estado: Estado | undefined): string {
  if (estado === 'online') return 'Transmitindo';
  if (estado === 'offline') return 'Aguardando o vídeo';
  if (estado === 'desconhecido') return 'Sem informação';
  return 'Conferindo…';
}
