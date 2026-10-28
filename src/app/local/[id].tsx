import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aviso, Botao, Campo, Carregando, Cartao, SeloSituacao, Topo } from '@/components/os/ui';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { historicoDoLocal, pedirOS, type HistoricoDoLocal } from '@/lib/os/locais';
import { quando } from '@/lib/os/ordens';
import { componentes, corpo, espaco, fontes, raio, type Paleta } from '@/lib/tema';
import { ROTULO_PRIORIDADE, type Prioridade } from '@/lib/os/types';

/** O local: o que já foi feito lá (de todos os técnicos) e pedir OS nova, que vai para o escritório aprovar. */
export default function Local() {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const router = useRouter();
  const margem = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dados, setDados] = useState<HistoricoDoLocal | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pedindo, setPedindo] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('normal');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let atual = true;
    historicoDoLocal(Number(id))
      .then(d => { if (atual) setDados(d); })
      .catch(e => { if (atual) setErro(e instanceof Error ? e.message : 'Não foi possível abrir o local.'); });
    return () => { atual = false; };
  }, [id]);

  async function enviar() {
    setErro(null);
    setEnviando(true);
    try {
      const os = await pedirOS(Number(id), { titulo: titulo.trim(), descricao: descricao.trim(), prioridade });
      router.replace({ pathname: '/os/[id]', params: { id: String(os.id) } });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível pedir a OS.');
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Topo titulo={dados?.cliente ?? 'Local'} />
      {!dados && !erro ? <Carregando /> : (
        <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: margem.bottom + espaco[10] }]} keyboardShouldPersistTaps="handled">
          {erro && <Aviso texto={erro} />}
          {dados && (
            <>
              {!!dados.endereco && <Text style={styles.endereco}>{dados.endereco}</Text>}

              {!pedindo ? (
                <View style={{ gap: espaco[2] }}>
                  <Botao rotulo="Pedir OS aqui" onPress={() => setPedindo(true)} />
                  <Text style={styles.ajuda}>Achou outro problema neste local? Peça a OS: o escritório aprova e ela entra na agenda.</Text>
                </View>
              ) : (
                <Cartao>
                  <Text style={styles.rotulo}>OS nova neste local</Text>
                  <Campo rotulo="O que é" value={titulo} onChangeText={setTitulo} maxLength={150}
                    placeholder="Ex.: Portão da garagem travando" />
                  <Campo rotulo="Detalhes" value={descricao} onChangeText={setDescricao} multiline maxLength={4000}
                    placeholder="O que você viu e o que precisa levar" style={{ minHeight: 90, textAlignVertical: 'top' }} />
                  <Text style={styles.ajuda}>Para ditar em vez de digitar, toque no microfone do teclado.</Text>
                  <Text style={styles.rotulo}>Prioridade</Text>
                  <View style={styles.chips}>
                    {(Object.keys(ROTULO_PRIORIDADE) as Prioridade[]).map(p => (
                      <Pressable key={p} onPress={() => setPrioridade(p)} accessibilityRole="radio" accessibilityState={{ checked: prioridade === p }}
                        style={[styles.chip, prioridade === p && { backgroundColor: cores.azul, borderColor: cores.azul }]}>
                        <Text style={[styles.chipTexto, prioridade === p && { color: cores.sobreAzul }]}>{ROTULO_PRIORIDADE[p]}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Botao rotulo="Enviar para o escritório" onPress={enviar} carregando={enviando} desativado={titulo.trim().length < 3} />
                  <Botao tipo="secundario" rotulo="Voltar" onPress={() => setPedindo(false)} />
                </Cartao>
              )}

              <Text style={styles.rotulo}>Feito antes aqui</Text>
              {dados.ordens.length === 0 && <Text style={styles.ajuda}>Nenhuma OS anterior.</Text>}
              {dados.ordens.map(o => (
                <Cartao key={o.id}>
                  <View style={styles.linhaTopo}>
                    <Text style={styles.numero}>{o.numero}</Text>
                    <SeloSituacao situacao={o.situacao} />
                  </View>
                  <Text style={styles.titulo}>{o.titulo}</Text>
                  <Text style={styles.ajuda}>{o.tipo} · {quando(o.quando)}{o.tecnico ? ` · ${o.tecnico}` : ''}</Text>
                  {!!o.relato && <Text style={styles.relato}>{o.relato}</Text>}
                </Cartao>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  conteudo: { paddingHorizontal: componentes.tela.margem, gap: espaco[4], width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  endereco: { ...fontes.texto, fontSize: corpo.base, color: c.textoSuave },
  rotulo: { ...fontes.textoForte, fontSize: corpo.micro, color: c.textoSuave, textTransform: 'uppercase', letterSpacing: 0.6 },
  ajuda: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco[2] },
  numero: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave },
  titulo: { ...fontes.nome, fontSize: corpo.base, color: c.texto },
  relato: { ...fontes.texto, fontSize: corpo.pequeno, color: c.texto, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco[2] },
  chip: { borderRadius: raio.pilula, borderWidth: 1, borderColor: c.vidroBorda, paddingHorizontal: espaco[3], paddingVertical: espaco[1.5] },
  chipTexto: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.texto },
});
