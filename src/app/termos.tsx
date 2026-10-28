import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlifoCheck } from '@/components/os/arte';
import { Surgir } from '@/components/os/movimento';
import { Aviso, Botao, LogoPlaca } from '@/components/os/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { POLITICA_DE_PRIVACIDADE, TERMOS_DE_USO } from '@/lib/config';
import { componentes, corpo, espaco, fontes, raio, vidro, type Paleta } from '@/lib/tema';

/**
 * Aceite dos Termos de Uso e da Política de Privacidade: no primeiro acesso e sempre que o texto
 * mudar (quem decide é o servidor, por /auth/me). Até aceitar, é a única tela. O aceite grava a
 * versão e a hora no servidor (POST /auth/aceitar-termos).
 */
export default function Termos() {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const { usuario, aceitarTermos, logout } = useAuth();
  const margem = useSafeAreaInsets();
  const [marcado, setMarcado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aceitar() {
    setErro(null);
    setSalvando(true);
    try {
      await aceitarTermos();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar o aceite. Tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.conteudo, { paddingTop: margem.top + espaco[10], paddingBottom: margem.bottom + espaco[8] }]}>
      <View style={styles.coluna}>
        <Surgir distancia={0} escala={0.92} style={{ alignItems: 'center' }}>
          <LogoPlaca tamanho={componentes.logoPlaca.topo * 1.6} />
        </Surgir>
        <Surgir atraso={120} style={{ gap: espaco[2] }}>
          <Text style={styles.titulo} accessibilityRole="header">Antes de começar</Text>
          <Text style={styles.texto}>
            Olá, {usuario?.nome.split(' ')[0]}. O CMPort Técnico é a sua ferramenta de trabalho. Ele registra a hora e o local da
            chegada e da conclusão, as fotos, os áudios e a assinatura de quem recebeu o serviço. Leia como esses dados são
            usados e protegidos:
          </Text>
        </Surgir>

        <Surgir atraso={220} style={{ gap: espaco[3] }}>
          <Pressable style={[styles.documento, vidro(cores)]} onPress={() => { void Linking.openURL(TERMOS_DE_USO); }} accessibilityRole="link">
            <Text style={styles.documentoTitulo}>Termos de Uso</Text>
            <Text style={styles.documentoAbrir}>Abrir</Text>
          </Pressable>
          <Pressable style={[styles.documento, vidro(cores)]} onPress={() => { void Linking.openURL(POLITICA_DE_PRIVACIDADE); }} accessibilityRole="link">
            <Text style={styles.documentoTitulo}>Política de Privacidade</Text>
            <Text style={styles.documentoAbrir}>Abrir</Text>
          </Pressable>

          <Pressable
            style={styles.concordo}
            onPress={() => setMarcado(m => !m)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: marcado }}
          >
            <View style={[styles.caixa, marcado && { backgroundColor: cores.azul, borderColor: cores.azul }]}>
              {marcado && <GlifoCheck cor={cores.sobreAzul} />}
            </View>
            <Text style={styles.concordoTexto}>Li e concordo com os Termos de Uso e a Política de Privacidade.</Text>
          </Pressable>

          {erro && <Aviso texto={erro} />}
          <Botao rotulo="Aceitar e continuar" onPress={aceitar} carregando={salvando} desativado={!marcado} />
          <Botao tipo="secundario" rotulo="Sair" onPress={() => { void logout(); }} />
        </Surgir>
      </View>
    </ScrollView>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  conteudo: { flexGrow: 1, paddingHorizontal: componentes.tela.margem, alignItems: 'center' },
  coluna: { width: '100%', maxWidth: componentes.tela.larguraMaxFormulario, gap: espaco[6] },
  titulo: { ...fontes.nome, fontSize: corpo.destaque, color: c.texto, textAlign: 'center' },
  texto: { ...fontes.texto, fontSize: corpo.base, lineHeight: 22, color: c.textoSuave },
  documento: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: raio.medio,
    paddingHorizontal: espaco[4], minHeight: componentes.alvoDeToque + espaco[3],
  },
  documentoTitulo: { ...fontes.textoForte, fontSize: corpo.base, color: c.texto },
  documentoAbrir: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.azul },
  concordo: { flexDirection: 'row', alignItems: 'center', gap: espaco[3], paddingVertical: espaco[2] },
  caixa: {
    width: 26, height: 26, borderRadius: raio.pequeno - 2, borderWidth: 2, borderColor: c.textoSuave,
    alignItems: 'center', justifyContent: 'center',
  },
  concordoTexto: { flex: 1, ...fontes.textoForte, fontSize: corpo.legenda, color: c.texto },
});
