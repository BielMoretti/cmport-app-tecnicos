/**
 * Endereço do servidor que este aplicativo (técnicos) usa. É o ÚNICO lugar do código que sabe o endereço.
 *
 * Para trocar de servidor não se mexe aqui:
 *   - na prévia do computador: arquivo .env.local com EXPO_PUBLIC_SITE (modelo em .env.example);
 *   - no APK ou AAB: o valor de EXPO_PUBLIC_SITE de cada tipo de build, em eas.json.
 * O endereço abaixo é só o padrão de quando nenhum dos dois foi definido.
 *
 * Um endereço, dois serviços separados (cada um só com o acesso de banco dele):
 *   - câmeras (/api/instalador/v1): postes, câmeras, ao vivo e gravações;
 *   - ordens de serviço (/api/tecnico/v1): a OS do técnico, do check-in à conclusão.
 * O login é a conta de técnico da OS nos dois.
 */
const SITE = (process.env.EXPO_PUBLIC_SITE ?? 'https://tec.cmport.com.br').replace(/\/+$/, '');

/** API das câmeras. */
export const API_URL = `${SITE}/api/instalador/v1`;

/** API das ordens de serviço. */
export const API_OS_URL = `${SITE}/api/tecnico/v1`;

/** Termos de uso e privacidade do app (páginas públicas no mesmo endereço). */
export const TERMOS_DE_USO = `${SITE}/termos`;
export const POLITICA_DE_PRIVACIDADE = `${SITE}/privacidade`;

/**
 * O backend devolve os links de vídeo, miniatura, foto e áudio como caminho ("/api/.../gravacoes/...").
 * O app nativo precisa do endereço inteiro; links já completos (nuvem) e arquivos do aparelho passam direto.
 */
export function urlAbsoluta(caminho: string): string;
export function urlAbsoluta(caminho: string | null | undefined): string | null;
export function urlAbsoluta(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  if (/^(https?|file|blob|data|content):/.test(caminho)) return caminho;
  return SITE + (caminho.startsWith('/') ? caminho : `/${caminho}`);
}
