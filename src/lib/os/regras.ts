/**
 * As ações do técnico e as regras do caminho da OS, aplicadas no próprio celular — as mesmas
 * que o servidor confere (os_tecnico_service.py). Servem para a tela responder na hora, com ou
 * sem sinal: a ação vai para a fila (lib/fila.ts) e a OS já aparece como vai ficar.
 */
import { ApiError } from './api';
import type { Foto, Marcacao, OrdemServico, OrigemDaFoto, Situacao, TracoNaFoto } from './types';

export type Acao =
  | { tipo: 'checkin'; os: number; em: string; lat: number | null; lng: number | null; precisao: number | null }
  | { tipo: 'pausar' | 'retomar'; os: number; em: string }
  | { tipo: 'a_caminho' | 'desfazer_a_caminho'; os: number; em: string }
  | { tipo: 'remover_foto'; os: number; em: string; foto: RefDaFoto }
  | { tipo: 'comentar_foto'; os: number; em: string; foto: RefDaFoto; comentario: string }
  | { tipo: 'item'; os: number; item: number; feito: boolean; em: string }
  | { tipo: 'foto'; os: number; em: string; idCliente: string; uri: string; nome: string; tipoArquivo: string; legenda: string; marcacoes?: TracoNaFoto[]; item?: number; origem?: OrigemDaFoto }
  | { tipo: 'mensagem'; os: number; em: string; idCliente: string; texto: string }
  | { tipo: 'audio'; os: number; em: string; idCliente: string; uri: string; nome: string; tipoArquivo: string; duracao: number }
  | {
      tipo: 'concluir'; os: number; em: string; relato: string; assinatura: { nome: string; traco: string; local?: Marcacao | null };
      lat: number | null; lng: number | null; precisao: number | null;
    };

/** Qual foto: a que já está no servidor pelo id; a que ainda está no celular pela identidade dela. */
export type RefDaFoto = { foto_id: number } | { id_cliente: string };

export function refDaFoto(f: Foto): RefDaFoto {
  return f.id < 0 && f.id_cliente ? { id_cliente: f.id_cliente } : { foto_id: f.id };
}

function ehAFoto(f: Foto, ref: RefDaFoto): boolean {
  return 'foto_id' in ref ? f.id === ref.foto_id : f.id_cliente === ref.id_cliente;
}

/** O técnico avisou hoje que está indo e ainda não chegou. Marca de outro dia não vale. */
export function estaACaminho(os: { situacao: Situacao; a_caminho_em?: string | null }, agora = new Date()): boolean {
  return os.situacao === 'aberta' && !!os.a_caminho_em && new Date(os.a_caminho_em).toDateString() === agora.toDateString();
}

/**
 * Só há um destino por vez: marcar "a caminho" (ou chegar) em outra OS tira a marca desta. Vale para o
 * que ainda está na fila, antes de o servidor fazer o mesmo.
 */
export function semMarcaSuperada(os: OrdemServico, fila: { acao: Acao; erro?: string }[]): OrdemServico {
  const marca = os.a_caminho_em;
  if (!marca) return os;
  const superada = fila.some(({ acao, erro }) => !erro && acao.os !== os.id
    && (acao.tipo === 'a_caminho' || acao.tipo === 'checkin') && new Date(acao.em) >= new Date(marca));
  return superada ? { ...os, a_caminho_em: null } : os;
}

const ROTULO: Record<Situacao, string> = {
  solicitada: 'esperando o escritório aprovar',
  aberta: 'aberta', andamento: 'em andamento', pausada: 'pausada', concluida: 'concluída', cancelada: 'cancelada',
};

function exigir(os: OrdemServico, permitidas: Situacao[], acao: string) {
  if (!permitidas.includes(os.situacao)) throw new ApiError(409, `Não dá para ${acao}: a OS está ${ROTULO[os.situacao]}.`);
}

/** O que falta para poder concluir (vazio = pode). */
export function pendenciasParaConcluir(os: OrdemServico): string[] {
  const falta: string[] = [];
  const abertos = os.checklist.filter(i => !i.feito).length;
  if (abertos > 0) falta.push(abertos === 1 ? '1 item do checklist' : `${abertos} itens do checklist`);
  if (os.fotos.length === 0) falta.push('pelo menos 1 foto');
  return falta;
}

/** A OS como fica depois da ação. Fora da ordem lança erro (409), como o servidor. */
export function aplicar(atual: OrdemServico, a: Acao): OrdemServico {
  const os: OrdemServico = structuredClone(atual);
  switch (a.tipo) {
    case 'checkin':
      exigir(os, ['aberta'], 'fazer o check-in');
      os.situacao = 'andamento';
      os.iniciada_em ??= a.em;
      os.checkin = { em: a.em, lat: a.lat, lng: a.lng, precisao: a.precisao };
      if (os.a_caminho_em) os.a_caminho_em = null;
      break;
    case 'a_caminho':
      exigir(os, ['aberta'], 'avisar que está a caminho');
      os.a_caminho_em = a.em;
      break;
    case 'desfazer_a_caminho':
      os.a_caminho_em = null;
      break;
    case 'remover_foto': {
      exigir(os, ['andamento', 'pausada'], 'remover foto');
      const foto = os.fotos.find(f => ehAFoto(f, a.foto));
      if (!foto) break;
      os.fotos = os.fotos.filter(f => f !== foto);
      // o item que a foto comprovava volta a pedir foto
      for (const item of os.checklist) {
        if (item.foto_id !== foto.id) continue;
        item.foto_id = null;
        if (item.exige_foto) item.feito = false;
      }
      break;
    }
    case 'comentar_foto': {
      exigir(os, ['andamento', 'pausada'], 'comentar a foto');
      const foto = os.fotos.find(f => ehAFoto(f, a.foto));
      if (foto) foto.comentario = a.comentario;
      break;
    }
    case 'pausar':
      exigir(os, ['andamento'], 'pausar');
      os.situacao = 'pausada';
      break;
    case 'retomar':
      exigir(os, ['pausada'], 'retomar');
      os.situacao = 'andamento';
      break;
    case 'item': {
      exigir(os, ['andamento'], 'mexer no checklist');
      const item = os.checklist.find(i => i.id === a.item);
      if (!item) throw new ApiError(404, 'Item do checklist não encontrado.');
      if (a.feito && item.exige_foto && !item.foto_id) throw new ApiError(409, `Tire a foto deste item para marcar: ${item.texto}`);
      item.feito = a.feito;
      break;
    }
    case 'foto': {
      // foto de item só com a OS em andamento; Antes e Depois também na pausada
      const item = a.item ? os.checklist.find(i => i.id === a.item) : undefined;
      if (a.item && !item) throw new ApiError(404, 'Item do checklist não encontrado.');
      exigir(os, item ? ['andamento'] : ['andamento', 'pausada'], 'anexar foto');
      // a mesma foto é a de mesma identidade: no navegador, dois arquivos iguais têm o mesmo endereço
      let foto = os.fotos.find(f => f.id_cliente === a.idCliente);
      if (!foto) {
        // id negativo = ainda no celular (nunca repete, mesmo depois de remover); a URL é o arquivo local até subir
        const id = Math.min(0, ...os.fotos.map(f => f.id)) - 1;
        foto = { id, url: a.uri, legenda: a.legenda, tirada_em: a.em, id_cliente: a.idCliente, comentario: '', removivel: true };
        os.fotos.push(foto);
      }
      if (item) { item.feito = true; item.foto_id = foto.id; }
      break;
    }
    case 'mensagem':
      exigir(os, ['solicitada', 'aberta', 'andamento', 'pausada', 'concluida'], 'mandar mensagem');
      os.mensagens = [...(os.mensagens ?? []),
        { id: -((os.mensagens?.length ?? 0) + 1), em: a.em, autor: 'tecnico', nome: os.tecnico?.nome ?? 'Você', texto: a.texto }];
      break;
    case 'audio':
      exigir(os, ['aberta', 'andamento', 'pausada', 'concluida'], 'gravar áudio');
      if (!(os.audios ?? []).some(x => x.url === a.uri)) {
        os.audios = [...(os.audios ?? []),
          { id: -((os.audios?.length ?? 0) + 1), url: a.uri, nome: os.tecnico?.nome ?? 'Você', em: a.em, duracao_s: a.duracao }];
      }
      break;
    case 'concluir': {
      exigir(os, ['andamento'], 'concluir');
      const falta = pendenciasParaConcluir(os);
      if (falta.length) throw new ApiError(409, `Para concluir falta: ${falta.join(' e ')}.`);
      os.situacao = 'concluida';
      os.concluida_em = a.em;
      os.conclusao = { em: a.em, lat: a.lat, lng: a.lng, precisao: a.precisao };
      os.relato = a.relato;
      os.assinatura = { ...a.assinatura, em: a.em };
      break;
    }
  }
  return os;
}

/**
 * O servidor recusou a ação (409), mas talvez porque ela JÁ foi feita: o envio anterior chegou
 * e só a resposta se perdeu. Aí a ação sai da fila em silêncio, sem virar erro.
 */
export function jaFeita(os: OrdemServico, a: Acao): boolean {
  switch (a.tipo) {
    case 'checkin': return os.situacao !== 'aberta' && os.checkin !== null;
    case 'pausar': return os.situacao === 'pausada';
    case 'retomar': return os.situacao === 'andamento';
    case 'item': return os.checklist.find(i => i.id === a.item)?.feito === a.feito;
    case 'concluir': return os.situacao === 'concluida';
    case 'a_caminho': return os.situacao !== 'aberta' || !!os.a_caminho_em;
    case 'desfazer_a_caminho': return !os.a_caminho_em;
    case 'remover_foto': return !os.fotos.some(f => ehAFoto(f, a.foto));
    case 'comentar_foto': return os.fotos.find(f => ehAFoto(f, a.foto))?.comentario === a.comentario;
    case 'foto':
    case 'audio':
    case 'mensagem': return false;   // repetida o servidor já ignora pela identidade
  }
}

/** Identidade da ação e da foto: o servidor usa para não gravar a mesma foto duas vezes. */
export function novaIdentidade(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
