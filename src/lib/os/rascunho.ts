/**
 * Rascunho da conclusão de cada OS (relato, nome de quem assina e o traço da assinatura), guardado no
 * celular enquanto o técnico escreve: o app fechou sem querer, a bateria acabou ou o Android matou o
 * app em segundo plano? Ao voltar, está tudo lá. Some quando a OS é concluída ou o técnico sai da conta.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIXO = 'cmport_os_rascunho_';

export interface Rascunho {
  relato: string;
  nome: string;
  traco: string;
  em: string;
}

export async function lerRascunho(osId: number): Promise<Rascunho | null> {
  try {
    const bruto = await AsyncStorage.getItem(PREFIXO + osId);
    return bruto ? (JSON.parse(bruto) as Rascunho) : null;
  } catch {
    return null;
  }
}

export async function salvarRascunho(osId: number, r: Omit<Rascunho, 'em'>): Promise<void> {
  try {
    if (!r.relato && !r.nome && !r.traco) { await AsyncStorage.removeItem(PREFIXO + osId); return; }
    await AsyncStorage.setItem(PREFIXO + osId, JSON.stringify({ ...r, em: new Date().toISOString() }));
  } catch { /* sem espaço: segue sem rascunho */ }
}

export async function apagarRascunho(osId: number): Promise<void> {
  await AsyncStorage.removeItem(PREFIXO + osId).catch(() => {});
}

/** Ao sair da conta: os rascunhos eram de quem saiu. */
export async function apagarRascunhos(): Promise<void> {
  try {
    const chaves = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PREFIXO));
    if (chaves.length) await AsyncStorage.multiRemove(chaves);
  } catch { /* nada a apagar */ }
}
