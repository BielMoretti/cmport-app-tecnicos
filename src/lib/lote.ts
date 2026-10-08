/**
 * Cadastro de moradores em lote: lê as linhas coladas de uma planilha e prepara cada
 * pessoa (nome, email e senha). Quem vem sem senha ganha uma, gerada aqui.
 */
export interface LinhaDoLote {
  /** número da linha no texto colado, começando em 1 */
  numero: number;
  nome: string;
  email: string;
  senha: string;
  /** a senha foi gerada pelo app (a pessoa não trouxe uma na planilha) */
  senhaGerada: boolean;
  /** por que a linha não pode ser usada; null = está boa */
  problema: string | null;
}

// sem 0/O, 1/l/I: ninguém confunde ao ler a senha num papel ou no WhatsApp
const LETRAS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Senha de 10 caracteres. Usa o gerador seguro do aparelho quando existe. */
export function gerarSenha(): string {
  const sorteio = new Uint32Array(10);
  const seguro = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (seguro?.getRandomValues) seguro.getRandomValues(sorteio);
  else for (let i = 0; i < sorteio.length; i++) sorteio[i] = Math.floor(Math.random() * 0xffffffff);
  return Array.from(sorteio, n => LETRAS[n % LETRAS.length]).join('');
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Cada linha: nome, email e, opcionalmente, senha — separados por tabulação (é o que vem ao
 * copiar células do Excel ou do Google Planilhas), ponto e vírgula ou vírgula. Uma primeira
 * linha de cabeçalho ("Nome; Email") é ignorada.
 */
export function lerLote(texto: string): LinhaDoLote[] {
  const linhas: LinhaDoLote[] = [];
  const vistos = new Set<string>();
  texto.split(/\r?\n/).forEach((bruta, indice) => {
    if (bruta.trim() === '') return;
    const separador = bruta.includes('\t') ? '\t' : bruta.includes(';') ? ';' : ',';
    const [nome = '', emailBruto = '', senhaBruta = ''] = bruta.split(separador).map(p => p.trim());
    const email = emailBruto.toLowerCase();
    // cabeçalho: primeira linha em que a coluna do email não é um email
    if (linhas.length === 0 && indice === 0 && !email.includes('@') && /e-?mail/i.test(emailBruto)) return;

    let problema: string | null = null;
    if (nome.length < 2) problema = 'Falta o nome.';
    else if (!EMAIL.test(email)) problema = 'Email inválido.';
    else if (vistos.has(email)) problema = 'Email repetido nesta lista.';
    else if (senhaBruta !== '' && senhaBruta.length < 6) problema = 'A senha precisa de pelo menos 6 caracteres.';
    if (!problema) vistos.add(email);

    linhas.push({ numero: indice + 1, nome, email, senha: senhaBruta || gerarSenha(), senhaGerada: senhaBruta === '', problema });
  });
  return linhas;
}
