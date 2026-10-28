/**
 * As ações do técnico e as regras do caminho da OS, aplicadas no próprio celular — as mesmas
 * que o servidor confere (os_tecnico_service.py). Servem para a tela responder na hora, com ou
 * sem sinal: a ação vai para a fila (lib/fila.ts) e a OS já aparece como vai ficar.
 */
import { ApiError } from './api';
import type { OrdemServico, Situacao, TracoNaFoto } from './types';

export type Acao =
  | { tipo: 'checkin'; os: number; em: string; lat: number | null; lng: number | null; precisao: number | null }
  | { tipo: 'pausar' | 'retomar'; os: number; em: string }
  | { tipo: 'item'; os: number; item: number; feito: boolean; em: string }
  | { tipo: 'foto'; os: number; em: string; idCliente: string; uri: string; nome: string; tipoArquivo: string; legenda: string; marcacoes?: TracoNaFoto[] }
  | { tipo: 'mensagem'; os: number; em: string; idCliente: string; texto: string }
  | { tipo: 'audio'; os: number; em: string; idCliente: string; uri: string; nome: string; tipoArquivo: string; duracao: number }
  | {
      tipo: 'concluir'; os: number; em: string; relato: string; assinatura: { nome: string; traco: string };
      lat: number | null; lng: number | null; precisao: number | null;
    };

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
      break;
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
      item.feito = a.feito;
      break;
    }
    case 'foto':
      exigir(os, ['andamento', 'pausada'], 'anexar foto');
      if (!os.fotos.some(f => f.url === a.uri)) {
        // id negativo = ainda no celular; a URL é o arquivo local até subir
        os.fotos.push({ id: -(os.fotos.length + 1), url: a.uri, legenda: a.legenda, tirada_em: a.em });
      }
      break;
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
    case 'foto':
    case 'audio':
    case 'mensagem': return false;   // repetida o servidor já ignora pela identidade
  }
}

/** Identidade da ação e da foto: o servidor usa para não gravar a mesma foto duas vezes. */
export function novaIdentidade(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
