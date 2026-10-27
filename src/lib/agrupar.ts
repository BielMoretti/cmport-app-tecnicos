import type { Camera, Poste } from './types';

/** Uma câmera criada há menos de 48 h e ainda sem vídeo é instalação em andamento, não queda. */
const JANELA_DE_INSTALACAO_MS = 48 * 60 * 60 * 1000;

export function recemCriada(c: Pick<Camera, 'criado_em'>, agora = Date.now()): boolean {
  // o backend grava em UTC sem fuso
  const iso = /Z$|[+-]\d\d:?\d\d$/.test(c.criado_em) ? c.criado_em : `${c.criado_em}Z`;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && agora - t < JANELA_DE_INSTALACAO_MS;
}

/** Ordem das portas: a de criação (id), para a porta 1 ser sempre a mesma câmera. */
export const porCriacao = (a: Pick<Camera, 'id'>, b: Pick<Camera, 'id'>) => a.id - b.id;

export interface PosteComCameras {
  poste: Poste;
  cameras: Camera[];
}

/** Os postes de um condomínio, cada um com as câmeras dele, e as câmeras fora de poste. */
export function postesDoCondominio(
  condominioId: number, postes: Poste[], cameras: Camera[],
): { postes: PosteComCameras[]; avulsas: Camera[] } {
  const doCondominio = cameras.filter(c => c.condominio_id === condominioId).sort(porCriacao);
  const lista = postes
    .filter(p => p.condominio_id === condominioId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }))
    .map(p => ({ poste: p, cameras: doCondominio.filter(c => c.poste_id === p.id) }));
  const emPoste = new Set(lista.flatMap(l => l.cameras.map(c => c.id)));
  return { postes: lista, avulsas: doCondominio.filter(c => !emPoste.has(c.id)) };
}
