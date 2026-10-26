import { api } from './api';
import { lerItem } from './armazenamento';
import type { Role } from './types';

/**
 * O perfil de quem está logado ("Minha conta"), só para mostrar: nome e email, e o apelido
 * quando existir. Nome e senha se mudam na dash; o serviço dos instaladores só lê o cadastro.
 *
 *   GET /auth/me → id, nome, email e role (apelido, telefone, data_nascimento e unidade, se
 *                  o servidor tiver esses campos)
 *
 * Sem os campos no servidor, vale o que uma versão antiga do app guardou neste aparelho.
 */
export interface Perfil {
  id: number;
  nome: string;
  email: string;
  role: Role;
  apelido: string;
  telefone: string;          // só dígitos
  dataNascimento: string;    // AAAA-MM-DD, ou vazio
  unidade: string;
}

interface RespostaDoServidor {
  id: number;
  nome: string;
  email: string;
  role: Role;
  apelido?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  unidade?: string | null;
}

type Extras = Pick<Perfil, 'apelido' | 'telefone' | 'dataNascimento' | 'unidade'>;
const SEM_EXTRAS: Extras = { apelido: '', telefone: '', dataNascimento: '', unidade: '' };
const chaveLocal = (id: number) => `cmport_perfil_${id}`;

async function lerLocal(id: number): Promise<Extras> {
  try {
    const salvo = await lerItem(chaveLocal(id));
    return salvo ? { ...SEM_EXTRAS, ...(JSON.parse(salvo) as Partial<Extras>) } : SEM_EXTRAS;
  } catch {
    return SEM_EXTRAS;
  }
}

/** O servidor já conhece os campos do perfil? (a resposta traz a chave, mesmo que nula) */
const servidorTemPerfil = (r: RespostaDoServidor) => 'apelido' in r;

function montar(r: RespostaDoServidor, extras: Extras): Perfil {
  return { id: r.id, nome: r.nome, email: r.email, role: r.role, ...extras };
}

export async function buscarPerfil(): Promise<{ perfil: Perfil; noServidor: boolean }> {
  const r = await api<RespostaDoServidor>('/auth/me');
  if (servidorTemPerfil(r)) {
    return {
      noServidor: true,
      perfil: montar(r, { apelido: r.apelido ?? '', telefone: r.telefone ?? '', dataNascimento: r.data_nascimento ?? '', unidade: r.unidade ?? '' }),
    };
  }
  return { noServidor: false, perfil: montar(r, await lerLocal(r.id)) };
}
