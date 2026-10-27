import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { NATIVO, useReduzirMovimento } from '@/components/efeitos';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { recemCriada } from '@/lib/agrupar';
import { estadoDe } from '@/lib/saude';
import { componentes, corpo, entrelinha, espaco, fontes, raio, type Paleta } from '@/lib/tema';
import type { Camera } from '@/lib/types';

/**
 * Painel de portas: o poste visto como um switch de rede. Cada câmera é uma porta numerada,
 * e a porta muda de FORMA, não só de cor, conforme o estado:
 *
 *   transmitindo  porta cheia (verde), número escuro
 *   aguardando    contorno tracejado (âmbar) que pulsa — só durante a instalação
 *   fora do ar    contorno grosso (vermelho) com fundo tingido
 *   sem informação contorno fino (cinza)
 *   desativada    contorno fino apagado
 */
export type EstadoDaPorta = 'transmitindo' | 'aguardando' | 'fora' | 'semInfo' | 'desativada';

export const ROTULO_DA_PORTA: Record<EstadoDaPorta, string> = {
  transmitindo: 'transmitindo',
  aguardando: 'aguardando vídeo',
  fora: 'fora do ar',
  semInfo: 'sem informação',
  desativada: 'desativada',
};

type CameraDaPorta = Pick<Camera, 'id' | 'nome' | 'online' | 'ativo'> & { criado_em?: string };

/**
 * O estado da porta de uma câmera. Sem vídeo, ela está "aguardando" (e não "fora do ar") durante
 * a instalação: quando `instalando` é dito, ou, sem ele, quando a câmera foi criada há menos de 48 h.
 */
export function estadoDaPorta(c: Omit<CameraDaPorta, 'id' | 'nome'>, instalando?: boolean): EstadoDaPorta {
  if (!c.ativo) return 'desativada';
  const e = estadoDe(c);
  if (e === 'online') return 'transmitindo';
  if (e === 'offline') return (instalando ?? (c.criado_em ? recemCriada({ criado_em: c.criado_em }) : false)) ? 'aguardando' : 'fora';
  return 'semInfo';
}

/** "2 transmitindo, 1 fora do ar" — para leitores de tela e para o resumo escrito. */
export function resumoDasPortas(estados: EstadoDaPorta[]): string {
  const conta = new Map<EstadoDaPorta, number>();
  for (const e of estados) conta.set(e, (conta.get(e) ?? 0) + 1);
  return (Object.keys(ROTULO_DA_PORTA) as EstadoDaPorta[])
    .filter(e => conta.get(e))
    .map(e => `${conta.get(e)} ${ROTULO_DA_PORTA[e]}`)
    .join(', ');
}

/** Uma porta. Com `onPress`, abre a câmera (alvo de toque de 48 pelo hitSlop). */
export function Porta({
  numero, estado, grande = false, parada = false, onPress, rotulo,
}: { numero: number; estado: EstadoDaPorta; grande?: boolean; parada?: boolean; onPress?: () => void; rotulo?: string }) {
  const styles = useEstilos(criarEstilos);
  const reduzir = useReduzirMovimento();
  const pulso = useRef(new Animated.Value(1)).current;
  const pulsa = estado === 'aguardando' && !reduzir && !parada;

  useEffect(() => {
    if (!pulsa) { pulso.setValue(1); return; }
    const laco = Animated.loop(Animated.sequence([
      Animated.timing(pulso, { toValue: 0.4, duration: 650, useNativeDriver: NATIVO }),
      Animated.timing(pulso, { toValue: 1, duration: 650, useNativeDriver: NATIVO }),
    ]));
    laco.start();
    return () => laco.stop();
  }, [pulsa, pulso]);

  const lado = grande ? componentes.porta.grande : componentes.porta.tamanho;
  const caixa = (
    <Animated.View style={[styles.porta, styles[estado], { width: lado, height: lado, opacity: pulso }]}>
      <Text style={[styles.numero, grande && styles.numeroGrande, styles[`${estado}Texto`]]} allowFontScaling={false}>
        {numero}
      </Text>
    </Animated.View>
  );
  const descricao = rotulo ?? `Porta ${numero}: ${ROTULO_DA_PORTA[estado]}`;
  if (!onPress) return <View accessible accessibilityLabel={descricao}>{caixa}</View>;
  const folga = Math.max(0, (componentes.alvoDeToque - lado) / 2);
  return (
    <Pressable onPress={onPress} hitSlop={folga} accessibilityRole="button" accessibilityLabel={descricao}>
      {caixa}
    </Pressable>
  );
}

/** A fileira de portas de um poste, na ordem das câmeras. */
export function PainelDePortas({
  cameras, instalando, grande = false, parado = false, onPressPorta, rotulo,
}: {
  cameras: CameraDaPorta[];
  instalando?: boolean;
  grande?: boolean;
  /** sem pulso: prévia do que vai ser criado, não espera de verdade */
  parado?: boolean;
  onPressPorta?: (id: number) => void;
  rotulo?: string;
}) {
  const styles = useEstilos(criarEstilos);
  // porta que se toca é sempre a grande, com vão maior: alvo de 48 sem encostar na vizinha
  const tocavel = !!onPressPorta;
  const estados = cameras.map(c => estadoDaPorta(c, instalando));
  const resumo = cameras.length === 0 ? 'nenhuma câmera' : resumoDasPortas(estados);
  return (
    <View
      style={[styles.painel, tocavel && styles.painelTocavel]}
      accessible={!onPressPorta}
      accessibilityLabel={`${rotulo ? `${rotulo}: ` : ''}${resumo}`}
    >
      {cameras.length === 0 ? (
        <View style={[styles.porta, styles.vazia, { width: componentes.porta.tamanho, height: componentes.porta.tamanho }]} />
      ) : (
        cameras.map((c, i) => (
          <Porta
            key={c.id}
            numero={i + 1}
            estado={estados[i]}
            grande={grande || tocavel}
            parada={parado}
            onPress={onPressPorta ? () => onPressPorta(c.id) : undefined}
            rotulo={`${c.nome}: ${ROTULO_DA_PORTA[estados[i]]}`}
          />
        ))
      )}
    </View>
  );
}

/** Legenda curta das portas, para o topo das listas. */
export function LegendaDasPortas() {
  const styles = useEstilos(criarEstilos);
  const itens: EstadoDaPorta[] = ['transmitindo', 'aguardando', 'fora', 'semInfo'];
  return (
    <View style={styles.legenda} accessible={false} importantForAccessibility="no-hide-descendants">
      {itens.map(e => (
        <View key={e} style={styles.legendaItem}>
          <View style={[styles.porta, styles[e], styles.portaMini]} />
          <Text style={styles.legendaTexto}>{ROTULO_DA_PORTA[e]}</Text>
        </View>
      ))}
    </View>
  );
}

/** Contagem em mono, "47/52", com a palavra ao lado. */
export function Contagem({ ligadas, total, palavra = 'no ar' }: { ligadas: number; total: number; palavra?: string }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const tudo = total > 0 && ligadas === total;
  return (
    <View style={styles.contagem} accessible accessibilityLabel={`${ligadas} de ${total} ${palavra}`}>
      <Text style={[styles.contagemNumero, { color: tudo ? cores.estadoOnline : cores.texto }]}>
        {ligadas}<Text style={styles.contagemTotal}>/{total}</Text>
      </Text>
      <Text style={styles.contagemPalavra}>{palavra}</Text>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  painel: { flexDirection: 'row', flexWrap: 'wrap', gap: componentes.porta.vao },
  painelTocavel: { gap: componentes.porta.vaoTocavel },
  porta: {
    borderRadius: raio.pilula, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: c.vidroBorda,
  },
  portaMini: { width: espaco[4], height: espaco[4] },
  transmitindo: { backgroundColor: c.estadoOnline, borderColor: c.estadoOnline },
  aguardando: { borderWidth: componentes.porta.borda, borderStyle: 'dashed', borderColor: c.estadoEspera, backgroundColor: c.estadoEsperaSuave },
  fora: { borderWidth: componentes.porta.borda, borderColor: c.estadoOffline, backgroundColor: c.erroSuave },
  semInfo: { borderColor: c.estadoNeutro },
  desativada: { borderColor: c.linha, opacity: 0.5 },
  vazia: { borderStyle: 'dashed', borderColor: c.linha },

  numero: { ...fontes.monoForte, fontSize: corpo.pequeno },
  numeroGrande: { fontSize: corpo.nome },
  transmitindoTexto: { color: c.sobreEstado },
  aguardandoTexto: { color: c.estadoEspera },
  foraTexto: { color: c.estadoOffline },
  semInfoTexto: { color: c.textoSuave },
  desativadaTexto: { color: c.textoSuave },

  legenda: { flexDirection: 'row', flexWrap: 'wrap', columnGap: espaco[4], rowGap: espaco[2] },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: espaco[1.5] },
  legendaTexto: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },

  contagem: { flexDirection: 'row', alignItems: 'baseline', gap: espaco[2] },
  contagemNumero: { ...fontes.mono, fontSize: corpo.titulo, lineHeight: entrelinha.titulo },
  contagemTotal: { color: c.textoSuave },
  contagemPalavra: { ...fontes.texto, fontSize: corpo.base, color: c.textoSuave },
});
