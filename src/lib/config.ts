/**
 * Endereço da API que este aplicativo (técnicos) usa. É o ÚNICO lugar do código que sabe o endereço.
 *
 * Para trocar de API não se mexe aqui:
 *   - na prévia do computador: arquivo .env.local com EXPO_PUBLIC_API_URL (modelo em .env.example);
 *   - no APK ou AAB: o valor de EXPO_PUBLIC_API_URL de cada tipo de build, em eas.json.
 * O endereço abaixo é só o padrão de quando nenhum dos dois foi definido.
 *
 * É a API dos instaladores (instalador.cmport.com.br), separada da dash: só postes, câmeras, ao vivo
 * e gravações, com o login da dash para quem gerencia câmeras. Nada de financeiro nem de usuários.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://instalador.cmport.com.br/api/instalador/v1').replace(/\/+$/, '');

/**
 * O backend devolve os links de vídeo e de miniatura como caminho ("/api/instalador/v1/gravacoes/...").
 * O app nativo precisa do endereço inteiro; links já completos (nuvem) passam direto.
 */
export function urlAbsoluta(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  if (/^https?:\/\//.test(caminho)) return caminho;
  return new URL(API_URL).origin + (caminho.startsWith('/') ? caminho : `/${caminho}`);
}
