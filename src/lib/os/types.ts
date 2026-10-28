/**
 * Formato das ordens de serviço. É o contrato com o backend próprio (banco novo, sem Auvo):
 * os nomes dos campos são os que a API vai devolver.
 */

export type Papel = 'TECNICO' | 'SUPERVISOR' | 'ADMIN';

export interface RespostaDeLogin {
  access_token: string;
  token_type: string;
  nome: string;
  role: Papel;
  /** criado pela equipe com senha provisória: até criar a dele, só a tela da senha abre */
  precisa_trocar_senha: boolean;
}

/**
 * Caminho da OS no celular:
 *   aberta ──check-in──▶ andamento ◀──retomar── pausada
 *                            │ └──pausar──▶ ┘
 *                            └──concluir──▶ concluida
 * Cancelar é só do escritório (dash), nunca do técnico.
 * solicitada = o técnico pediu a OS pelo app; espera o escritório aprovar (vira aberta).
 */
export type Situacao = 'solicitada' | 'aberta' | 'andamento' | 'pausada' | 'concluida' | 'cancelada';

export type Prioridade = 'baixa' | 'normal' | 'alta' | 'urgente';

export interface Referencia {
  id: number;
  nome: string;
}

/** Onde e quando o técnico estava (check-in e conclusão). */
export interface Marcacao {
  em: string;
  lat: number | null;
  lng: number | null;
  /** precisão do GPS em metros; null = sem localização (permissão negada ou sem sinal) */
  precisao: number | null;
}

/** Traço riscado pelo técnico na foto: pontos de 0 a 1 sobre a imagem (o servidor desenha). */
export type CorDoTraco = 'vermelho' | 'amarelo' | 'branco';
export interface TracoNaFoto { cor: CorDoTraco; pontos: [number, number][] }

export interface ItemDoChecklist {
  id: number;
  texto: string;
  feito: boolean;
}

export interface Foto {
  id: number;
  /** endereço para mostrar (no aparelho, antes de subir, é o arquivo local) */
  url: string;
  legenda: string;
  tirada_em: string;
}

export interface Assinatura {
  /** quem assinou pelo cliente (síndico, zelador, porteiro) */
  nome: string;
  /** o traço, como caminho SVG ("M10 20 L12 22 …") numa área de 320×160 */
  traco: string;
  em: string;
}

/** Áudio gravado na OS. id negativo = ainda no celular (a url é o arquivo local até subir). */
export interface AudioDaOS {
  id: number;
  url: string;
  nome: string;
  em: string;
  duracao_s: number | null;
}

/** Conversa com o escritório. id negativo = ainda no celular, esperando sinal. */
export interface Mensagem {
  id: number;
  em: string;
  autor: 'tecnico' | 'equipe';
  nome: string;
  texto: string;
}

export interface OrdemServico {
  id: number;
  /** código que a equipe fala ao telefone, ex.: OS-2026-0042 */
  numero: string;
  titulo: string;
  descricao: string;
  tipo: string;
  situacao: Situacao;
  prioridade: Prioridade;
  /** o condomínio ou cliente atendido */
  cliente: Referencia;
  endereco: string;
  /** ponto do condomínio no mapa (nulo = o cadastro não tem ponto: a rota usa o endereço) */
  local?: { lat: number; lng: number } | null;
  tecnico: Referencia | null;
  /** datas em ISO 8601 */
  criada_em: string;
  agendada_para: string | null;
  iniciada_em: string | null;
  concluida_em: string | null;
  checkin: Marcacao | null;
  conclusao: Marcacao | null;
  checklist: ItemDoChecklist[];
  fotos: Foto[];
  assinatura: Assinatura | null;
  /** o que o técnico escreveu ao concluir */
  relato: string;
  /** até quando concluir, pela prioridade (nulo = esperando aprovação) */
  prazo_em?: string | null;
  /** posição na rota do dia que o escritório mandou (1 = a primeira) */
  rota_posicao?: number | null;
  mensagens?: Mensagem[];
  audios?: AudioDaOS[];
}

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  solicitada: 'Esperando aprovação',
  aberta: 'Aberta',
  andamento: 'Em andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};
