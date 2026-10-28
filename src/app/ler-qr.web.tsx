import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Aviso, Botao, Campo, Topo } from '@/components/os/ui';
import { useEstilos } from '@/contexts/TemaContext';
import { idDoQr } from '@/lib/os/locais';
import { componentes, corpo, espaco, fontes, type Paleta } from '@/lib/tema';

/** Na prévia do navegador não há câmera: digita o número do local que vem na etiqueta. */
export default function LerQr() {
  const styles = useEstilos(criarEstilos);
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const abrir = () => {
    const id = idDoQr(texto);
    if (id === null) { setErro('Digite o número do local (vem na etiqueta, ex.: Local 10).'); return; }
    router.replace({ pathname: '/local/[id]', params: { id: String(id) } });
  };

  return (
    <View style={{ flex: 1 }}>
      <Topo titulo="Ler QR do equipamento" />
      <View style={styles.conteudo}>
        <Text style={styles.ajuda}>No celular, a câmera lê a etiqueta. Aqui no navegador, digite o número do local.</Text>
        <Campo rotulo="Número do local" value={texto} onChangeText={setTexto} keyboardType="number-pad" onSubmitEditing={abrir} />
        {erro && <Aviso texto={erro} />}
        <Botao rotulo="Abrir o local" onPress={abrir} desativado={!texto.trim()} />
      </View>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  conteudo: { paddingHorizontal: componentes.tela.margem, gap: espaco[4], width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  ajuda: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
});
