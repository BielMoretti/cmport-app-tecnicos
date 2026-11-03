import type { OrdemServico } from './types';

/** Minúsculas e sem acento, para "sao" achar "São". */
export function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** A OS bate com o texto? Cada palavra digitada precisa aparecer no número, título, cliente ou endereço. Texto vazio = tudo. */
export function bateComBusca(os: OrdemServico, texto: string): boolean {
  const palavras = normalizar(texto).split(/\s+/).filter(Boolean);
  if (!palavras.length) return true;
  const alvo = normalizar(`${os.numero} ${os.titulo} ${os.cliente.nome} ${os.endereco}`);
  return palavras.every(p => alvo.includes(p));
}
