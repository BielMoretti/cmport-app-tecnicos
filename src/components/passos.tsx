import { StyleSheet, View } from 'react-native';

import { useEstilos } from '@/contexts/TemaContext';
import { componentes, espaco, raio, type Paleta } from '@/lib/tema';

/** Os passos da instalação, na ordem. */
export const PASSOS = ['Condomínio', 'Poste', 'Câmeras', 'Endereços'] as const;

/**
 * Barra de quatro trechos: o técnico vê onde está e quanto falta. O nome do passo já está na
 * pergunta da tela; o leitor de tela ouve "Passo 2 de 4: Poste".
 */
export function Passos({ atual }: { atual: number }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View
      style={styles.trechos}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Passo ${atual} de ${PASSOS.length}: ${PASSOS[atual - 1]}`}
    >
      {PASSOS.map((p, i) => (
        <View key={p} style={[styles.trecho, i < atual && styles.trechoFeito]} />
      ))}
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  trechos: { flexDirection: 'row', gap: espaco[1] },
  trecho: { flex: 1, height: componentes.passo.altura, borderRadius: raio.pilula, backgroundColor: c.superficieForte },
  trechoFeito: { backgroundColor: c.azul },
});
