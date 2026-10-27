import { lerItem, salvarItem } from './armazenamento';

/**
 * Condomínios em que o técnico mexeu por último (abrir para instalar ou para ver). Ficam no
 * aparelho e aparecem no Início e no começo da aba Instalar: quem volta ao mesmo lugar não
 * precisa buscar de novo.
 */
export interface Recente {
  id: number;
  nome: string;
}

const CHAVE = 'cmport_recentes';
const MAXIMO = 5;

export async function lerRecentes(): Promise<Recente[]> {
  try {
    const salvo = await lerItem(CHAVE);
    const lista = salvo ? (JSON.parse(salvo) as Recente[]) : [];
    return Array.isArray(lista) ? lista.filter(r => typeof r.id === 'number' && typeof r.nome === 'string') : [];
  } catch {
    return [];
  }
}

/** Põe o condomínio no topo da lista (sem repetir). Falha de gravação não atrapalha a tela. */
export async function marcarRecente(r: Recente): Promise<void> {
  const atual = await lerRecentes();
  const nova = [r, ...atual.filter(x => x.id !== r.id)].slice(0, MAXIMO);
  await salvarItem(CHAVE, JSON.stringify(nova)).catch(() => {});
}
