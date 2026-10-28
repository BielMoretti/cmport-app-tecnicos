/** Ícones do app, em traço fino. Cor e tamanho vêm de quem usa. */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface Props { cor: string; tamanho?: number }

export function GlifoLista({ cor, tamanho = 22 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={3} width={16} height={18} rx={3} />
      <Path d="M8 8h8M8 12h8M8 16h5" />
    </Svg>
  );
}

export function GlifoConta({ cor, tamanho = 22 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </Svg>
  );
}

export function GlifoLocal({ cor, tamanho = 16 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <Circle cx={12} cy={9.5} r={2.5} />
    </Svg>
  );
}

export function GlifoRelogio({ cor, tamanho = 16 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function GlifoVoltar({ cor, tamanho = 22 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

export function GlifoSino({ cor, tamanho = 22 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <Path d="M10 20.5a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function GlifoCamera({ cor, tamanho = 22 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx={12} cy={13} r={3.5} />
    </Svg>
  );
}

export function GlifoMicrofone({ cor, tamanho = 22 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={9} y={3} width={6} height={11} rx={3} />
      <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </Svg>
  );
}

export function GlifoCheck({ cor, tamanho = 18 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}
