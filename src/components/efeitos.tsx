import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View,
  type PressableProps, type StyleProp, type ViewStyle,
} from 'react-native';

import { useTema } from '@/contexts/TemaContext';
import { componentes } from '@/lib/tema';

// No navegador não existe driver nativo de animação
export const NATIVO = Platform.OS !== 'web';

/** Respeita a opção "reduzir movimento" do aparelho — sem ela, nenhum efeito abaixo anima. */
export function useReduzirMovimento(): boolean {
  const [reduzir, setReduzir] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduzir).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduzir);
    return () => sub.remove();
  }, []);
  return reduzir;
}

/** Barra fina que corre de um lado ao outro enquanto os dados carregam. */
export function BarraCarregando({ ativa }: { ativa: boolean }) {
  const { cores } = useTema();
  const reduzir = useReduzirMovimento();
  const progresso = useRef(new Animated.Value(0)).current;
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    if (!ativa || reduzir || largura === 0) return;
    progresso.setValue(0);
    const laco = Animated.loop(
      Animated.timing(progresso, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: NATIVO }),
    );
    laco.start();
    return () => laco.stop();
  }, [ativa, reduzir, largura, progresso]);

  const trecho = largura * 0.35;

  return (
    <View
      style={styles.barra}
      onLayout={e => setLargura(e.nativeEvent.layout.width)}
      accessibilityRole={ativa ? 'progressbar' : undefined}
      accessibilityLabel={ativa ? 'Carregando' : undefined}
    >
      {ativa && (
        <Animated.View
          style={{
            width: reduzir ? '100%' : trecho,
            height: componentes.barraCarregando.altura,
            backgroundColor: cores.azul,
            opacity: reduzir ? 0.6 : 1,
            transform: reduzir
              ? []
              : [{ translateX: progresso.interpolate({ inputRange: [0, 1], outputRange: [-trecho, largura] }) }],
          }}
        />
      )}
    </View>
  );
}

/** Área tocável que afunda de leve e clareia enquanto pressionada. */
export function Toque({
  children, style, ...props
}: Omit<PressableProps, 'style' | 'children'> & { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduzir = useReduzirMovimento();
  const escala = useRef(new Animated.Value(1)).current;
  const [pressionado, setPressionado] = useState(false);

  const animar = (para: number) => {
    if (reduzir) return;
    Animated.spring(escala, { toValue: para, speed: 40, bounciness: 0, useNativeDriver: NATIVO }).start();
  };

  return (
    <Pressable
      {...props}
      onPressIn={e => { setPressionado(true); animar(0.98); props.onPressIn?.(e); }}
      onPressOut={e => { setPressionado(false); animar(1); props.onPressOut?.(e); }}
    >
      <Animated.View style={[style, pressionado && styles.pressionado, { transform: [{ scale: escala }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** Ponto que pulsa — usado só no selo "Ao vivo". */
export function Pulso({ cor, tamanho = 8 }: { cor: string; tamanho?: number }) {
  const reduzir = useReduzirMovimento();
  const valor = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduzir) return;
    const laco = Animated.loop(
      Animated.sequence([
        Animated.timing(valor, { toValue: 0.35, duration: 700, useNativeDriver: NATIVO }),
        Animated.timing(valor, { toValue: 1, duration: 700, useNativeDriver: NATIVO }),
      ]),
    );
    laco.start();
    return () => laco.stop();
  }, [reduzir, valor]);

  return <Animated.View style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: cor, opacity: valor }} />;
}

const styles = StyleSheet.create({
  barra: { height: componentes.barraCarregando.altura, width: '100%', overflow: 'hidden' },
  pressionado: { opacity: 0.85 },
});
