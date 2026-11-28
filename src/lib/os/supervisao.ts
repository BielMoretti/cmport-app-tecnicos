/**
 * Visão do Supervisor: as OS do dia de todos os técnicos, só para consultar. Fica separada das OS do
 * próprio técnico (outra rota, outro cache, nada na fila). O cargo quem decide é o servidor.
 *
 *   GET /supervisao/os        {gerada_em, ordens}: agendadas hoje (qualquer situação), concluídas hoje e
 *                             em atendimento ou pausadas de qualquer dia
 *   GET /supervisao/os/{id}   a OS inteira
 *
 * Sem sinal, a lista guardada aparece com a hora dela; a OS aberta precisa de sinal.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api, ApiError } from './api';
import type { OrdemServico, Prioridade, Referencia, Situacao } from './types';

const CHAVE = 'cmport_os_supervisao_v1';

export interface ItemDaSupervisao {
  id: number;
  numero: string;
  titulo: string;
  tipo: string;
  situacao: Situacao;
  prioridade: Prioridade;
  cliente: Referencia;
  endereco: string;
  tecnico: Referencia | null;
  agendada_para: string | null;
  a_caminho_em: string | null;
  iniciada_em: string | null;
  concluida_em: string | null;
  cancelada_em: string | null;
}

export interface ListaDaSupervisao {
  ordens: ItemDaSupervisao[];
  /** quando esta lista veio do servidor (ISO) */
  em: string;
  semSinal: boolean;
}

// sobe a cada limpeza: resposta que chega depois de sair da conta não é guardada
let geracao = 0;

export async function listarSupervisao(): Promise<ListaDaSupervisao> {
  const minha = geracao;
  try {
    const { ordens } = await api<{ ordens: ItemDaSupervisao[] }>('/supervisao/os');
    const nova = { ordens, em: new Date().toISOString() };
    if (minha === geracao) {
      try { await AsyncStorage.setItem(CHAVE, JSON.stringify(nova)); } catch { /* sem espaço: segue sem guardar */ }
    }
    return { ...nova, semSinal: false };
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 0) throw e;
    const bruto = await AsyncStorage.getItem(CHAVE).catch(() => null);
    if (!bruto) throw new ApiError(0, 'Sem sinal. A lista aparece aqui depois da primeira vez com internet.');
    return { ...(JSON.parse(bruto) as Omit<ListaDaSupervisao, 'semSinal'>), semSinal: true };
  }
}

export function osDaSupervisao(id: number): Promise<OrdemServico> {
  return api<OrdemServico>(`/supervisao/os/${id}`);
}

/** Ao sair da conta ou perder o cargo: as OS dos outros não ficam no aparelho. */
export async function apagarSupervisao(): Promise<void> {
  geracao += 1;
  try { await AsyncStorage.removeItem(CHAVE); } catch { /* nada */ }
}

// o link assinado vale 1 hora: enquanto falta bastante, mantém o mesmo
const FOLGA_DO_LINK_S = 10 * 60;

function aindaVale(url: string): boolean {
  const expira = Number(url.match(/[?&]e=(\d+)/)?.[1]);
  return !!expira && expira - Date.now() / 1000 > FOLGA_DO_LINK_S;
}

/**
 * A tela aberta busca a OS de novo a cada pouco, e cada resposta traz links novos de foto e áudio: trocar
 * o link faria a imagem piscar e o áudio recomeçar. Mantém o link anterior enquanto ele vale.
 */
export function manterLinks(anterior: OrdemServico | null, nova: OrdemServico): OrdemServico {
  if (!anterior || anterior.id !== nova.id) return nova;
  const manter = <T extends { id: number; url: string }>(antes: T[], agora: T[]) => agora.map(x => {
    const velho = antes.find(a => a.id === x.id);
    return velho && aindaVale(velho.url) ? { ...x, url: velho.url } : x;
  });
  return { ...nova, fotos: manter(anterior.fotos, nova.fotos), audios: nova.audios && manter(anterior.audios ?? [], nova.audios) };
}
