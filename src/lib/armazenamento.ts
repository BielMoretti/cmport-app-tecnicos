import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store não existe no navegador — na pré-visualização web a sessão
// fica no localStorage (só pra desenvolvimento; o app de verdade é o Android).
const web = Platform.OS === 'web';

// iOS: sem esta opção o item do keychain entra no backup (iCloud ou cifrado) e abre logado em
// outro iPhone. "ThisDeviceOnly" fica neste aparelho; "AfterFirstUnlock" deixa o app ler o token
// em segundo plano (aviso, envio da fila). No Android a opção é ignorada.
const OPCOES = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

export async function lerItem(chave: string): Promise<string | null> {
  if (web) return globalThis.localStorage?.getItem(chave) ?? null;
  const valor = await SecureStore.getItemAsync(chave, OPCOES);
  // Item gravado por versão antiga mantém o atributo velho: regrava uma vez com o novo.
  if (valor !== null) void SecureStore.setItemAsync(chave, valor, OPCOES).catch(() => {});
  return valor;
}

export async function salvarItem(chave: string, valor: string): Promise<void> {
  if (web) {
    globalThis.localStorage?.setItem(chave, valor);
    return;
  }
  await SecureStore.setItemAsync(chave, valor, OPCOES);
}

export async function apagarItem(chave: string): Promise<void> {
  if (web) {
    globalThis.localStorage?.removeItem(chave);
    return;
  }
  await SecureStore.deleteItemAsync(chave);
}
