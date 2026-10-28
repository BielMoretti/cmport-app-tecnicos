import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampoDeAssinatura } from '@/components/os/Assinatura';
import Comemoracao from '@/components/os/Comemoracao';
import { Aviso, Botao, Campo, Topo } from '@/components/os/ui';
import { useEstilos } from '@/contexts/TemaContext';
import { marcarAqui } from '@/lib/os/local';
import { concluir, listarOS, resumoDoDia, type ResumoDoDia } from '@/lib/os/ordens';
import { apagarRascunho, lerRascunho, salvarRascunho } from '@/lib/os/rascunho';
import { componentes, corpo, espaco, fontes, type Paleta } from '@/lib/tema';

export default function ConcluirOS() {
  const styles = useEstilos(criarEstilos);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const margem = useSafeAreaInsets();
  const [relato, setRelato] = useState('');
  const [nome, setNome] = useState('');
  const [traco, setTraco] = useState('');
  const [desenhando, setDesenhando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluida, setConcluida] = useState<{ numero: string; resumo: ResumoDoDia | null } | null>(null);
  const voltar = useCallback(() => router.back(), [router]);
  // rascunho: o app fechou no meio? volta com o que já estava escrito e assinado
  const [carregouRascunho, setCarregouRascunho] = useState(false);
  const [recuperado, setRecuperado] = useState<string | null>(null);
  const [tracoInicial, setTracoInicial] = useState('');
  const concluindo = useRef(false);
  useEffect(() => {
    let vivo = true;
    void lerRascunho(Number(id)).then(r => {
      if (!vivo) return;
      if (r) {
        setRelato(r.relato); setNome(r.nome); setTraco(r.traco); setTracoInicial(r.traco);
        setRecuperado(new Date(r.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      }
      setCarregouRascunho(true);
    });
    return () => { vivo = false; };
  }, [id]);
  // guarda meio segundo depois de parar de digitar ou desenhar
  useEffect(() => {
    if (!carregouRascunho || concluindo.current) return;
    const t = setTimeout(() => { void salvarRascunho(Number(id), { relato, nome, traco }); }, 500);
    return () => clearTimeout(t);
  }, [id, relato, nome, traco, carregouRascunho]);

  const faltando = [
    !relato.trim() && 'o relato',
    !nome.trim() && 'o nome de quem assina',
    !traco && 'a assinatura',
  ].filter(Boolean) as string[];

  async function enviar() {
    setErro(null);
    setEnviando(true);
    try {
      const os = await concluir(Number(id), { relato: relato.trim(), assinatura: { nome: nome.trim(), traco }, aqui: await marcarAqui() });
      // concluída (ou na fila sem sinal, que já guarda tudo): o rascunho não serve mais
      concluindo.current = true;
      await apagarRascunho(Number(id));
      // o resumo do dia sai da lista; sem sinal, a comemoração aparece sem ele
      const resumo = await listarOS().then(r => resumoDoDia(r.lista)).catch(() => null);
      setConcluida({ numero: os.numero, resumo });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir. Tente de novo.');
      setEnviando(false);
    }
  }

  if (!carregouRascunho) return null;
  if (concluida) return <Comemoracao numero={concluida.numero} resumo={concluida.resumo} aoTerminar={voltar} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Topo titulo="Concluir OS" />
      <ScrollView
        scrollEnabled={!desenhando}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.conteudo, { paddingBottom: margem.bottom + espaco[10] }]}
      >
        {recuperado && <Aviso tipo="info" texto={`Recuperamos o que você tinha escrito às ${recuperado}.`} />}
        <Campo
          rotulo="O que foi feito"
          value={relato}
          onChangeText={setRelato}
          multiline
          placeholder="Ex.: troquei o conector da câmera e testei no app com o síndico."
          style={{ minHeight: 110, textAlignVertical: 'top' }}
        />
        <Text style={styles.ajuda}>Para ditar em vez de digitar, toque no microfone do teclado.</Text>

        <View style={{ gap: espaco[3] }}>
          <Text style={styles.rotulo}>Assinatura do cliente</Text>
          <Campo rotulo="Nome de quem assina" value={nome} onChangeText={setNome} placeholder="Ex.: Síndico, zelador, porteiro" autoCapitalize="words" />
          <CampoDeAssinatura aoMudar={setTraco} aoDesenhar={setDesenhando} inicial={tracoInicial} />
        </View>

        {erro && <Aviso texto={erro} />}
        {faltando.length > 0 && <Text style={styles.ajuda}>Falta {faltando.join(', ')}.</Text>}

        <Botao rotulo="Concluir e enviar" onPress={enviar} carregando={enviando} desativado={faltando.length > 0} />
        <Text style={styles.ajuda}>Ao concluir, a hora e a sua localização ficam registradas na OS.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  conteudo: { paddingHorizontal: componentes.tela.margem, gap: espaco[5], width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  rotulo: { ...fontes.textoForte, fontSize: corpo.micro, color: c.textoSuave, textTransform: 'uppercase', letterSpacing: 0.6 },
  ajuda: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
});
