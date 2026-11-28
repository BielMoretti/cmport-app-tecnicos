import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Carrega quando a tela aparece. Com intervalo, repete enquanto a tela está aberta e o app na frente:
 * em segundo plano para, e ao voltar carrega na hora.
 */
export function useAoVivo(carregar: () => void, intervaloMs: number | null) {
  useFocusEffect(useCallback(() => {
    let relogio: ReturnType<typeof setInterval> | null = null;
    const parar = () => { if (relogio) clearInterval(relogio); relogio = null; };
    const comecar = () => {
      parar();
      carregar();
      if (intervaloMs) relogio = setInterval(carregar, intervaloMs);
    };
    comecar();
    if (!intervaloMs) return;
    const app = AppState.addEventListener('change', s => { if (s === 'active') comecar(); else parar(); });
    return () => { parar(); app.remove(); };
  }, [carregar, intervaloMs]));
}
