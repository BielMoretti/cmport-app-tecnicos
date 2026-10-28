/**
 * Molde dos clientes de API do app. São dois serviços no mesmo endereço, cada um com o próprio
 * token: câmeras (lib/api.ts) e ordens de serviço (lib/os/api.ts). Cada cliente guarda o token
 * dele, renova sozinho antes de vencer (POST /auth/renovar: o token dura 8 horas e o servidor
 * renova por até 30 dias desde o login) e avisa quando o servidor recusa o token.
 */

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** O que o login e o /auth/renovar dos dois serviços devolvem (o resto dos campos varia). */
export interface TokenDoServico {
  access_token: string;
}

interface Opcoes {
  base: string;
  /** cabeçalhos a mais em todo pedido (ex.: a identidade do aparelho) */
  cabecalhos?: () => Promise<Record<string, string>>;
  /** ajuste da resposta antes de chegar à tela */
  tratar?: (corpo: unknown) => unknown;
  /** pedido sem token nenhum: o serviço não está disponível nesta sessão */
  semToken?: string;
}

const UMA_HORA_MS = 60 * 60 * 1000;
// sem resposta neste prazo, desiste: um pedido preso (Wi-Fi que caiu no meio, servidor reiniciando)
// não pode segurar a fila do celular para sempre. Arquivo tem mais tempo: a foto sobe devagar no 3G.
const PRAZO_MS = 30_000;
const PRAZO_ARQUIVO_MS = 120_000;

/** fetch com prazo; a resposta também é lida dentro dele. Sem rede ou sem resposta = ApiError 0. */
async function buscar(url: string, init: RequestInit, prazoMs: number): Promise<{ res: Response; corpo: unknown }> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), prazoMs);
  try {
    const res = await fetch(url, { ...init, signal: controle.signal });
    const corpo: unknown = res.status === 204 ? null : await res.json().catch(() => null);
    if (controle.signal.aborted) throw new Error('prazo');
    return { res, corpo };
  } catch {
    throw new ApiError(0, controle.signal.aborted ? 'O servidor demorou demais para responder.' : 'Sem conexão com o servidor.');
  } finally {
    clearTimeout(relogio);
  }
}

/** O token vence dentro deste prazo? Token ilegível conta como "não sei". */
export function venceEm(token: string | null, prazoMs: number): boolean {
  if (!token) return false;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(base64)) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 - Date.now() < prazoMs;
  } catch {
    return false;
  }
}

function mensagemDeErro(status: number, corpo: unknown): string {
  const detail = (corpo as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const linhas = (detail as { loc?: unknown[]; msg?: string }[]).map(d => {
      const campo = String((d.loc ?? []).filter(p => p !== 'body').join('.'));
      const motivo = d.msg === 'Field required' ? 'é obrigatório' : (d.msg ?? 'não foi aceito');
      return campo ? `${campo}: ${motivo}` : motivo;
    });
    return `O servidor não aceitou os dados. ${linhas.join('; ')}.`;
  }
  if (status === 429) return 'Muitas tentativas. Espere 1 minuto e tente de novo.';
  if (status >= 500) return 'Servidor indisponível. Tente novamente.';
  return `Erro ${status}.`;
}

export function criarCliente({ base, cabecalhos, tratar, semToken }: Opcoes) {
  let token: string | null = null;
  let aoExpirar: (() => void) | null = null;
  let aoRenovar: ((nova: TokenDoServico) => void) | null = null;
  let renovando: Promise<boolean> | null = null;

  /** Troca o token por um novo sem pedir senha. Vários pedidos ao mesmo tempo compartilham uma renovação só. */
  function renovarSessao(): Promise<boolean> {
    renovando ??= (async () => {
      try {
        const { res, corpo } = await buscar(`${base}/auth/renovar`, {
          method: 'POST', headers: { Accept: 'application/json', ...(await cabecalhos?.()), Authorization: `Bearer ${token}` },
        }, PRAZO_MS);
        const nova = corpo as TokenDoServico | null;
        if (!res.ok || !nova?.access_token) return false;
        token = nova.access_token;
        aoRenovar?.(nova);
        return true;
      } catch {
        return false;
      } finally {
        renovando = null;
      }
    })();
    return renovando;
  }

  async function pedir<T>(path: string, method: string, extra: Record<string, string>, body: BodyInit | undefined,
    prazoMs = PRAZO_MS): Promise<T> {
    const login = path === '/auth/login';
    if (!token && !login && semToken) throw new ApiError(401, semToken);
    // falta menos de uma hora: renova antes, para o pedido não bater num token vencido
    if (token && !login && venceEm(token, UMA_HORA_MS)) await renovarSessao();
    const headers: Record<string, string> = { Accept: 'application/json', ...(await cabecalhos?.()), ...extra };
    if (token && !login) headers.Authorization = `Bearer ${token}`;

    const { res, corpo } = await buscar(`${base}${path}`, { method, headers, body }, prazoMs);

    if (!res.ok) {
      // o login recusado também é 401, mas não há sessão para encerrar
      if (res.status === 401 && token && !login) aoExpirar?.();
      throw new ApiError(res.status, mensagemDeErro(res.status, corpo));
    }
    return (tratar ? tratar(corpo) : corpo) as T;
  }

  return {
    setToken(novo: string | null) { token = novo; },
    /** Chamado quando o servidor recusa o token (401): a sessão acabou. */
    setAoExpirar(fn: (() => void) | null) { aoExpirar = fn; },
    /** Chamado quando o token foi trocado por um novo, para quem guarda a sessão gravá-lo. */
    setAoRenovar(fn: ((nova: TokenDoServico) => void) | null) { aoRenovar = fn; },
    renovarSessao,

    // redirect_slashes=False no backend — nunca mandar barra no final do path (dá 404)
    api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
      const headers: Record<string, string> = {};
      if (init.body !== undefined) headers['Content-Type'] = 'application/json';
      return pedir<T>(path, init.method ?? 'GET', headers, init.body !== undefined ? JSON.stringify(init.body) : undefined);
    },

    /** Envia um arquivo (multipart), com campos de texto junto. */
    async enviarArquivo<T>(path: string, arquivo: { uri: string; nome: string; tipo: string }, campos: Record<string, string>): Promise<T> {
      const form = new FormData();
      for (const [k, v] of Object.entries(campos)) form.append(k, v);
      if (typeof window !== 'undefined' && /^(blob|data):/.test(arquivo.uri)) {
        // navegador: o seletor e o redutor devolvem blob: ou data:
        form.append('arquivo', await (await fetch(arquivo.uri)).blob(), arquivo.nome);
      } else {
        // aparelho: o React Native lê o arquivo local a partir do uri
        form.append('arquivo', { uri: arquivo.uri, name: arquivo.nome, type: arquivo.tipo } as unknown as Blob);
      }
      // sem Content-Type: o fetch põe o multipart com o separador certo
      return pedir<T>(path, 'POST', {}, form, PRAZO_ARQUIVO_MS);
    },
  };
}
