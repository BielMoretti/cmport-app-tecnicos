/**
 * Ordens de serviço no app — sempre "do celular primeiro", para funcionar sem internet:
 *
 *   ler    tenta o servidor e guarda (lib/cache.ts); sem sinal, usa o que está guardado. Por cima
 *          vão as ações ainda na fila, para a tela mostrar a OS como ela vai ficar.
 *   agir   confere a regra aqui mesmo (lib/regras.ts), põe a ação na fila (lib/fila.ts) com a
 *          hora em que aconteceu e tenta subir. A tela recebe a OS já atualizada na hora.
 *
 * Rotas do backend próprio (serviço dos técnicos, /api/tecnico/v1):
 *   GET   /os · GET /os/{id}
 *   POST  /os/{id}/checkin {em, lat, lng, precisao} · /pausar {em} · /retomar {em}
 *   PATCH /os/{id}/checklist/{item} {feito, em}
 *   POST  /os/{id}/fotos (multipart: arquivo, legenda, em, id_cliente)
 *   POST  /os/{id}/concluir {em, relato, assinatura, lat, lng, precisao}
 *   POST  /os/{id}/mensagens {texto, em, id_cliente}
 *   POST  /os/{id}/audios (multipart: arquivo, em, id_cliente, duracao_s)
 */
import { api, ApiError } from './api';
import { guardarFotoDaFila } from './arquivoDaFila';
import { apagarCache, guardarLista, guardarOS, listaGuardada, osGuardada } from './cache';
import { apagarRascunhos } from './rascunho';
import { apagarFila, carregarFila, enfileirar, itensDaFila, sincronizar } from './fila';
import { aplicar, novaIdentidade, type Acao } from './regras';
import type { Marcacao, OrdemServico, Situacao, TracoNaFoto } from './types';

export { pendenciasParaConcluir } from './regras';

/** As ações ainda na fila, aplicadas por cima da versão que veio do servidor. */
function comPendentes(os: OrdemServico): OrdemServico {
  let atual = os;
  for (const item of itensDaFila()) {
    if (item.acao.os !== os.id) continue;
    try { atual = aplicar(atual, item.acao); } catch { /* recusada: a tela mostra o erro da fila */ }
  }
  return atual;
}

export interface Lista {
  lista: OrdemServico[];
  /** veio do que estava guardado no celular (sem sinal); com a hora da última atualização */
  semSinalDesde: string | null;
}

export async function listarOS(): Promise<Lista> {
  await carregarFila();
  try {
    const lista = await api<OrdemServico[]>('/os');
    await guardarLista(lista);
    return { lista: lista.map(comPendentes), semSinalDesde: null };
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 0) throw e;
    const guardada = await listaGuardada();
    if (!guardada.em) throw new ApiError(0, 'Sem sinal. A lista aparece aqui depois da primeira vez com internet.');
    return { lista: guardada.lista.map(comPendentes), semSinalDesde: guardada.em };
  }
}

export async function buscarOS(id: number): Promise<OrdemServico> {
  await carregarFila();
  try {
    const os = await api<OrdemServico>(`/os/${id}`);
    await guardarOS(os);
    return comPendentes(os);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 0) throw e;
    const guardada = await osGuardada(id);
    if (!guardada) throw new ApiError(0, 'Sem sinal, e esta OS ainda não foi aberta neste celular.');
    return comPendentes(guardada);
  }
}

/** A OS como está no celular agora (sem ir ao servidor): para a tela acompanhar a fila subindo. */
export async function osNoCelular(id: number): Promise<OrdemServico | null> {
  const guardada = await osGuardada(id);
  return guardada ? comPendentes(guardada) : null;
}

/** Aplica a regra agora, põe na fila e tenta subir. Fora da ordem, o erro aparece na hora. */
async function agir(acao: Acao): Promise<OrdemServico> {
  await carregarFila();
  const base = (await osNoCelular(acao.os)) ?? (await buscarOS(acao.os));
  const nova = aplicar(base, acao);
  await enfileirar(acao);
  void sincronizar();
  return nova;
}

const agora = () => new Date().toISOString();

export function fazerCheckin(id: number, aqui: Marcacao): Promise<OrdemServico> {
  return agir({ tipo: 'checkin', os: id, em: aqui.em, lat: aqui.lat, lng: aqui.lng, precisao: aqui.precisao });
}

export function pausar(id: number): Promise<OrdemServico> {
  return agir({ tipo: 'pausar', os: id, em: agora() });
}

export function retomar(id: number): Promise<OrdemServico> {
  return agir({ tipo: 'retomar', os: id, em: agora() });
}

export function marcarItem(id: number, item: number, feito: boolean): Promise<OrdemServico> {
  return agir({ tipo: 'item', os: id, item, feito, em: agora() });
}

export async function anexarFoto(id: number, arquivo: { uri: string; nome: string; tipo: string }, legenda: string,
  marcacoes?: TracoNaFoto[]): Promise<OrdemServico> {
  const idCliente = novaIdentidade('f');
  // a foto espera sinal num lugar que sobrevive ao app fechar
  const uri = await guardarFotoDaFila(arquivo.uri, idCliente);
  return agir({ tipo: 'foto', os: id, em: agora(), idCliente, uri, nome: arquivo.nome, tipoArquivo: arquivo.tipo, legenda, marcacoes });
}

/** Áudio na OS: o arquivo espera sinal nos documentos do app, como a foto. */
export async function anexarAudio(id: number, arquivo: { uri: string; nome: string; tipo: string }, duracao: number): Promise<OrdemServico> {
  const idCliente = novaIdentidade('s');
  const uri = await guardarFotoDaFila(arquivo.uri, idCliente, arquivo.nome.split('.').pop() ?? 'm4a');
  return agir({ tipo: 'audio', os: id, em: agora(), idCliente, uri, nome: arquivo.nome, tipoArquivo: arquivo.tipo, duracao });
}

/** Mensagem para o escritório: sem sinal, espera na fila como as outras ações. */
export function mandarMensagem(id: number, texto: string): Promise<OrdemServico> {
  return agir({ tipo: 'mensagem', os: id, em: agora(), idCliente: novaIdentidade('m'), texto });
}

export function concluir(
  id: number,
  dados: { relato: string; assinatura: { nome: string; traco: string }; aqui: Marcacao },
): Promise<OrdemServico> {
  return agir({
    tipo: 'concluir', os: id, em: dados.aqui.em, relato: dados.relato, assinatura: dados.assinatura,
    lat: dados.aqui.lat, lng: dados.aqui.lng, precisao: dados.aqui.precisao,
  });
}

/** Ao sair da conta: o que está no celular é do técnico que saiu. */
export async function limparDoCelular(): Promise<void> {
  await apagarFila();
  await apagarCache();
  await apagarRascunhos();
}

/** Ordem da lista: o que pede ação primeiro, concluídas e canceladas no fim. */
const PESO: Record<Situacao, number> = { andamento: 0, aberta: 1, pausada: 2, solicitada: 3, concluida: 4, cancelada: 5 };

export function ordenarOS(lista: OrdemServico[]): OrdemServico[] {
  return [...lista].sort((a, b) => {
    const p = PESO[a.situacao] - PESO[b.situacao];
    if (p !== 0) return p;
    return (a.agendada_para ?? a.criada_em).localeCompare(b.agendada_para ?? b.criada_em);
  });
}

/** O prazo para concluir (pela prioridade) já passou. */
export function passouDoPrazo(os: OrdemServico): boolean {
  return !!os.prazo_em && new Date(os.prazo_em).getTime() < Date.now();
}

export interface ResumoDoDia {
  feitas: number;
  /** soma do check-in (ou da meia-noite, se começou antes) à conclusão de cada OS feita hoje; as pausas
   *  entram, porque o app não guarda quanto durou cada uma */
  minutos: number;
  locais: number;
  /** o que ainda é para hoje: em atendimento, pausada ou aberta agendada até o fim do dia */
  faltam: number;
}

/** O dia do técnico: o que concluiu hoje e o que ainda falta para hoje. */
export function resumoDoDia(lista: OrdemServico[], agora = new Date()): ResumoDoDia {
  const hojeTexto = agora.toDateString();
  const fimDeHoje = new Date(agora); fimDeHoje.setHours(23, 59, 59, 999);
  const inicioDeHoje = new Date(agora); inicioDeHoje.setHours(0, 0, 0, 0);
  const feitas = lista.filter(o => o.situacao === 'concluida' && o.concluida_em && new Date(o.concluida_em).toDateString() === hojeTexto);
  // união dos intervalos: duas OS abertas ao mesmo tempo não contam o mesmo minuto duas vezes
  const intervalos = feitas
    .filter(o => o.iniciada_em && o.concluida_em)
    .map(o => [Math.max(new Date(o.iniciada_em!).getTime(), inicioDeHoje.getTime()), new Date(o.concluida_em!).getTime()] as const)
    .filter(([ini, fim]) => fim > ini)
    .sort((a, b) => a[0] - b[0]);
  let minutos = 0;
  let ate = -Infinity;
  for (const [ini, fim] of intervalos) {
    if (fim <= ate) continue;
    minutos += (fim - Math.max(ini, ate)) / 60_000;
    ate = fim;
  }
  const faltam = lista.filter(o => o.situacao === 'andamento' || o.situacao === 'pausada'
    || (o.situacao === 'aberta' && !!o.agendada_para && new Date(o.agendada_para) <= fimDeHoje)).length;
  return { feitas: feitas.length, minutos: Math.round(minutos), locais: new Set(feitas.map(o => o.cliente.id)).size, faltam };
}

/** "1h25", "3h", "40 min" (curto: cabe num número grande sem quebrar a linha). */
export function duracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`;
}

/** "Hoje, 09:00", "Amanhã, 14:30" ou "12/11, 10:00". */
export function quando(iso: string | null): string {
  if (!iso) return 'Sem data';
  const d = new Date(iso);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dia = new Date(d); dia.setHours(0, 0, 0, 0);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diff = Math.round((dia.getTime() - hoje.getTime()) / 86_400_000);
  if (diff === 0) return `Hoje, ${hora}`;
  if (diff === 1) return `Amanhã, ${hora}`;
  if (diff === -1) return `Ontem, ${hora}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${hora}`;
}
