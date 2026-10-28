/**
 * As OS guardadas no celular: a última versão que veio do servidor, para abrir tudo sem sinal
 * (subsolo, garagem). É dado do técnico logado: sai junto quando ele sai da conta.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { OrdemServico } from './types';

const CHAVE = 'cmport_os_cache_v1';

interface Cache {
  porId: Record<string, OrdemServico>;
  /** ids da última lista que veio do servidor, na ordem */
  lista: number[];
  /** quando a lista veio (ISO), para dizer "atualizada às 10:42" */
  em: string | null;
}

let memoria: Cache | null = null;

async function ler(): Promise<Cache> {
  if (memoria) return memoria;
  try {
    const bruto = await AsyncStorage.getItem(CHAVE);
    memoria = bruto ? (JSON.parse(bruto) as Cache) : { porId: {}, lista: [], em: null };
  } catch {
    memoria = { porId: {}, lista: [], em: null };
  }
  return memoria;
}

async function gravar(c: Cache) {
  memoria = c;
  try { await AsyncStorage.setItem(CHAVE, JSON.stringify(c)); } catch { /* cheio ou sem armazenamento: segue só na memória */ }
}

export async function guardarLista(lista: OrdemServico[]) {
  // a lista nova manda: OS que saiu dela (concluída antiga, cancelada) sai do celular também
  const porId: Record<string, OrdemServico> = {};
  for (const os of lista) porId[os.id] = os;
  await gravar({ porId, lista: lista.map(o => o.id), em: new Date().toISOString() });
}

export async function guardarOS(os: OrdemServico) {
  const c = await ler();
  await gravar({ ...c, porId: { ...c.porId, [os.id]: os }, lista: c.lista.includes(os.id) ? c.lista : [os.id, ...c.lista] });
}

export async function listaGuardada(): Promise<{ lista: OrdemServico[]; em: string | null }> {
  const c = await ler();
  return { lista: c.lista.map(id => c.porId[id]).filter(Boolean), em: c.em };
}

export async function osGuardada(id: number): Promise<OrdemServico | null> {
  return (await ler()).porId[id] ?? null;
}

export async function apagarCache() {
  memoria = { porId: {}, lista: [], em: null };
  try { await AsyncStorage.removeItem(CHAVE); } catch { /* nada */ }
}
