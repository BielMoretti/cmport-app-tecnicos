/**
 * A sessão do técnico. Um login só, com a conta de técnico da OS, que vale nos dois serviços do
 * mesmo endereço (lib/config.ts), cada um com o próprio token:
 *
 *   1. entra no serviço de OS (/api/tecnico/v1/auth/login);
 *   2. senha provisória? Só a tela de criar a senha abre. Criada, segue com a senha nova;
 *   3. entra no serviço de câmeras (/api/instalador/v1/auth/login) com a mesma senha.
 *
 * Se as câmeras não responderem no login (serviço fora do ar naquela hora), o técnico entra só
 * com as OS: o trabalho do dia não para, e as telas de câmeras pedem para entrar de novo.
 * A senha nunca é gravada: fica só na memória até a troca obrigatória acabar.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import * as cameras from '@/lib/api';
import { apagarItem, lerItem, salvarItem } from '@/lib/armazenamento';
import { biometriaDisponivel, biometriaLigada, ligarBiometria, useBloquearAoVoltar } from '@/lib/biometria';
import { venceEm } from '@/lib/cliente';
import { buscarFoto } from '@/lib/foto';
import { desligarAvisos } from '@/lib/os/avisos';
import * as ordens from '@/lib/os/api';
import { limparDoCelular } from '@/lib/os/ordens';
import type { RespostaDeLogin } from '@/lib/os/types';
import { buscarPerfil } from '@/lib/perfil';
import type { Role, TokenResponse } from '@/lib/types';

const CHAVE_SESSAO = 'cmport_tecnico_sessao';
// de quem são a fila e as OS guardadas no aparelho (outro técnico entrando = começa limpo)
const CHAVE_DONO = 'cmport_os_dono';
// a tela de permissões já passou neste aparelho (as permissões são do aparelho, não da conta)
const CHAVE_PERMISSOES = 'cmport_os_permissoes_vistas';
// sessão do app de câmeras antigo (login da dash): não vale mais, é apagada ao abrir
const CHAVE_ANTIGA = 'cmport_sessao';

interface Sessao {
  email: string;
  nome: string;
  /** nível no serviço de câmeras; a conta de OS entra como TECNICO (todo técnico instala) */
  role: Role;
  /** token do serviço de OS */
  tokenOs: string;
  /** token do serviço de câmeras; null = as câmeras não entraram nesta sessão */
  token: string | null;
  /** login com a senha provisória da equipe: só a tela de criar a senha abre */
  trocarSenha: boolean;
  /** versão dos termos que falta aceitar (quem decide é o servidor): até aceitar, só a tela dos termos abre */
  termosPendentes?: string | null;
  /** como a pessoa quer ser chamada na saudação (Conta); vazio = primeiro nome */
  apelido?: string;
}

interface AuthContextValue {
  usuario: Sessao | null;
  carregando: boolean;
  /** a biometria está ligada e ainda não foi confirmada: só a tela de bloqueio abre */
  bloqueado: boolean;
  desbloquear: () => void;
  login: (email: string, senha: string) => Promise<void>;
  /** sair da conta: apaga a fila e as OS guardadas no aparelho (são de quem saiu) */
  logout: () => Promise<void>;
  /** primeiro acesso: troca a senha provisória pela da pessoa e libera o app */
  criarSenha: (senhaNova: string, senhaAtual?: string) => Promise<void>;
  /** a senha digitada no login, enquanto a troca obrigatória não foi feita. Só na memória */
  senhaInicial: () => string | null;
  /** grava no servidor o aceite da versão pendente dos termos e libera o app */
  aceitarTermos: () => Promise<void>;
  /** a tela de permissões do primeiro acesso já passou neste aparelho */
  permissoesVistas: boolean;
  concluirPermissoes: () => void;
  /** depois de editar o perfil: troca o nome e o apelido de quem está logado, sem novo login */
  atualizarSessao: (dados: { nome: string; apelido: string }) => Promise<void>;
  /** a foto do perfil, pronta para um <Image>; null = sem foto (mostra as iniciais) */
  foto: string | null;
  definirFoto: (foto: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const vencido = (token: string) => venceEm(token, 0);

/** Entra nas câmeras com a mesma senha. Fora do ar ou recusado: segue só com as OS. */
async function entrarNasCameras(email: string, senha: string): Promise<{ token: string; role: Role } | null> {
  try {
    const r = await cameras.api<TokenResponse>('/auth/login', { method: 'POST', body: { email, senha } });
    return { token: r.access_token, role: r.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [bloqueado, setBloqueado] = useState(false);
  const desbloquear = useCallback(() => setBloqueado(false), []);
  const bloquear = useCallback(() => setBloqueado(true), []);
  useBloquearAoVoltar(!!usuario, bloquear);
  // nunca é gravada: serve só para a troca obrigatória não pedir de novo a senha recém-digitada
  const senhaDoLogin = useRef<string | null>(null);
  const [permissoesVistas, setPermissoesVistas] = useState(true);
  // fica só na memória: é grande demais para o cofre da sessão e é buscada de novo ao abrir o app
  const [foto, definirFoto] = useState<string | null>(null);

  const guardar = useCallback((sessao: Sessao) => {
    ordens.setToken(sessao.tokenOs);
    cameras.setToken(sessao.token);
    setUsuario(sessao);
    void salvarItem(CHAVE_SESSAO, JSON.stringify(sessao)).catch(() => {});
  }, []);

  // a sessão que vence sozinha NÃO apaga a fila: o técnico entra de novo e ela sobe
  const encerrar = useCallback(async (apagarDados: boolean) => {
    // ainda com a sessão: o aparelho para de receber os avisos de quem está saindo
    if (apagarDados) await desligarAvisos();
    senhaDoLogin.current = null;
    setBloqueado(false);
    if (apagarDados) await ligarBiometria(false);
    ordens.setToken(null);
    cameras.setToken(null);
    setUsuario(null);
    definirFoto(null);
    await apagarItem(CHAVE_SESSAO).catch(() => {});
    if (apagarDados) await limparDoCelular().catch(() => {});
  }, []);
  const logout = useCallback(() => encerrar(true), [encerrar]);

  // token renovado por um dos serviços (dura 8 horas; o servidor renova por até 30 dias): grava o novo
  useEffect(() => {
    ordens.setAoRenovar(nova => setUsuario(atual => {
      if (!atual) return atual;
      const sessao = { ...atual, tokenOs: nova.access_token };
      void salvarItem(CHAVE_SESSAO, JSON.stringify(sessao)).catch(() => {});
      return sessao;
    }));
    cameras.setAoRenovar(nova => setUsuario(atual => {
      if (!atual) return atual;
      const sessao = { ...atual, token: nova.access_token };
      void salvarItem(CHAVE_SESSAO, JSON.stringify(sessao)).catch(() => {});
      return sessao;
    }));
    return () => { ordens.setAoRenovar(null); cameras.setAoRenovar(null); };
  }, []);

  // restaura a sessão salva ao abrir o app
  useEffect(() => {
    (async () => {
      try {
        await apagarItem(CHAVE_ANTIGA).catch(() => {});
        setPermissoesVistas((await lerItem(CHAVE_PERMISSOES).catch(() => null)) === 'sim');
        const salvo = await lerItem(CHAVE_SESSAO);
        const sessao = salvo ? (JSON.parse(salvo) as Sessao) : null;
        if (!sessao?.tokenOs) return;
        ordens.setToken(sessao.tokenOs);
        cameras.setToken(sessao.token);
        // vencido: tenta trocar por um novo sem pedir senha, antes de mandar ao login
        if (vencido(sessao.tokenOs) && !(await ordens.renovarSessao())) {
          ordens.setToken(null);
          cameras.setToken(null);
          await apagarItem(CHAVE_SESSAO);
          return;
        }
        if (sessao.token && vencido(sessao.token) && !(await cameras.renovarSessao())) {
          cameras.setToken(null);
          sessao.token = null;
        }
        // biometria ligada neste aparelho: abre travado até confirmar
        if ((await biometriaLigada()) && (await biometriaDisponivel())) setBloqueado(true);
        setUsuario(sessao);
      } catch {
        /* sessão corrompida — segue deslogado */
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  useEffect(() => {
    const expirou = () => { void encerrar(false); };
    ordens.setAoExpirar(expirou);
    cameras.setAoExpirar(expirou);
    return () => { ordens.setAoExpirar(null); cameras.setAoExpirar(null); };
  }, [encerrar]);

  // termos: pergunta ao servidor a cada abertura (texto novo = aceite de novo). Sem sinal ou servidor
  // antigo (sem o campo): não trava ninguém
  const tokenOs = usuario?.tokenOs;
  useEffect(() => {
    if (!tokenOs) return;
    let vivo = true;
    ordens.api<{ termos_pendentes?: string | null }>('/auth/me')
      .then(me => {
        if (!vivo || me.termos_pendentes === undefined) return;
        setUsuario(atual => (atual && (atual.termosPendentes ?? null) !== me.termos_pendentes ? { ...atual, termosPendentes: me.termos_pendentes } : atual));
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [tokenOs]);

  // o apelido e a foto não vêm no login: busca o perfil uma vez por sessão, em segundo plano
  const token = usuario?.token;
  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    buscarPerfil()
      .then(async ({ perfil, noServidor }) => {
        if (cancelado) return;
        if (perfil.apelido) setUsuario(atual => (atual && atual.apelido !== perfil.apelido ? { ...atual, apelido: perfil.apelido } : atual));
        const imagem = await buscarFoto(perfil.id, noServidor);
        if (!cancelado) definirFoto(imagem);
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [token]);

  const login = useCallback(async (email: string, senha: string) => {
    const limpo = email.trim().toLowerCase();
    if (!limpo || !senha) throw new ordens.ApiError(400, 'Preencha o e-mail e a senha.');
    const os = await ordens.api<RespostaDeLogin>('/auth/login', { method: 'POST', body: { email: limpo, senha } });
    const trocarSenha = os.precisa_trocar_senha === true;
    // com a senha provisória as câmeras recusam: entra nelas depois de criar a senha
    const cam = trocarSenha ? null : await entrarNasCameras(limpo, senha);
    // outro técnico neste aparelho: a fila e as OS guardadas eram do anterior
    const dono = await lerItem(CHAVE_DONO).catch(() => null);
    if (dono && dono !== limpo) await limparDoCelular().catch(() => {});
    await salvarItem(CHAVE_DONO, limpo).catch(() => {});
    senhaDoLogin.current = trocarSenha ? senha : null;
    guardar({ email: limpo, nome: os.nome, role: cam?.role ?? 'TECNICO', tokenOs: os.access_token, token: cam?.token ?? null, trocarSenha });
  }, [guardar]);

  const criarSenha = useCallback(async (senhaNova: string, senhaAtual?: string) => {
    const atual = senhaAtual ?? senhaDoLogin.current;
    if (!atual) throw new ordens.ApiError(400, 'Digite a senha provisória que você recebeu.');
    await ordens.api('/auth/trocar-senha', { method: 'POST', body: { senha_atual: atual, senha_nova: senhaNova } });
    senhaDoLogin.current = null;
    if (!usuario) return;
    const cam = await entrarNasCameras(usuario.email, senhaNova);
    guardar({ ...usuario, trocarSenha: false, token: cam?.token ?? null, role: cam?.role ?? usuario.role });
  }, [usuario, guardar]);

  const senhaInicial = useCallback(() => senhaDoLogin.current, []);

  const aceitarTermos = useCallback(async () => {
    const versao = usuario?.termosPendentes;
    if (!usuario || !versao) return;
    try {
      await ordens.api('/auth/aceitar-termos', { method: 'POST', body: { versao } });
    } catch (e) {
      // o texto mudou enquanto a tela estava aberta: mostra a versão nova
      if (e instanceof ordens.ApiError && e.status === 409) {
        const me = await ordens.api<{ termos_pendentes?: string | null }>('/auth/me');
        guardar({ ...usuario, termosPendentes: me.termos_pendentes ?? null });
      }
      throw e;
    }
    guardar({ ...usuario, termosPendentes: null });
  }, [usuario, guardar]);

  const concluirPermissoes = useCallback(() => {
    setPermissoesVistas(true);
    void salvarItem(CHAVE_PERMISSOES, 'sim').catch(() => {});
  }, []);

  const atualizarSessao = useCallback(async (dados: { nome: string; apelido: string }) => {
    if (!usuario) return;
    guardar({ ...usuario, nome: dados.nome, apelido: dados.apelido });
  }, [usuario, guardar]);

  const valor = useMemo(() => ({
    usuario, carregando, bloqueado, desbloquear, login, logout, criarSenha, senhaInicial, aceitarTermos, permissoesVistas, concluirPermissoes,
    atualizarSessao, foto, definirFoto,
  }), [usuario, carregando, bloqueado, desbloquear, login, logout, criarSenha, senhaInicial, aceitarTermos, permissoesVistas, concluirPermissoes, atualizarSessao, foto]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}
