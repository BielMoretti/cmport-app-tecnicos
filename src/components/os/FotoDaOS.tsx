/**
 * A foto aberta: grande, com o comentário. Com a OS aberta o técnico escreve o comentário (sai no
 * relatório do cliente) e remove a foto tirada errada.
 */
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmar } from '@/components/formulario';
import { Botao, Campo } from '@/components/os/ui';
import { useEstilos } from '@/contexts/TemaContext';
import { urlAbsoluta } from '@/lib/config';
import { componentes, corpo, espaco, fontes, raio, type Paleta } from '@/lib/tema';
import type { Foto } from '@/lib/os/types';

export default function FotoDaOS({ foto, podeComentar, podeRemover, aoComentar, aoRemover, aoFechar }: {
  foto: Foto;
  podeComentar: boolean;
  podeRemover: boolean;
  aoComentar: (texto: string) => void;
  aoRemover: () => void;
  aoFechar: () => void;
}) {
  const styles = useEstilos(criarEstilos);
  const margem = useSafeAreaInsets();
  const [texto, setTexto] = useState(foto.comentario ?? '');
  const mudou = texto.trim() !== (foto.comentario ?? '');

  async function remover() {
    if (await confirmar('Remover a foto?', `"${foto.legenda}" sai desta OS. Se precisar, tire ou anexe outra.`, 'Remover')) aoRemover();
  }

  async function fechar() {
    if (podeComentar && mudou
      && !(await confirmar('Sair sem salvar?', 'O comentário que você escreveu não foi salvo.', 'Sair sem salvar'))) return;
    aoFechar();
  }

  return (
    <Modal visible animationType="fade" onRequestClose={() => { void fechar(); }} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.fundo} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.conteudo, { paddingTop: margem.top + espaco[3], paddingBottom: margem.bottom + espaco[6] }]}>
          <Text style={styles.titulo} accessibilityRole="header">{foto.legenda || 'Foto'}</Text>
          <Image source={{ uri: urlAbsoluta(foto.url) }} style={styles.foto} resizeMode="contain" accessibilityLabel={foto.legenda} />
          {podeComentar ? (
            <View style={{ gap: espaco[2] }}>
              <Campo rotulo="Comentário" value={texto} onChangeText={setTexto} multiline maxLength={500}
                placeholder="Ex.: cabo rompido atrás do motor" />
              <Text style={styles.ajuda}>Aparece no relatório que vai para o cliente.</Text>
              <Botao rotulo="Salvar comentário" desativado={!mudou} onPress={() => aoComentar(texto.trim())} />
            </View>
          ) : !!foto.comentario && <Text style={styles.comentario}>{foto.comentario}</Text>}
          {podeRemover && <Botao tipo="secundario" rotulo="Remover foto" onPress={() => { void remover(); }} />}
          <Botao tipo="secundario" rotulo="Fechar" onPress={() => { void fechar(); }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  fundo: { flex: 1, backgroundColor: c.fundo },
  conteudo: { paddingHorizontal: componentes.tela.margem, gap: espaco[4], width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  titulo: { ...fontes.nome, fontSize: corpo.cabecalho, color: c.texto },
  foto: { width: '100%', aspectRatio: 3 / 4, borderRadius: raio.medio, backgroundColor: c.superficieForte },
  comentario: { ...fontes.texto, fontSize: corpo.base, color: c.texto, lineHeight: 22 },
  ajuda: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
});
