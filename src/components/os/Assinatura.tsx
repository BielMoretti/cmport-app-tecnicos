/**
 * Campo de assinatura: a pessoa desenha com o dedo. O traço sai como caminho SVG numa área
 * fixa de 320×160 (types.ts, Assinatura.traco), qualquer que seja o tamanho da tela.
 */
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useEstilos, useTema } from '@/contexts/TemaContext';
import { corpo, espaco, fontes, raio, vidro, type Paleta } from '@/lib/tema';

export const AREA = { largura: 320, altura: 160 } as const;

/** Desenho só para mostrar (assinatura já feita). */
export function VerAssinatura({ traco }: { traco: string }) {
  const { cores } = useTema();
  return (
    <Svg width="100%" height={120} viewBox={`0 0 ${AREA.largura} ${AREA.altura}`}>
      <Path d={traco} stroke={cores.texto} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CampoDeAssinatura({ aoMudar, aoDesenhar, inicial = '' }: {
  /** o traço atual ('' = vazio) */
  aoMudar: (traco: string) => void;
  /** true enquanto o dedo está na área: quem tem rolagem trava a rolagem */
  aoDesenhar?: (desenhando: boolean) => void;
  /** traço recuperado do rascunho (o app tinha fechado no meio) */
  inicial?: string;
}) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const [traco, setTraco] = useState(inicial);
  const tamanho = useRef({ w: 1, h: 1 });

  const ponto = (e: GestureResponderEvent) => {
    const x = (e.nativeEvent.locationX / tamanho.current.w) * AREA.largura;
    const y = (e.nativeEvent.locationY / tamanho.current.h) * AREA.altura;
    return `${Math.round(x)} ${Math.round(y)}`;
  };
  const mudar = (novo: string) => { setTraco(novo); aoMudar(novo); };

  return (
    <View style={{ gap: espaco[2] }}>
      <View
        style={styles.area}
        onLayout={(e: LayoutChangeEvent) => { tamanho.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={e => { aoDesenhar?.(true); mudar(`${traco} M${ponto(e)}`.trim()); }}
        onResponderMove={e => mudar(`${traco} L${ponto(e)}`)}
        onResponderRelease={() => aoDesenhar?.(false)}
        onResponderTerminate={() => aoDesenhar?.(false)}
        accessibilityLabel="Área de assinatura. Desenhe a assinatura com o dedo."
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${AREA.largura} ${AREA.altura}`} pointerEvents="none">
          <Path d={traco || 'M0 0'} stroke={cores.texto} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        {!traco && <Text style={styles.dica} pointerEvents="none">Assine aqui</Text>}
        <View style={styles.linhaBase} pointerEvents="none" />
      </View>
      {!!traco && (
        <Pressable onPress={() => mudar('')} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-end' }}>
          <Text style={styles.limpar}>Apagar e assinar de novo</Text>
        </Pressable>
      )}
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  area: { ...vidro(c, 'forte'), borderRadius: raio.medio, aspectRatio: AREA.largura / AREA.altura, width: '100%', overflow: 'hidden' },
  dica: { position: 'absolute', alignSelf: 'center', top: '40%', ...fontes.texto, fontSize: corpo.base, color: c.textoSuave },
  linhaBase: { position: 'absolute', left: '8%', right: '8%', bottom: '22%', height: 1, backgroundColor: c.linha },
  limpar: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.azul },
});
