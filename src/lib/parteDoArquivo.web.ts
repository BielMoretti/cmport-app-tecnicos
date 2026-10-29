/** No navegador o seletor e o redutor devolvem blob: ou data: (a fila guarda data:), que viram Blob. */
export async function parteDoArquivo(uri: string): Promise<Blob> {
  return (await fetch(uri)).blob();
}
