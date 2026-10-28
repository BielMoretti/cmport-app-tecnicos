/**
 * Depois de concluir a OS: o selo verde com o leão se acende, os confetes saem dele e, se era a
 * última OS do dia, aparece o resumo do dia. Toque em qualquer lugar (ou no botão) para voltar.
 * Só transform e opacidade; com "reduzir movimento", aparece parado e sem confete.
 */
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useMenosMovimento } from '@/components/os/movimento';
import { Botao, LogoPlaca } from '@/components/os/ui';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { duracao, type ResumoDoDia } from '@/lib/os/ordens';
import { componentes, corpo, espaco, fontes, raio, vidro, type Paleta } from '@/lib/tema';

const NATIVO = Platform.OS !== 'web';
const SAIDA = Easing.bezier(0.23, 1, 0.32, 1);

// 14 confetes em volta do selo: ângulo, distância e giro fixos (o mesmo desenho toda vez)
const CONFETES = Array.from({ length: 14 }, (_, i) => ({
  angulo: (i / 14) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12),
  distancia: 110 + (i % 3) * 34,
  giro: (i % 2 ? 1 : -1) * (180 + (i % 4) * 90),
  largura: i % 3 === 0 ? 6 : 9,
}));

function Check({ cor }: { cor: string }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

export default function Comemoracao({ numero, resumo, aoTerminar }: { numero: string; resumo: ResumoDoDia | null; aoTerminar: () => void }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const menos = useMenosMovimento();
  const [selo] = useState(() => new Animated.Value(0));
  const [explosao] = useState(() => new Animated.Value(0));
  const [cartao] = useState(() => new Animated.Value(0));
  const cores_ = [cores.concluida.texto, cores.azul, cores.ciano, cores.andamento.texto];
  const fimDoDia = !!resumo && resumo.faltam === 0 && resumo.feitas > 0;

  useEffect(() => {
    if (menos) { selo.setValue(1); explosao.setValue(1); cartao.setValue(1); return; }
    // o selo quica, os confetes saem dele logo no começo e o texto sobe junto (sem esperar o quique parar)
    const anim = Animated.parallel([
      Animated.spring(selo, { toValue: 1, damping: 12, stiffness: 180, mass: 1, useNativeDriver: NATIVO }),
      Animated.timing(explosao, { toValue: 1, duration: 1100, delay: 120, easing: SAIDA, useNativeDriver: NATIVO }),
      Animated.timing(cartao, { toValue: 1, duration: 480, delay: 220, easing: SAIDA, useNativeDriver: NATIVO }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [menos, selo, explosao, cartao]);

  // sem ser o fim do dia, volta sozinha para a lista depois de um instante
  useEffect(() => {
    if (fimDoDia) return;
    const t = setTimeout(aoTerminar, 2600);
    return () => clearTimeout(t);
  }, [fimDoDia, aoTerminar]);

  return (
    <Pressable style={styles.fundo} onPress={fimDoDia ? undefined : aoTerminar} accessibilityRole="alert" accessibilityLabel={`${numero} concluída`}>
      <View style={styles.palco}>
        {!menos && CONFETES.map((c, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[styles.confete, {
              width: c.largura, backgroundColor: cores_[i % cores_.length],
              opacity: explosao.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: explosao.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(c.angulo) * c.distancia] }) },
                { translateY: explosao.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(c.angulo) * c.distancia + 40] }) },
                { rotate: explosao.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${c.giro}deg`] }) },
              ],
            }]}
          />
        ))}
        <Animated.View style={{ opacity: selo, transform: [{ scale: selo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
          <LogoPlaca tamanho={componentes.logoPlaca.entrada} />
          <View style={[styles.check, { backgroundColor: cores.concluida.texto }]}>
            <Check cor={cores.sobreAzul} />
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.texto, { opacity: cartao, transform: [{ translateY: cartao.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        <Text style={styles.titulo} accessibilityRole="header">{fimDoDia ? 'Dia concluído' : 'OS concluída'}</Text>
        <Text style={styles.sub}>{numero} foi enviada para o escritório.</Text>

        {fimDoDia && resumo && (
          <View style={[styles.resumo, vidro(cores, 'forte')]}>
            <View style={styles.numeros}>
              <Numero valor={String(resumo.feitas)} rotulo={resumo.feitas === 1 ? 'OS feita' : 'OS feitas'} />
              <Numero valor={duracao(resumo.minutos)} rotulo="em atendimento" />
              <Numero valor={String(resumo.locais)} rotulo={resumo.locais === 1 ? 'condomínio' : 'condomínios'} />
            </View>
            <Text style={styles.nota}>Nada mais para hoje. Bom descanso!</Text>
          </View>
        )}

        {fimDoDia && <Botao rotulo="Voltar às OS" onPress={aoTerminar} />}
      </Animated.View>
    </Pressable>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={styles.numero}>
      <Text style={styles.numeroValor}>{valor}</Text>
      <Text style={styles.numeroRotulo}>{rotulo}</Text>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  fundo: { ...StyleSheet.absoluteFill, backgroundColor: c.fundo, alignItems: 'center', justifyContent: 'center', padding: componentes.tela.margem, gap: espaco[8] },
  palco: { alignItems: 'center', justifyContent: 'center' },
  confete: { position: 'absolute', height: 14, borderRadius: 2 },
  check: {
    position: 'absolute', right: -espaco[3], bottom: -espaco[3], width: 48, height: 48, borderRadius: raio.pilula,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.fundo,
  },
  texto: { width: '100%', maxWidth: componentes.tela.larguraMaxFormulario, gap: espaco[3], alignItems: 'stretch' },
  titulo: { ...fontes.nome, fontSize: corpo.destaque, color: c.texto, textAlign: 'center' },
  sub: { ...fontes.texto, fontSize: corpo.base, color: c.textoSuave, textAlign: 'center' },
  resumo: { borderRadius: componentes.cartao.raio, padding: componentes.cartao.respiro, gap: espaco[3], marginTop: espaco[2] },
  numeros: { flexDirection: 'row', justifyContent: 'space-between', gap: espaco[2] },
  numero: { flex: 1, alignItems: 'center', gap: espaco[0.5] },
  numeroValor: { ...fontes.nome, fontSize: corpo.titulo, color: c.texto, fontVariant: ['tabular-nums'] },
  numeroRotulo: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave, textAlign: 'center' },
  nota: { ...fontes.textoForte, fontSize: corpo.legenda, color: c.concluida.texto, textAlign: 'center' },
});
