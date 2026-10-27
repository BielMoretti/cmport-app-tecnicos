import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '@/contexts/TemaContext';
import { componentes } from '@/lib/tema';

/**
 * Ícones do app, em vetor e traço único, mais a mira sobre o vídeo. O visual "painel escuro"
 * não tem desenho de fundo: o que enfeita é o estado das câmeras (ver components/portas.tsx).
 */

/** Quatro cantos de mira sobre o vídeo. */
export function Mira() {
  const { cores } = useTema();
  const { canto, traco, margem } = componentes.mira;
  const base: ViewStyle = { position: 'absolute', width: canto, height: canto, borderColor: cores.textoSuave };
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[base, { top: margem, left: margem, borderTopWidth: traco, borderLeftWidth: traco }]} />
      <View style={[base, { top: margem, right: margem, borderTopWidth: traco, borderRightWidth: traco }]} />
      <View style={[base, { bottom: margem, left: margem, borderBottomWidth: traco, borderLeftWidth: traco }]} />
      <View style={[base, { bottom: margem, right: margem, borderBottomWidth: traco, borderRightWidth: traco }]} />
    </View>
  );
}

/** Desenho pequeno de uma câmera de segurança, para as linhas da lista. */
export function GlifoCamera({ cor }: { cor: string }) {
  const t = componentes.glifo;
  return (
    <Svg width={t} height={t} viewBox="0 0 24 24" fill="none">
      <Path d="M3 8.5 15.5 5l2 6.5L5 15z" stroke={cor} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M17 9.5l3.5-1 .9 3-3.4 1" stroke={cor} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M8.5 14v4.5H4" stroke={cor} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Ícones das abas — traço simples, na cor que a barra de abas mandar

export function GlifoPoste({ cor, tamanho }: { cor: string; tamanho: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M8 21V4M5 21h6M8 6h8M8 11h6" stroke={cor} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M16 4.5h3.5v3H16zM14 9.5h3.5v3H14z" stroke={cor} strokeWidth={1.7} strokeLinejoin="round" />
    </Svg>
  );
}

export function GlifoAdmin({ cor, tamanho }: { cor: string; tamanho: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l7.5 3v5.5c0 4.5-3 8-7.5 9.5-4.5-1.5-7.5-5-7.5-9.5V6z" stroke={cor} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M8.8 12.2l2.3 2.3 4.2-4.6" stroke={cor} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const traco = { strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function GlifoVoltar({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M14.5 5.5 8 12l6.5 6.5" stroke={cor} {...traco} /></Svg>;
}

export function GlifoInicio({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M4 11 12 4l8 7v8.5H14.5V14h-5v5.5H4z" stroke={cor} {...traco} /></Svg>;
}

export function GlifoCameraAba({ cor, tamanho }: { cor: string; tamanho: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M3 8.5 15.5 5l2 6.5L5 15z" stroke={cor} {...traco} />
      <Path d="M17 9.5l3.5-1 .9 3-3.4 1M8.5 14v4.5H4" stroke={cor} {...traco} />
    </Svg>
  );
}

export function GlifoAlerta({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M12 4 21 19.5H3zM12 10v4.5M12 17v.4" stroke={cor} {...traco} /></Svg>;
}

export function GlifoPredio({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M5 20V5h9v15M14 10h5v10M3 20h18M8 9h3M8 13h3M8 17h3" stroke={cor} {...traco} /></Svg>;
}

export function GlifoPulso({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M3 12.5h4l2.5-6 4 11.5 2.5-5.500h5" stroke={cor} {...traco} /></Svg>;
}

export function GlifoSinal({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M4.5 9.500a11 11 0 0 1 15 0M7.5 12.800a6.5 6.5 0 0 1 9 0M12 17v.4" stroke={cor} {...traco} /></Svg>;
}

export function GlifoSemSinal({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M4.5 9.500a11 11 0 0 1 15 0M7.5 12.800a6.5 6.5 0 0 1 9 0M12 17v.4M4 4l16 16" stroke={cor} {...traco} /></Svg>;
}

export function GlifoEstrela({ cor, tamanho, cheia = false }: { cor: string; tamanho: number; cheia?: boolean }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.800l-5.100 2.700 1-5.700-4.100-4 5.700-.800z" stroke={cor} fill={cheia ? cor : 'none'} {...traco} />
    </Svg>
  );
}

export function GlifoExpandir({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke={cor} {...traco} /></Svg>;
}

export function GlifoRecolher({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke={cor} {...traco} /></Svg>;
}

export function GlifoMais({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M12 5v14M5 12h14" stroke={cor} {...traco} strokeWidth={2.2} /></Svg>;
}

export function GlifoBaixar({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M12 4v11M7.5 11 12 15.5 16.500 11M5 19.500h14" stroke={cor} {...traco} /></Svg>;
}

// Controles do player — preenchidos, pra lerem bem em botão pequeno

export function GlifoTocar({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24"><Path d="M8 5.5v13l11-6.5z" fill={cor} /></Svg>;
}

export function GlifoPausar({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24"><Path d="M7 5.5h3.5v13H7zM13.5 5.5H17v13h-3.5z" fill={cor} /></Svg>;
}

export function GlifoAnterior({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24"><Path d="M6 6h2.5v12H6zM19 6.5v11L10 12z" fill={cor} /></Svg>;
}

export function GlifoProximo({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24"><Path d="M15.5 6H18v12h-2.5zM5 6.5v11l9-5.5z" fill={cor} /></Svg>;
}

export function GlifoInstalar({ cor, tamanho }: { cor: string; tamanho: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M8 21V4M5 21h6M8 6h6M8 11h4" stroke={cor} {...traco} />
      <Path d="M18 13v6M15 16h6" stroke={cor} {...traco} />
    </Svg>
  );
}

export function GlifoConta({ cor, tamanho }: { cor: string; tamanho: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" stroke={cor} {...traco} />
    </Svg>
  );
}

export function GlifoCopiar({ cor, tamanho }: { cor: string; tamanho: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M9 9h10.5v11.5H9zM15 9V4H4.5v11.5H9" stroke={cor} {...traco} />
    </Svg>
  );
}

export function GlifoAbrir({ cor, tamanho }: { cor: string; tamanho: number }) {
  return <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"><Path d="M9.5 5.5 16 12l-6.5 6.5" stroke={cor} {...traco} /></Svg>;
}
