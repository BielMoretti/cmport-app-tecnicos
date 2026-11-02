/** Depois de tanto tempo com o app em segundo plano, pede a biometria de novo. */
export const SEGUNDOS_ATE_BLOQUEAR = 60;

/** O app ficou tempo demais em segundo plano? */
export function passouDoTempo(saiuEm: number, agora: number, limiteSegundos = SEGUNDOS_ATE_BLOQUEAR): boolean {
  return agora - saiuEm >= limiteSegundos * 1000;
}
