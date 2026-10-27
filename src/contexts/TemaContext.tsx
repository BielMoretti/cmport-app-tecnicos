import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { paleta, type Modo, type Paleta } from '@/lib/tema';

// Um tema só (painel escuro, 26/10/2026). O contexto continua para as telas lerem a paleta
// do mesmo jeito de sempre.
interface TemaContextValue {
  modo: Modo;
  cores: Paleta;
}

const TemaContext = createContext<TemaContextValue | null>(null);

const VALOR: TemaContextValue = { modo: 'escuro', cores: paleta };

export function TemaProvider({ children }: { children: ReactNode }) {
  return <TemaContext.Provider value={VALOR}>{children}</TemaContext.Provider>;
}

export function useTema(): TemaContextValue {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error('useTema precisa estar dentro de <TemaProvider>.');
  return ctx;
}

/** Estilos a partir da paleta: passe uma função definida fora do componente. */
export function useEstilos<T>(criar: (cores: Paleta) => T): T {
  const { cores } = useTema();
  return useMemo(() => criar(cores), [criar, cores]);
}
