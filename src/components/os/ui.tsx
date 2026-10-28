/**
 * Peças das telas de OS. São as do app (components/ui.tsx e formulario.tsx) com os nomes que
 * as telas de OS já usavam, mais o selo da situação da OS. Visual "A preta" como o resto.
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pulso } from '@/components/os/movimento';
import { Botao as BotaoDoApp, Campo } from '@/components/formulario';
import { Cabecalho, Cartao, LogoPlaca, Tela } from '@/components/ui';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { componentes, corpo, espaco, fontes, raio, type Paleta } from '@/lib/tema';
import { ROTULO_SITUACAO, type Situacao } from '@/lib/os/types';

export { Campo, Cartao, LogoPlaca, Tela };

/** Topo de uma tela de OS: voltar + título (sem voltar nas telas do primeiro acesso). */
export function Topo({ titulo, voltar = true }: { titulo: string; voltar?: boolean }) {
  const styles = useEstilos(criarEstilos);
  const topo = useSafeAreaInsets().top;
  if (voltar) return <Cabecalho titulo={titulo} />;
  return (
    <View style={[styles.topo, { paddingTop: topo + espaco[2] }]}>
      <Text style={styles.topoTitulo} numberOfLines={1} accessibilityRole="header">{titulo}</Text>
    </View>
  );
}

export function Botao({ rotulo, onPress, carregando, desativado, tipo = 'principal' }: {
  rotulo: string; onPress: () => void; carregando?: boolean; desativado?: boolean; tipo?: 'principal' | 'secundario';
}) {
  return (
    <BotaoDoApp titulo={rotulo} onPress={onPress} carregando={carregando} desabilitado={desativado}
      variante={tipo === 'principal' ? 'primario' : 'secundario'} />
  );
}

/** Selo da situação: ponto + texto escrito (a cor nunca fala sozinha). */
export function SeloSituacao({ situacao }: { situacao: Situacao }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const c = cores[situacao];
  return (
    <View style={[styles.selo, { backgroundColor: c.fundo, borderColor: c.texto }]}>
      {situacao === 'andamento'
        ? <Pulso cor={c.texto} tamanho={componentes.selo.ponto} />
        : <View style={[styles.seloPonto, { backgroundColor: c.texto }]} />}
      <Text style={styles.seloTexto}>{ROTULO_SITUACAO[situacao]}</Text>
    </View>
  );
}

export function Carregando() {
  const { cores } = useTema();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco[8] }}>
      <ActivityIndicator color={cores.azul} />
    </View>
  );
}

export function Aviso({ texto, tipo = 'erro' }: { texto: string; tipo?: 'erro' | 'info' }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  return (
    <View
      style={[styles.aviso, tipo === 'erro' ? { backgroundColor: cores.erroSuave, borderColor: cores.erro } : { backgroundColor: cores.azulSuave, borderColor: cores.azul }]}
      accessibilityRole={tipo === 'erro' ? 'alert' : undefined}
    >
      <Text style={styles.avisoTexto}>{texto}</Text>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  topo: { paddingHorizontal: componentes.tela.margem, paddingBottom: espaco[3] },
  topoTitulo: { ...fontes.nome, fontSize: corpo.cabecalho, color: c.texto },
  selo: {
    flexDirection: 'row', alignItems: 'center', gap: espaco[1.5], alignSelf: 'flex-start', borderRadius: componentes.selo.raio,
    borderWidth: 1, paddingHorizontal: espaco[2.5], paddingVertical: espaco[1],
  },
  seloPonto: { width: componentes.selo.ponto, height: componentes.selo.ponto, borderRadius: raio.pilula },
  seloTexto: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.texto },
  aviso: { borderRadius: raio.medio, borderWidth: 1, padding: espaco[3] },
  avisoTexto: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.texto },
});
