/**
 * Fila das ações do técnico que ainda não chegaram ao servidor (app sem internet).
 *
 * Toda ação (check-in, checklist, foto, áudio, mensagem, pausar, retomar, concluir) entra aqui com a hora em que
 * aconteceu e sobe na ordem quando há sinal. Gasto de bateria: nada de ficar perguntando — a fila
 * tenta ao entrar uma ação, quando o celular avisa que a conexão voltou (NetInfo) e quando o app
 * volta para a tela. Sem rede, para na primeira tentativa e espera o próximo aviso — e, enquanto
 * houver o que enviar, tenta de novo sozinha, cada vez mais espaçado (10 s até 2 min): com o Wi-Fi
 * ligado o tempo todo, o aviso de "a conexão voltou" nunca vem, e um pedido que falhou por um
 * instante (sinal que oscilou, servidor reiniciando) deixava a OS presa até reabrir o app.
 *
 * Foto ou áudio cujo arquivo sumiu do celular não sobe nunca: vira erro na tela (descartar), em vez
 * de parecer falta de sinal e segurar a fila.
 *
 * Ação recusada pelo servidor (409): se o servidor já está como a ação deixaria (o envio anterior
 * chegou e só a resposta se perdeu), sai em silêncio; senão fica com o erro na tela e as ações
 * seguintes DAQUELA OS esperam — as das outras OS continuam.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { api, ApiError, enviarArquivo } from './api';
import { apagarFotoDaFila, apagarTodasAsFotosDaFila, arquivoExiste } from './arquivoDaFila';
import { guardarOS } from './cache';
import { jaFeita, novaIdentidade, type Acao } from './regras';
import type { OrdemServico } from './types';

const CHAVE = 'cmport_os_fila_v1';

export interface ItemDaFila {
  id: string;
  acao: Acao;
  /** a mensagem do servidor quando ele recusou (fica parada até a pessoa tentar de novo ou descartar) */
  erro?: string;
}

interface Estado {
  itens: ItemDaFila[];
  enviando: boolean;
  /** a última tentativa não achou rede */
  semSinal: boolean;
  /** a última tentativa tinha rede, mas o servidor não respondeu (ou demorou demais) */
  semServidor: boolean;
}

let estado: Estado = { itens: [], enviando: false, semSinal: false, semServidor: false };
let carregada: Promise<void> | null = null;
const ouvintes = new Set<(e: Estado) => void>();

function avisar(parte: Partial<Estado>) {
  estado = { ...estado, ...parte };
  for (const fn of ouvintes) fn(estado);
}

async function gravar(itens: ItemDaFila[]) {
  avisar({ itens });
  try { await AsyncStorage.setItem(CHAVE, JSON.stringify(itens)); } catch { /* segue na memória */ }
}

export function carregarFila(): Promise<void> {
  carregada ??= (async () => {
    try {
      const bruto = await AsyncStorage.getItem(CHAVE);
      if (bruto) avisar({ itens: JSON.parse(bruto) as ItemDaFila[] });
    } catch { /* fila corrompida: começa vazia */ }
  })();
  return carregada;
}

export function itensDaFila(): ItemDaFila[] {
  return estado.itens;
}

export async function enfileirar(acao: Acao): Promise<void> {
  await carregarFila();
  await gravar([...estado.itens, { id: novaIdentidade('a'), acao }]);
}

/** Tira a ação parada com erro (e as que esperavam por ela não mudam). */
export async function descartar(id: string): Promise<void> {
  const item = estado.itens.find(i => i.id === id);
  if (item?.acao.tipo === 'foto' || item?.acao.tipo === 'audio') apagarFotoDaFila(item.acao.uri);
  await gravar(estado.itens.filter(i => i.id !== id));
}

/** Tenta de novo agora: as que pararam com erro e as que esperavam sinal. */
export async function tentarDeNovo(): Promise<void> {
  tentativas = 0;
  await gravar(estado.itens.map(i => ({ ...i, erro: undefined })));
  await sincronizar();
}

let espera: ReturnType<typeof setTimeout> | null = null;
let tentativas = 0;

/** Agenda a próxima tentativa: 10 s, 20 s, 40 s… até 2 minutos entre uma e outra. */
function tentarMaisTarde() {
  if (espera) return;
  const ms = Math.min(10_000 * 2 ** tentativas, 120_000);
  tentativas += 1;
  espera = setTimeout(() => { espera = null; void sincronizar(); }, ms);
}

/** Ao sair da conta: a fila e as fotos são do técnico que saiu. */
export async function apagarFila(): Promise<void> {
  apagarTodasAsFotosDaFila();
  await gravar([]);
}

function enviar(a: Acao): Promise<OrdemServico> {
  if ((a.tipo === 'foto' || a.tipo === 'audio') && !arquivoExiste(a.uri)) {
    const qual = a.tipo === 'foto' ? 'a foto' : 'o áudio';
    return Promise.reject(new ApiError(410, `O arquivo não está mais no celular. Descarte e grave ${qual} de novo.`));
  }
  const local = { lat: 'lat' in a ? a.lat : null, lng: 'lng' in a ? a.lng : null, precisao: 'precisao' in a ? a.precisao : null };
  switch (a.tipo) {
    case 'checkin': return api(`/os/${a.os}/checkin`, { method: 'POST', body: { em: a.em, ...local } });
    case 'pausar': return api(`/os/${a.os}/pausar`, { method: 'POST', body: { em: a.em } });
    case 'retomar': return api(`/os/${a.os}/retomar`, { method: 'POST', body: { em: a.em } });
    case 'item': return api(`/os/${a.os}/checklist/${a.item}`, { method: 'PATCH', body: { feito: a.feito, em: a.em } });
    case 'foto':
      return enviarArquivo(`/os/${a.os}/fotos`, { uri: a.uri, nome: a.nome, tipo: a.tipoArquivo },
        { legenda: a.legenda, em: a.em, id_cliente: a.idCliente, ...(a.marcacoes?.length ? { marcacoes: JSON.stringify(a.marcacoes) } : {}) });
    case 'audio':
      return enviarArquivo(`/os/${a.os}/audios`, { uri: a.uri, nome: a.nome, tipo: a.tipoArquivo },
        { em: a.em, id_cliente: a.idCliente, duracao_s: String(a.duracao) });
    case 'mensagem':
      return api(`/os/${a.os}/mensagens`, { method: 'POST', body: { texto: a.texto, em: a.em, id_cliente: a.idCliente } });
    case 'concluir':
      return api(`/os/${a.os}/concluir`, { method: 'POST', body: { em: a.em, relato: a.relato, assinatura: a.assinatura, ...local } });
  }
}

let rodando: Promise<void> | null = null;

/** Envia o que está na fila, na ordem. Várias chamadas ao mesmo tempo viram uma só. */
export function sincronizar(): Promise<void> {
  rodando ??= (async () => {
    await carregarFila();
    if (espera) { clearTimeout(espera); espera = null; }
    if (!estado.itens.length) { tentativas = 0; avisar({ semSinal: false, semServidor: false }); return; }
    avisar({ enviando: true });
    let falhou = false;
    const paradas = new Set<number>();   // OS com uma ação recusada: as seguintes dela esperam
    try {
      for (const item of [...estado.itens]) {
        const { acao } = item;
        if (item.erro || paradas.has(acao.os)) { paradas.add(acao.os); continue; }
        try {
          await guardarOS(await enviar(acao));
          if (acao.tipo === 'foto' || acao.tipo === 'audio') apagarFotoDaFila(acao.uri);
          await gravar(estado.itens.filter(i => i.id !== item.id));
          tentativas = 0;
          avisar({ semSinal: false, semServidor: false });
        } catch (e) {
          if (!(e instanceof ApiError) || e.status === 0) {
            // sem resposta: o celular diz se é falta de rede ou se a rede está lá e o servidor não respondeu
            const rede = await NetInfo.fetch().catch(() => null);
            const semRede = rede?.isConnected === false || rede?.isInternetReachable === false;
            avisar({ semSinal: semRede, semServidor: !semRede });
            falhou = true;
            break;
          }
          if (e.status === 401) break;                                                       // sessão caiu: o login resolve
          if (e.status === 409) {
            try {
              const atual = await api<OrdemServico>(`/os/${acao.os}`);
              await guardarOS(atual);
              if (jaFeita(atual, acao)) { await gravar(estado.itens.filter(i => i.id !== item.id)); continue; }
            } catch { /* segue como erro */ }
          }
          paradas.add(acao.os);
          await gravar(estado.itens.map(i => (i.id === item.id ? { ...i, erro: e.message } : i)));
        }
      }
    } finally {
      avisar({ enviando: false });
    }
    if (falhou) tentarMaisTarde();
  })().finally(() => { rodando = null; });
  return rodando;
}

let vigiando = false;

/** Liga uma vez: envia quando a conexão volta e quando o app volta para a tela. */
export function vigiarConexao() {
  if (vigiando) return;
  vigiando = true;
  NetInfo.addEventListener(s => {
    if (s.isConnected && s.isInternetReachable !== false) void sincronizar();
  });
  AppState.addEventListener('change', s => { if (s === 'active') void sincronizar(); });
  void sincronizar();
}

/** A fila para a tela: atualiza sozinha quando muda. */
export function useFila(): Estado {
  const [e, setE] = useState(estado);
  useEffect(() => {
    ouvintes.add(setE);
    void carregarFila().then(() => setE(estado));
    return () => { ouvintes.delete(setE); };
  }, []);
  return e;
}

/** Quantas ações de uma OS ainda não subiram. */
export function pendentesDaOS(itens: ItemDaFila[], osId: number): number {
  return itens.filter(i => i.acao.os === osId).length;
}
