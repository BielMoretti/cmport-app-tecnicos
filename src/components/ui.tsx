import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlifoVoltar } from '@/components/arte';
import { NATIVO, Toque, useReduzirMovimento } from '@/components/efeitos';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { aceso, componentes, corpo, entrelinha, espaco, fontes, raio, vidro, type Paleta } from '@/lib/tema';

/**
 * Kit visual do app: superfícies opacas sobre o fundo escuro, contorno de 1px, cantos
 * pequenos. Toda tela é montada com estas peças — é o que mantém o app com cara de uma coisa só.
 */

/** Moldura de toda tela: o fundo chapado. */
export function Tela({ children }: { children: ReactNode }) {
  const styles = useEstilos(criarEstilos);
  return <View style={styles.tela}>{children}</View>;
}

/** O logo sobre uma placa clara — o leão é grafite e some direto no fundo escuro. */
export function LogoPlaca({ tamanho, completo = false }: { tamanho: number; completo?: boolean }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={[styles.logoPlaca, { width: tamanho, height: tamanho, borderRadius: tamanho * 0.22, padding: tamanho * 0.1 }]}>
      <Image
        source={completo ? require('../../assets/logo.png') : require('../../assets/leao.png')}
        style={estilosFixos.logo}
        resizeMode="contain"
        accessibilityLabel="CM Port"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

/** Bloco de superfície. Com `onPress`, vira um botão grande (afunda de leve ao tocar). */
export function Cartao({
  children, onPress, destaque = false, rotulo, style,
}: { children: ReactNode; onPress?: () => void; destaque?: boolean; rotulo?: string; style?: StyleProp<ViewStyle> }) {
  const styles = useEstilos(criarEstilos);
  const estilo = [styles.cartao, destaque && styles.cartaoDestaque, style];
  if (!onPress) return <View style={estilo}>{children}</View>;
  return (
    <Toque onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo} style={estilo}>
      {children}
    </Toque>
  );
}

/** Quadradinho com um ícone dentro. */
export function IconeCaixa({ children, tom = 'azul' }: { children: ReactNode; tom?: 'azul' | 'erro' | 'suave' }) {
  const styles = useEstilos(criarEstilos);
  return <View style={[styles.iconeCaixa, tom === 'erro' && styles.iconeCaixaErro, tom === 'suave' && styles.iconeCaixaSuave]}>{children}</View>;
}

/** Título de bloco, com uma ação opcional à direita ("Ver todas"). */
export function Bloco({ titulo, acao, aoTocar, children }: { titulo: string; acao?: string; aoTocar?: () => void; children: ReactNode }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={styles.bloco}>
      <View style={styles.blocoCabeca}>
        <Text style={styles.blocoTitulo} accessibilityRole="header">{titulo}</Text>
        {acao && aoTocar && (
          <Pressable onPress={aoTocar} hitSlop={espaco[3]} accessibilityRole="button" style={styles.blocoAcaoArea}>
            <Text style={styles.blocoAcao}>{acao}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

export type TomDeEstado = 'ok' | 'espera' | 'erro' | 'suave';

/** Pílula de estado: ponto colorido + texto (a cor nunca vai sozinha). */
export function Pilula({ texto, tom = 'suave' }: { texto: string; tom?: TomDeEstado }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const cor = { ok: cores.estadoOnline, espera: cores.estadoEspera, erro: cores.estadoOffline, suave: cores.estadoNeutro }[tom];
  return (
    <View style={[styles.pilula, tom === 'ok' && styles.pilulaOk, tom === 'espera' && styles.pilulaEspera, tom === 'erro' && styles.pilulaErro]}>
      <View style={[styles.pilulaPonto, { backgroundColor: cor }]} />
      <Text style={styles.pilulaTexto}>{texto}</Text>
    </View>
  );
}

/** Barra de progresso fina, que anda até o valor. */
export function Progresso({ fracao, rotulo, tom = 'azul' }: { fracao: number; rotulo: string; tom?: 'azul' | 'ok' }) {
  const styles = useEstilos(criarEstilos);
  const reduzir = useReduzirMovimento();
  const f = Math.max(0, Math.min(1, fracao));
  const valor = useRef(new Animated.Value(reduzir ? f : 0)).current;
  useEffect(() => {
    // a largura não anima no driver nativo
    Animated.timing(valor, { toValue: f, duration: reduzir ? 0 : 500, easing: Easing.out(Easing.exp), useNativeDriver: false }).start();
  }, [f, reduzir, valor]);
  return (
    <View style={styles.progresso} accessibilityRole="progressbar" accessibilityLabel={rotulo} accessibilityValue={{ min: 0, max: 100, now: Math.round(f * 100) }}>
      <Animated.View style={[styles.progressoCheio, tom === 'ok' && styles.progressoOk, { width: valor.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

/** Bloco que pulsa de leve enquanto os dados não chegam (no lugar de um spinner). */
export function Esqueleto({ altura, largura = '100%' }: { altura: number; largura?: number | `${number}%` }) {
  const styles = useEstilos(criarEstilos);
  const reduzir = useReduzirMovimento();
  const valor = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (reduzir) return;
    const laco = Animated.loop(Animated.sequence([
      Animated.timing(valor, { toValue: 1, duration: 700, useNativeDriver: NATIVO }),
      Animated.timing(valor, { toValue: 0.5, duration: 700, useNativeDriver: NATIVO }),
    ]));
    laco.start();
    return () => laco.stop();
  }, [reduzir, valor]);
  return <Animated.View style={[styles.esqueleto, { height: altura, width: largura, opacity: valor }]} accessibilityLabel="Carregando" />;
}

/** O quadrado de quem está logado: a foto do perfil ou, sem ela, as iniciais. */
export function Avatar({ tamanho = componentes.avatar }: { tamanho?: number }) {
  const styles = useEstilos(criarEstilos);
  const { usuario, foto } = useAuth();
  const forma = { width: tamanho, height: tamanho, borderRadius: raio.medio };
  return (
    <View style={[styles.avatar, forma]}>
      {foto ? (
        <Image source={{ uri: foto }} style={forma} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <Text style={[styles.avatarTexto, { fontSize: tamanho * 0.36 }]}>{usuario ? iniciais(usuario.nome) : ''}</Text>
      )}
    </View>
  );
}

const iniciais = (nome: string) => nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

/**
 * Topo das abas: a marca (leão em placa clara e CM PORT) numa linha fina, e o título grande da
 * aba embaixo. `direita` recebe uma ação da aba, quando houver.
 */
export function TopoDaAba({ titulo, apoio, direita, abaixo }: { titulo: string; apoio?: string; direita?: ReactNode; abaixo?: ReactNode }) {
  const styles = useEstilos(criarEstilos);
  const topo = useSafeAreaInsets().top;
  return (
    <View style={[styles.topo, { paddingTop: topo + espaco[3] }]}>
      <View style={styles.marca}>
        <LogoPlaca tamanho={componentes.logoPlaca.topo} />
        <Text style={styles.marcaNome}>CM PORT</Text>
        <View style={styles.topoDireita}>{direita}</View>
      </View>
      <View>
        <Text style={styles.topoTitulo} numberOfLines={1} accessibilityRole="header">{titulo}</Text>
        {apoio && <Text style={styles.topoApoio}>{apoio}</Text>}
        {abaixo ? <View style={styles.topoAbaixo}>{abaixo}</View> : null}
      </View>
    </View>
  );
}

/** Topo das telas internas: botão de voltar, título e um espaço para ação à direita. */
export function Cabecalho({ titulo, direita }: { titulo: string; direita?: ReactNode }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const router = useRouter();
  const topo = useSafeAreaInsets().top;
  return (
    <View style={[styles.cabecalho, { paddingTop: topo + espaco[2] }]}>
      <Toque
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={styles.voltar}
      >
        <GlifoVoltar cor={cores.texto} tamanho={componentes.iconeCaixa.glifo} />
      </Toque>
      <Text style={styles.cabecalhoTitulo} numberOfLines={1} accessibilityRole="header">{titulo}</Text>
      <View style={styles.cabecalhoDireita}>{direita}</View>
    </View>
  );
}

const estilosFixos = StyleSheet.create({
  logo: { width: '100%', height: '100%' },
});

const criarEstilos = (c: Paleta) => StyleSheet.create({
  tela: { flex: 1, backgroundColor: c.fundo },
  cartao: { ...vidro(c), borderRadius: componentes.cartao.raio, padding: componentes.cartao.respiro, overflow: 'hidden' },
  cartaoDestaque: { ...vidro(c, 'forte'), borderColor: c.azul },
  logoPlaca: { backgroundColor: c.placa },

  iconeCaixa: {
    width: componentes.iconeCaixa.tamanho, height: componentes.iconeCaixa.tamanho, borderRadius: componentes.iconeCaixa.raio,
    backgroundColor: c.azulSuave, alignItems: 'center', justifyContent: 'center',
  },
  iconeCaixaErro: { backgroundColor: c.erroSuave },
  iconeCaixaSuave: { backgroundColor: c.superficieForte },

  bloco: { gap: espaco[3] },
  blocoCabeca: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: componentes.alvoDeToque - espaco[3] },
  blocoTitulo: { ...fontes.nome, fontSize: corpo.nomeGrande, color: c.texto },
  blocoAcaoArea: { minHeight: componentes.alvoDeToque - espaco[3], justifyContent: 'center' },
  blocoAcao: { ...fontes.textoForte, fontSize: corpo.legenda, color: c.azul },

  pilula: {
    flexDirection: 'row', alignItems: 'center', gap: espaco[1.5], borderRadius: raio.pilula, borderWidth: 1, borderColor: c.vidroBorda,
    paddingHorizontal: espaco[2.5], paddingVertical: espaco[1],
  },
  pilulaOk: { borderColor: c.estadoOnline, backgroundColor: c.estadoOnlineSuave },
  pilulaEspera: { borderColor: c.estadoEspera, backgroundColor: c.estadoEsperaSuave },
  pilulaErro: { borderColor: c.estadoOffline, backgroundColor: c.erroSuave },
  pilulaPonto: { width: componentes.selo.ponto, height: componentes.selo.ponto, borderRadius: componentes.selo.ponto / 2 },
  pilulaTexto: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.texto },

  progresso: { height: componentes.medidor.altura, borderRadius: raio.pilula, backgroundColor: c.superficieForte, overflow: 'hidden' },
  progressoCheio: { height: '100%', borderRadius: raio.pilula, ...aceso(c) },
  progressoOk: { backgroundColor: c.estadoOnline },

  esqueleto: { borderRadius: componentes.cartao.raio, backgroundColor: c.superficie },

  topo: { paddingHorizontal: espaco[4], paddingBottom: espaco[4], gap: espaco[4] },
  marca: { flexDirection: 'row', alignItems: 'center', gap: espaco[2.5], minHeight: componentes.alvoDeToque },
  marcaNome: { flex: 1, ...fontes.nome, fontSize: corpo.legenda, color: c.texto, letterSpacing: espaco[1] },
  topoDireita: { alignItems: 'flex-end' },
  topoTitulo: { ...fontes.destaque, fontSize: corpo.destaque, lineHeight: entrelinha.destaque, color: c.texto, letterSpacing: -0.5 },
  topoApoio: { ...fontes.texto, fontSize: corpo.base, color: c.textoSuave, marginTop: espaco[1] },
  topoAbaixo: { marginTop: espaco[1] },

  avatar: { backgroundColor: c.superficieForte, borderWidth: 1, borderColor: c.vidroBorda, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarTexto: { ...fontes.nome, color: c.texto },

  cabecalho: {
    flexDirection: 'row', alignItems: 'center', gap: espaco[2], paddingHorizontal: espaco[2], paddingBottom: espaco[2],
    borderBottomWidth: 1, borderBottomColor: c.linha,
  },
  voltar: { width: componentes.alvoDeToque - espaco[1], height: componentes.alvoDeToque - espaco[1], borderRadius: raio.pilula, backgroundColor: c.superficie, alignItems: 'center', justifyContent: 'center', marginLeft: espaco[1] },
  cabecalhoTitulo: { flex: 1, ...fontes.nome, fontSize: corpo.cabecalho, color: c.texto },
  cabecalhoDireita: { minWidth: componentes.alvoDeToque, alignItems: 'flex-end', paddingRight: espaco[2] },
});
