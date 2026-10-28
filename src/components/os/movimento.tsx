/**
 * Movimento do app: entradas curtas e o pulso de "em atendimento". Só transform e opacidade,
 * no driver nativo (no navegador o Animated roda em JS). Com "reduzir movimento" ligado no
 * aparelho, tudo aparece parado no lugar.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

const NATIVO = Platform.OS !== 'web';
/** ease-out forte: começa rápido, assenta devagar */
const SAIDA = Easing.bezier(0.23, 1, 0.32, 1);

export function useMenosMovimento(): boolean {
  const [menos, setMenos] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (vivo) setMenos(v); }).catch(() => {});
    const inscricao = AccessibilityInfo.addEventListener('reduceMotionChanged', setMenos);
    return () => { vivo = false; inscricao.remove(); };
  }, []);
  return menos;
}

/** Entra subindo um pouco e acendendo. `atraso` escalona uma lista; `distancia` 0 só acende. */
export function Surgir({ children, atraso = 0, distancia = 12, escala = 1, style }: {
  children: ReactNode; atraso?: number; distancia?: number; escala?: number; style?: StyleProp<ViewStyle>;
}) {
  const menos = useMenosMovimento();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const anim = Animated.timing(v, { toValue: 1, duration: 420, delay: atraso, easing: SAIDA, useNativeDriver: NATIVO });
    anim.start();
    return () => anim.stop();
  }, [v, atraso]);
  if (menos) return <Animated.View style={style}>{children}</Animated.View>;
  return (
    <Animated.View
      style={[style, {
        opacity: v,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distancia, 0] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [escala, 1] }) },
        ],
      }]}
    >
      {children}
    </Animated.View>
  );
}

/** Ponto que respira devagar: diz "está acontecendo agora" (com o texto ao lado, nunca sozinho). */
export function Pulso({ cor, tamanho }: { cor: string; tamanho: number }) {
  const menos = useMenosMovimento();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (menos) return;
    const laco = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO }),
      Animated.timing(v, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO }),
    ]));
    laco.start();
    return () => laco.stop();
  }, [v, menos]);
  const base = { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: cor };
  return (
    <Animated.View style={base}>
      {!menos && (
        <Animated.View
          style={[base, {
            position: 'absolute', opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
          }]}
        />
      )}
    </Animated.View>
  );
}

/** Esqueleto de cartão enquanto a lista carrega: brilho que passa de leve. */
export function Esqueleto({ cor, altura, style }: { cor: string; altura: number; style?: StyleProp<ViewStyle> }) {
  const menos = useMenosMovimento();
  const v = useState(() => new Animated.Value(0.5))[0];
  useEffect(() => {
    if (menos) return;
    const laco = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO }),
      Animated.timing(v, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO }),
    ]));
    laco.start();
    return () => laco.stop();
  }, [v, menos]);
  return <Animated.View style={[{ height: altura, backgroundColor: cor, opacity: v }, style]} />;
}

/** Barra de progresso que cresce até o valor (0 a 1) em vez de aparecer pronta. */
export function useProgresso(valor: number) {
  const menos = useMenosMovimento();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    // largura não roda no driver nativo; a barra é absoluta e sem filhos, então não refaz o layout de ninguém
    Animated.timing(v, { toValue: valor, duration: menos ? 0 : 700, delay: menos ? 0 : 200, easing: SAIDA, useNativeDriver: false }).start();
  }, [v, valor, menos]);
  return v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
}
