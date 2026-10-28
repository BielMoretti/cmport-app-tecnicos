/** No navegador (prévia) não há aviso push: as mesmas funções, sem fazer nada. */
import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

export async function registrarAvisos(): Promise<'sem-projeto'> {
  return 'sem-projeto';
}

export async function desligarAvisos(): Promise<void> { /* nada */ }

export function useAvisoAbreOS(_router: Router, _liberado: boolean) { /* nada */ }
