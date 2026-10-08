import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useEstilos, useTema } from '@/contexts/TemaContext';
import { componentes, corpo, entrelinha, espaco, fontes, raio, vidro, type Paleta } from '@/lib/tema';

/**
 * As peças da aba Monitor: ladrilhos numerados e gráficos feitos de pontos (anel, colunas,
 * linha), no espírito de um painel de instrumentos. Regras que valem para todas:
 * o número importante vai escrito, a cor nunca é a única pista (há sempre rótulo e valor
 * ao lado) e cada gráfico tem uma descrição para leitor de tela.
 */

/** Um ladrilho do painel: número de ordem, título e o conteúdo. `largo` ocupa a linha inteira. */
export function Ladrilho({
  numero, titulo, largo = false, children,
}: { numero: number; titulo: string; largo?: boolean; children: ReactNode }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={largo ? styles.celulaLarga : styles.celula}>
      <View style={styles.ladrilho}>
        <View style={styles.fio} pointerEvents="none" />
        <View style={styles.cabeca}>
          <Text style={styles.numero}>{String(numero).padStart(2, '0')}</Text>
          <Text style={styles.titulo} numberOfLines={1} accessibilityRole="header">{titulo}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}

/** O número grande de um ladrilho, com a unidade pequena ao lado. */
export function Leitura({ valor, unidade, legenda }: { valor: string; unidade?: string; legenda?: string }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View>
      <View style={styles.leituraLinha}>
        <Text style={styles.leitura}>{valor}</Text>
        {unidade && <Text style={styles.unidade}>{unidade}</Text>}
      </View>
      {legenda && <Text style={styles.legenda} numberOfLines={2}>{legenda}</Text>}
    </View>
  );
}

export interface Fatia {
  rotulo: string;
  valor: number;
  cor: string;
}

/**
 * Anel de pontos: cada ponto é uma fração do total, pintado pela fatia a que pertence.
 * No centro, o número que importa. As fatias são listadas ao lado, com nome e valor.
 */
export function AnelDePontos({
  fatias, centro, legendaDoCentro, tamanho = componentes.monitor.anel, descricao,
}: { fatias: Fatia[]; centro: string; legendaDoCentro: string; tamanho?: number; descricao: string }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const PONTOS = componentes.monitor.pontosDoAnel;
  const total = fatias.reduce((s, f) => s + f.valor, 0);

  // quantos pontos cabem a cada fatia (quem tem algum valor ganha pelo menos um)
  const cotas = fatias.map(f => (total > 0 && f.valor > 0 ? Math.max(1, Math.round((f.valor / total) * PONTOS)) : 0));
  const sobra = PONTOS - cotas.reduce((s, n) => s + n, 0);
  if (total > 0 && sobra !== 0) cotas[cotas.indexOf(Math.max(...cotas))] += sobra;
  const corDoPonto: string[] = [];
  cotas.forEach((n, i) => { for (let k = 0; k < n; k++) corDoPonto.push(fatias[i].cor); });

  const meio = tamanho / 2;
  const r = meio - componentes.monitor.ponto;
  return (
    <View style={styles.anelLinha} accessibilityRole="image" accessibilityLabel={descricao}>
      <View style={{ width: tamanho, height: tamanho }}>
        <Svg width={tamanho} height={tamanho}>
          {Array.from({ length: PONTOS }, (_, i) => {
            const angulo = (i / PONTOS) * Math.PI * 2 - Math.PI / 2;
            return (
              <Circle
                key={i}
                cx={meio + Math.cos(angulo) * r}
                cy={meio + Math.sin(angulo) * r}
                r={componentes.monitor.ponto / 2}
                fill={corDoPonto[i] ?? cores.linha}
              />
            );
          })}
        </Svg>
        <View style={styles.anelCentro} pointerEvents="none">
          <Text style={styles.anelNumero}>{centro}</Text>
          <Text style={styles.legenda}>{legendaDoCentro}</Text>
        </View>
      </View>
      <View style={styles.fatias}>
        {fatias.map(f => (
          <View key={f.rotulo} style={styles.fatia}>
            <View style={[styles.marca, { backgroundColor: f.cor }]} />
            <Text style={styles.fatiaRotulo} numberOfLines={1}>{f.rotulo}</Text>
            <Text style={styles.fatiaValor}>{f.valor}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Colunas de pontos: cada coluna empilha pontos conforme o valor. Uma cor só (é uma medida,
 * não categorias); a coluna em `destaque` fica mais forte. Os rótulos do eixo vão embaixo.
 */
export function ColunasDePontos({
  valores, destaque, rotulos, descricao,
}: { valores: number[]; destaque?: number; rotulos: [string, string, string]; descricao: string }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const ALTURA = componentes.monitor.pontosPorColuna;
  const maior = Math.max(1, ...valores);
  return (
    <View accessibilityRole="image" accessibilityLabel={descricao}>
      <View style={styles.colunas}>
        {valores.map((v, i) => {
          const acesos = v > 0 ? Math.max(1, Math.round((v / maior) * ALTURA)) : 0;
          return (
            <View key={i} style={styles.coluna}>
              {Array.from({ length: ALTURA }, (_, k) => {
                const aceso = ALTURA - k <= acesos;
                return <View key={k} style={[styles.pontoDeColuna, { backgroundColor: aceso ? (i === destaque ? cores.ciano : cores.luz) : cores.linha }]} />;
              })}
            </View>
          );
        })}
      </View>
      <View style={styles.eixo}>
        {rotulos.map((t, i) => <Text key={i} style={styles.eixoTexto}>{t}</Text>)}
      </View>
    </View>
  );
}

/** Linha de pontos: a evolução de uma medida (as últimas leituras), com o último ponto em destaque. */
export function LinhaDePontos({ valores, descricao }: { valores: number[]; descricao: string }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const L = componentes.monitor.linhaLargura;
  const A = componentes.monitor.linhaAltura;
  const P = componentes.monitor.ponto;
  if (valores.length === 0) return <View style={{ height: A }} />;
  const maior = Math.max(...valores);
  const menor = Math.min(...valores);
  const faixa = Math.max(1, maior - menor);
  return (
    <View accessibilityRole="image" accessibilityLabel={descricao} style={styles.linhaArea}>
      <Svg width="100%" height={A} viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none">
        {valores.map((v, i) => {
          const x = valores.length === 1 ? L / 2 : P + (i / (valores.length - 1)) * (L - P * 2);
          const y = A - P - ((v - menor) / faixa) * (A - P * 2);
          const ultimo = i === valores.length - 1;
          return <Circle key={i} cx={x} cy={y} r={ultimo ? P * 0.9 : P / 2} fill={ultimo ? cores.ciano : cores.luz} />;
        })}
      </Svg>
    </View>
  );
}

/** Barra de nível com rótulo e valor escritos (ex.: "Disco  62%"). */
export function Nivel({ rotulo, fracao, valor, alerta = false }: { rotulo: string; fracao: number; valor: string; alerta?: boolean }) {
  const styles = useEstilos(criarEstilos);
  const f = Math.max(0, Math.min(1, fracao));
  return (
    <View
      style={styles.nivel}
      accessibilityRole="progressbar"
      accessibilityLabel={`${rotulo}: ${valor}`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(f * 100) }}
    >
      <View style={styles.nivelCabeca}>
        <Text style={styles.fatiaRotulo} numberOfLines={1}>{rotulo}</Text>
        <Text style={[styles.fatiaValor, alerta && styles.valorAlerta]}>{valor}</Text>
      </View>
      <View style={styles.nivelTrilho}>
        <View style={[styles.nivelCheio, alerta && styles.nivelAlerta, { width: `${Math.max(f * 100, f > 0 ? 3 : 0)}%` }]} />
      </View>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  celula: { width: '50%', padding: espaco[1.5] },
  celulaLarga: { width: '100%', padding: espaco[1.5] },
  ladrilho: { ...vidro(c), borderRadius: raio.grande, padding: espaco[4], gap: espaco[3], overflow: 'hidden', flexGrow: 1, boxShadow: c.vidroSombra },
  fio: { position: 'absolute', top: 0, left: raio.grande, right: raio.grande, height: 1, backgroundColor: c.vidroFio },
  cabeca: { flexDirection: 'row', alignItems: 'baseline', gap: espaco[2] },
  numero: { fontFamily: fontes.nome, fontSize: corpo.pequeno, color: c.azul, fontVariant: ['tabular-nums'] },
  titulo: { flex: 1, fontFamily: fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave, letterSpacing: espaco[0.5] / 2 },

  leituraLinha: { flexDirection: 'row', alignItems: 'baseline', gap: espaco[1.5] },
  leitura: { fontFamily: fontes.nome, fontSize: componentes.estatistica.numero, lineHeight: componentes.estatistica.numero + espaco[1], color: c.texto, fontVariant: ['tabular-nums'] },
  unidade: { fontFamily: fontes.textoForte, fontSize: corpo.legenda, color: c.textoSuave },
  legenda: { fontFamily: fontes.texto, fontSize: corpo.pequeno, lineHeight: entrelinha.base - espaco[1], color: c.textoSuave },

  anelLinha: { flexDirection: 'row', alignItems: 'center', gap: espaco[5] },
  anelCentro: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  anelNumero: { fontFamily: fontes.nome, fontSize: corpo.destaque, lineHeight: entrelinha.destaque, color: c.texto, fontVariant: ['tabular-nums'] },
  fatias: { flex: 1, gap: espaco[2.5] },
  fatia: { flexDirection: 'row', alignItems: 'center', gap: espaco[2] },
  marca: { width: componentes.selo.ponto, height: componentes.selo.ponto, borderRadius: componentes.selo.ponto / 2 },
  fatiaRotulo: { flex: 1, fontFamily: fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
  fatiaValor: { fontFamily: fontes.nome, fontSize: corpo.legenda, color: c.texto, fontVariant: ['tabular-nums'] },
  valorAlerta: { color: c.erro },

  colunas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  coluna: { gap: espaco[0.5], alignItems: 'center' },
  pontoDeColuna: { width: componentes.monitor.ponto, height: componentes.monitor.ponto, borderRadius: componentes.monitor.ponto / 2 },
  eixo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: espaco[2] },
  eixoTexto: { fontFamily: fontes.texto, fontSize: corpo.micro, color: c.textoSuave, fontVariant: ['tabular-nums'] },

  linhaArea: { width: '100%' },

  nivel: { gap: espaco[1.5] },
  nivelCabeca: { flexDirection: 'row', alignItems: 'baseline', gap: espaco[2] },
  nivelTrilho: { height: componentes.monitor.trilho, borderRadius: raio.pilula, backgroundColor: c.linha, overflow: 'hidden' },
  nivelCheio: { height: '100%', borderRadius: raio.pilula, backgroundColor: c.luz },
  nivelAlerta: { backgroundColor: c.estadoOffline },
});
