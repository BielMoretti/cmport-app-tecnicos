/**
 * Relógio do atendimento: corre desde o check-in enquanto a OS está em andamento e fica parado
 * na pausa. Passou do prazo da OS, muda de cor e diz isso por escrito.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlifoRelogio } from '@/components/os/arte';
import { Pulso } from '@/components/os/movimento';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { componentes, corpo, espaco, fontes, vidro, type Paleta } from '@/lib/tema';

const dois = (n: number) => String(n).padStart(2, '0');

function relogio(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return `${h ? `${h}:` : ''}${dois(m)}:${dois(segundos % 60)}`;
}

export default function Cronometro({ desde, rodando, foraDoPrazo }: { desde: string; rodando: boolean; foraDoPrazo: boolean }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [rodando]);

  const segundos = Math.max(0, Math.floor((agora - new Date(desde).getTime()) / 1000));
  const cor = foraDoPrazo ? cores.erro : rodando ? cores.andamento.texto : cores.textoSuave;
  const legenda = foraDoPrazo ? 'O prazo desta OS já passou' : rodando ? 'Em atendimento desde o check-in' : 'Pausado';

  return (
    <View
      style={[styles.caixa, vidro(cores, 'forte'), foraDoPrazo && { borderColor: cores.erro }]}
      accessibilityRole="timer"
      accessibilityLabel={`${legenda}: ${relogio(segundos)}`}
    >
      {rodando ? <Pulso cor={cor} tamanho={10} /> : <GlifoRelogio cor={cor} tamanho={18} />}
      <View style={{ flex: 1 }}>
        <Text style={[styles.tempo, { color: cor }]}>{relogio(segundos)}</Text>
        <Text style={styles.legenda}>{legenda}</Text>
      </View>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  caixa: { flexDirection: 'row', alignItems: 'center', gap: espaco[3], borderRadius: componentes.cartao.raio, paddingHorizontal: espaco[5], paddingVertical: espaco[4] },
  tempo: { ...fontes.nome, fontSize: corpo.destaque, fontVariant: ['tabular-nums'] },
  legenda: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
});
