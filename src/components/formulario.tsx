import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps,
} from 'react-native';

import { Toque } from '@/components/efeitos';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { aceso, componentes, corpo, entrelinha, espaco, fontes, raio, vidro, type Paleta } from '@/lib/tema';

/** Peças de formulário e de leitura usadas nos painéis e na administração. */

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={styles.secao}>
      <Text style={styles.secaoTitulo} accessibilityRole="header">{titulo}</Text>
      {children}
    </View>
  );
}

export function Campo({ rotulo, ajuda, ...props }: TextInputProps & { rotulo: string; ajuda?: string }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const [foco, setFoco] = useState(false);
  return (
    <View>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={cores.textoSuave}
        accessibilityLabel={rotulo}
        {...props}
        style={[styles.campo, foco && styles.campoFoco, props.multiline && styles.campoAlto]}
        onFocus={e => { setFoco(true); props.onFocus?.(e); }}
        onBlur={e => { setFoco(false); props.onBlur?.(e); }}
      />
      {ajuda && <Text style={styles.ajuda}>{ajuda}</Text>}
    </View>
  );
}

type Variante = 'primario' | 'secundario' | 'perigo';

export function Botao({
  titulo, onPress, variante = 'primario', carregando = false, desabilitado = false,
}: { titulo: string; onPress: () => void; variante?: Variante; carregando?: boolean; desabilitado?: boolean }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const parado = desabilitado || carregando;
  const corTexto = variante === 'primario' ? cores.sobreLuz : variante === 'perigo' ? cores.erro : cores.azul;
  return (
    <Toque
      onPress={onPress}
      disabled={parado}
      accessibilityRole="button"
      style={[
        styles.botao,
        variante === 'primario' && styles.botaoPrimario,
        variante === 'secundario' && styles.botaoSecundario,
        variante === 'perigo' && styles.botaoPerigo,
        parado && styles.parado,
      ]}
    >
      {carregando ? <ActivityIndicator color={corTexto} /> : <Text style={[styles.botaoTexto, { color: corTexto }]}>{titulo}</Text>}
    </Toque>
  );
}

export function Alternador({
  rotulo, descricao, valor, onChange,
}: { rotulo: string; descricao?: string; valor: boolean; onChange: (novo: boolean) => void }) {
  const styles = useEstilos(criarEstilos);
  return (
    <Pressable
      onPress={() => onChange(!valor)}
      accessibilityRole="switch"
      accessibilityState={{ checked: valor }}
      accessibilityLabel={rotulo}
      style={styles.alternador}
    >
      <View style={styles.alternadorTexto}>
        <Text style={styles.alternadorRotulo}>{rotulo}</Text>
        {descricao && <Text style={styles.ajuda}>{descricao}</Text>}
      </View>
      <View style={[styles.trilha, valor && styles.trilhaLigada]}>
        <View style={[styles.pino, valor && styles.pinoLigado]} />
      </View>
    </Pressable>
  );
}

/**
 * Escolha de uma opção entre poucas. Com `semRotulo`, o rótulo vale só para o leitor de tela;
 * com `rolar`, os botões ficam numa linha que desliza.
 */
export function Opcoes<T extends string | number | null>({
  rotulo, valor, opcoes, onChange, rolar = false, semRotulo = false,
}: { rotulo: string; valor: T; opcoes: { valor: T; rotulo: string }[]; onChange: (novo: T) => void; rolar?: boolean; semRotulo?: boolean }) {
  const styles = useEstilos(criarEstilos);
  const botoes = opcoes.map(o => {
    const ativa = o.valor === valor;
    return (
      <Pressable
        key={String(o.valor)}
        onPress={() => onChange(o.valor)}
        accessibilityRole="radio"
        accessibilityState={{ selected: ativa }}
        style={[styles.opcao, ativa && styles.opcaoAtiva]}
      >
        <Text style={[styles.opcaoTexto, ativa && styles.opcaoTextoAtivo]}>{o.rotulo}</Text>
      </Pressable>
    );
  });
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      {semRotulo ? null : <Text style={styles.rotulo}>{rotulo}</Text>}
      {rolar ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opcoesRolando} style={styles.opcoesArea}>
          {botoes}
        </ScrollView>
      ) : (
        <View style={styles.opcoes}>{botoes}</View>
      )}
    </View>
  );
}

export type Tom = 'azul' | 'ok' | 'suave' | 'erro';

export function Selo({ texto, tom = 'suave' }: { texto: string; tom?: Tom }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={[styles.selo, tom === 'azul' && styles.seloAzul, tom === 'ok' && styles.seloOk, tom === 'erro' && styles.seloErro]}>
      <Text style={[styles.seloTexto, tom === 'azul' && styles.seloTextoAzul, tom === 'ok' && styles.seloTextoOk, tom === 'erro' && styles.seloTextoErro]}>{texto}</Text>
    </View>
  );
}

export function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: string }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={styles.info}>
      <Text style={styles.infoRotulo}>{rotulo}</Text>
      <Text style={styles.infoValor} selectable>{valor}</Text>
    </View>
  );
}

/** Um número grande com legenda (linha de totais dos painéis). */
export function Total({ valor, legenda }: { valor: string; legenda: string }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={styles.total}>
      <Text style={styles.totalValor}>{valor}</Text>
      <Text style={styles.totalLegenda}>{legenda}</Text>
    </View>
  );
}

export function Mensagem({ texto, tom = 'suave' }: { texto: string; tom?: 'suave' | 'erro' | 'azul' }) {
  const styles = useEstilos(criarEstilos);
  return (
    <Text
      style={[styles.mensagem, tom === 'erro' && styles.mensagemErro, tom === 'azul' && styles.mensagemAzul]}
      accessibilityRole={tom === 'erro' ? 'alert' : undefined}
    >
      {texto}
    </Text>
  );
}

/** Pergunta antes de uma ação que não dá pra desfazer com um toque. */
export function confirmar(titulo: string, mensagem: string, acao = 'Confirmar'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm(`${titulo}\n\n${mensagem}`));
  }
  return new Promise(resolve => {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: acao, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function formatarData(iso: string): string {
  // o backend grava em UTC sem fuso
  const data = new Date(/Z$|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  secao: { gap: espaco[3] },
  secaoTitulo: { ...fontes.nome, fontSize: corpo.cabecalho, lineHeight: entrelinha.titulo, color: c.texto },

  rotulo: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave, marginBottom: espaco[1.5] },
  campo: {
    ...vidro(c), borderRadius: componentes.campo.raio,
    ...fontes.texto, fontSize: corpo.nome, color: c.texto,
    paddingHorizontal: componentes.campo.respiroH, paddingVertical: componentes.campo.respiroV,
  },
  campoFoco: { borderColor: c.azul },
  campoAlto: { minHeight: componentes.botao.altura * 2, textAlignVertical: 'top' },
  ajuda: { ...fontes.texto, fontSize: corpo.pequeno, lineHeight: entrelinha.base, color: c.textoSuave, marginTop: espaco[1] },

  botao: {
    minHeight: componentes.botao.altura, borderRadius: componentes.botao.raio, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: espaco[4],
  },
  botaoPrimario: { ...aceso(c) },
  botaoSecundario: { ...vidro(c, 'forte') },
  botaoPerigo: { backgroundColor: c.fundo, borderWidth: 1, borderColor: c.erro },
  parado: { opacity: 0.45 },
  botaoTexto: { ...fontes.nome, fontSize: corpo.nome },

  alternador: { flexDirection: 'row', alignItems: 'center', gap: espaco[3], minHeight: componentes.alvoDeToque },
  alternadorTexto: { flex: 1 },
  alternadorRotulo: { ...fontes.textoForte, fontSize: corpo.nome, color: c.texto },
  trilha: {
    width: componentes.alternador.largura, height: componentes.alternador.altura, borderRadius: raio.pilula,
    backgroundColor: c.linha, justifyContent: 'center', paddingHorizontal: (componentes.alternador.altura - componentes.alternador.pino) / 2,
  },
  trilhaLigada: { ...aceso(c) },
  pino: {
    width: componentes.alternador.pino, height: componentes.alternador.pino, borderRadius: componentes.alternador.pino / 2,
    backgroundColor: c.textoSuave,
  },
  pinoLigado: { backgroundColor: c.sobreLuz, alignSelf: 'flex-end' },

  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco[2] },
  opcoesArea: { flexGrow: 0 },
  opcoesRolando: { flexDirection: 'row', gap: espaco[2] },
  opcao: {
    borderRadius: componentes.chip.raio, ...vidro(c), paddingHorizontal: componentes.chip.respiroH,
    minHeight: componentes.chip.altura, justifyContent: 'center',
  },
  opcaoAtiva: { ...aceso(c), borderColor: c.luz },
  opcaoTexto: { ...fontes.textoForte, fontSize: corpo.base, color: c.textoSuave },
  opcaoTextoAtivo: { color: c.sobreLuz },

  selo: { borderRadius: raio.pilula, borderWidth: 1, borderColor: c.linha, paddingHorizontal: espaco[2.5], paddingVertical: espaco[0.5] },
  seloAzul: { borderColor: c.azul, backgroundColor: c.azulSuave },
  seloOk: { borderColor: c.estadoOnline, backgroundColor: c.estadoOnlineSuave },
  seloErro: { borderColor: c.erro },
  seloTexto: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave },
  seloTextoAzul: { color: c.azul },
  seloTextoOk: { color: c.estadoOnline },
  seloTextoErro: { color: c.erro },

  info: {
    flexDirection: 'row', justifyContent: 'space-between', gap: espaco[4], paddingVertical: espaco[3],
    borderBottomWidth: 1, borderBottomColor: c.linha,
  },
  infoRotulo: { ...fontes.texto, fontSize: corpo.base, color: c.textoSuave },
  infoValor: { flex: 1, ...fontes.textoForte, fontSize: corpo.base, lineHeight: entrelinha.base, color: c.texto, textAlign: 'right' },

  total: {
    flex: 1, ...vidro(c), borderRadius: componentes.cartao.raio,
    paddingVertical: espaco[3], paddingHorizontal: espaco[1], alignItems: 'center',
  },
  totalValor: { ...fontes.nome, fontSize: componentes.estatistica.numero, color: c.azul },
  totalLegenda: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave, textAlign: 'center' },

  mensagem: { ...fontes.texto, fontSize: corpo.base, lineHeight: entrelinha.base, color: c.textoSuave },
  mensagemErro: { ...fontes.textoForte, color: c.erro },
  mensagemAzul: { ...fontes.textoForte, color: c.azul },
});

/** Controle segmentado: duas ou três vistas da mesma coisa, lado a lado (Ao vivo | Gravações). */
export function Segmentado<T extends string>({
  rotulo, valor, opcoes, onChange,
}: { rotulo: string; valor: T; opcoes: { valor: T; rotulo: string }[]; onChange: (novo: T) => void }) {
  const styles = useEstilos(criarEstilosDoSegmentado);
  return (
    <View style={styles.segmentado} accessibilityRole="tablist" accessibilityLabel={rotulo}>
      {opcoes.map(o => {
        const ativa = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onChange(o.valor)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            style={[styles.segmento, ativa && styles.segmentoAtivo]}
          >
            <Text style={[styles.segmentoTexto, ativa && styles.segmentoTextoAtivo]}>{o.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const criarEstilosDoSegmentado = (c: Paleta) => StyleSheet.create({
  segmentado: { flexDirection: 'row', ...vidro(c), borderRadius: raio.pilula, padding: espaco[1] },
  segmento: { flex: 1, minHeight: componentes.alvoDeToque - espaco[1], borderRadius: raio.pilula, alignItems: 'center', justifyContent: 'center' },
  segmentoAtivo: { ...aceso(c) },
  segmentoTexto: { ...fontes.textoForte, fontSize: corpo.base, color: c.textoSuave },
  segmentoTextoAtivo: { color: c.sobreLuz },
});
