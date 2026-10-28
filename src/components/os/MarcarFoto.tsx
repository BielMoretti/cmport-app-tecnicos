/**
 * Depois de tirar a foto: o técnico risca com o dedo o que fez ou onde está o problema (seta, círculo,
 * sublinhado). Os traços saem com pontos de 0 a 1 sobre a foto e o servidor desenha na imagem antes do
 * carimbo (os_carimbo.py). Sem marcar nada, a foto vai como está.
 */
import { useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/os/ui';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { corpo, espaco, fontes, raio, type Paleta } from '@/lib/tema';
import type { CorDoTraco, TracoNaFoto } from '@/lib/os/types';

const CORES: { valor: CorDoTraco; rotulo: string; hex: string }[] = [
  { valor: 'vermelho', rotulo: 'Vermelho', hex: '#E53935' },
  { valor: 'amarelo', rotulo: 'Amarelo', hex: '#FFD600' },
  { valor: 'branco', rotulo: 'Branco', hex: '#FFFFFF' },
];
const HEX: Record<CorDoTraco, string> = { vermelho: '#E53935', amarelo: '#FFD600', branco: '#FFFFFF' };
const arred = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;

export default function MarcarFoto({ foto, aoEnviar, aoCancelar }: {
  foto: { uri: string; largura: number; altura: number };
  aoEnviar: (tracos: TracoNaFoto[]) => void;
  aoCancelar: () => void;
}) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const margem = useSafeAreaInsets();
  const [cor, setCor] = useState<CorDoTraco>('vermelho');
  const [tracos, setTracos] = useState<TracoNaFoto[]>([]);
  const [palco, setPalco] = useState({ w: 0, h: 0 });
  const atual = useRef<TracoNaFoto | null>(null);

  // a foto inteira cabe no palco (contain): é a área onde os pontos valem de 0 a 1
  const proporcao = foto.largura / Math.max(1, foto.altura);
  const caixa = palco.w && palco.h
    ? (palco.w / palco.h > proporcao ? { w: palco.h * proporcao, h: palco.h } : { w: palco.w, h: palco.w / proporcao })
    : { w: 0, h: 0 };

  const ponto = (e: GestureResponderEvent): [number, number] =>
    [arred(e.nativeEvent.locationX / Math.max(1, caixa.w)), arred(e.nativeEvent.locationY / Math.max(1, caixa.h))];

  const caminho = (t: TracoNaFoto) => t.pontos
    .map(([x, y], i) => `${i ? 'L' : 'M'}${(x * caixa.w).toFixed(1)} ${(y * caixa.h).toFixed(1)}`).join(' ');

  return (
    <Modal visible animationType="fade" onRequestClose={aoCancelar} statusBarTranslucent>
      <View style={[styles.fundo, { paddingTop: margem.top + espaco[2], paddingBottom: margem.bottom + espaco[3] }]}>
        <View style={styles.topo}>
          <Text style={styles.titulo} accessibilityRole="header">Marcar na foto</Text>
          <Text style={styles.ajuda}>Risque com o dedo o que foi feito ou onde está o problema.</Text>
        </View>

        <View style={styles.palco} onLayout={(e: LayoutChangeEvent) => setPalco({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {caixa.w > 0 && (
            <View
              style={{ width: caixa.w, height: caixa.h }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={e => { atual.current = { cor, pontos: [ponto(e)] }; setTracos(t => [...t, atual.current!]); }}
              onResponderMove={e => {
                const t = atual.current;
                if (!t || t.pontos.length >= 600) return;
                t.pontos = [...t.pontos, ponto(e)];
                setTracos(lista => [...lista.slice(0, -1), { ...t }]);
              }}
              onResponderRelease={() => { atual.current = null; }}
              accessibilityLabel="Foto para marcar. Risque com o dedo."
            >
              <Image source={{ uri: foto.uri }} style={{ width: caixa.w, height: caixa.h }} resizeMode="contain" accessibilityIgnoresInvertColors />
              <Svg width={caixa.w} height={caixa.h} style={StyleSheet.absoluteFill} pointerEvents="none">
                {tracos.map((t, i) => (
                  <Path key={i} d={caminho(t)} stroke={HEX[t.cor]} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </Svg>
            </View>
          )}
        </View>

        <View style={styles.ferramentas}>
          <View style={styles.cores} accessibilityRole="radiogroup">
            {CORES.map(c => (
              <Pressable
                key={c.valor}
                onPress={() => setCor(c.valor)}
                accessibilityRole="radio"
                accessibilityState={{ checked: cor === c.valor }}
                accessibilityLabel={c.rotulo}
                hitSlop={6}
                style={[styles.cor, { backgroundColor: c.hex }, cor === c.valor && { borderColor: cores.azul, transform: [{ scale: 1.12 }] }]}
              />
            ))}
          </View>
          <Pressable onPress={() => setTracos(t => t.slice(0, -1))} disabled={!tracos.length} accessibilityRole="button" style={styles.acao} hitSlop={6}>
            <Text style={[styles.acaoTexto, !tracos.length && { opacity: 0.4 }]}>Desfazer</Text>
          </Pressable>
          <Pressable onPress={() => setTracos([])} disabled={!tracos.length} accessibilityRole="button" style={styles.acao} hitSlop={6}>
            <Text style={[styles.acaoTexto, !tracos.length && { opacity: 0.4 }]}>Limpar</Text>
          </Pressable>
        </View>

        <View style={styles.botoes}>
          <View style={{ flex: 1 }}><Botao tipo="secundario" rotulo="Cancelar" onPress={aoCancelar} /></View>
          <View style={{ flex: 1.4 }}>
            <Botao rotulo={tracos.length ? 'Enviar com marcas' : 'Enviar sem marcar'} onPress={() => aoEnviar(tracos)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#05070D', paddingHorizontal: espaco[4], gap: espaco[3] },
  topo: { gap: espaco[1] },
  titulo: { ...fontes.nome, fontSize: corpo.cabecalho, color: '#FFFFFF' },
  ajuda: { ...fontes.texto, fontSize: corpo.pequeno, color: '#B8C2D6' },
  palco: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ferramentas: { flexDirection: 'row', alignItems: 'center', gap: espaco[4] },
  cores: { flexDirection: 'row', gap: espaco[3], flex: 1 },
  cor: { width: 34, height: 34, borderRadius: raio.pilula, borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  acao: { paddingVertical: espaco[2] },
  acaoTexto: { ...fontes.textoForte, fontSize: corpo.legenda, color: c.ciano },
  botoes: { flexDirection: 'row', gap: espaco[3] },
});
