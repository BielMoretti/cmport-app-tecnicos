/**
 * No navegador a foto reduzida é um blob: que morre ao recarregar a página. Para esperar na
 * fila, ela vira data: (texto), que fica guardado junto com a fila.
 */
export async function guardarFotoDaFila(uri: string, _id: string, _extensao = 'jpg'): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const blob = await (await fetch(uri)).blob();
  return await new Promise<string>((ok, erro) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result));
    leitor.onerror = () => erro(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

export function apagarFotoDaFila(_uri: string) { /* fica só no texto da fila, que já sai */ }

export function apagarTodasAsFotosDaFila() { /* idem */ }
