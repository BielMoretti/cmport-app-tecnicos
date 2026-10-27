import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { BarraCarregando, Toque } from '@/components/efeitos';
import { Botao, confirmar, LinhaInfo, Mensagem, Secao } from '@/components/formulario';
import { Avatar, Cartao, TopoDaAba } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos } from '@/contexts/TemaContext';
import { NOME_DO_PAPEL } from '@/lib/acesso';
import { ApiError } from '@/lib/api';
import { apagarFoto, escolherFoto, salvarFoto } from '@/lib/foto';
import { buscarPerfil, type Perfil } from '@/lib/perfil';
import { componentes, corpo, entrelinha, espaco, fontes, type Paleta } from '@/lib/tema';

/**
 * Conta: quem está logado, a foto (guardada neste aparelho) e o sair.
 * Nome e senha são os da dash e se mudam lá: a API dos instaladores só lê o cadastro.
 */
export default function ContaScreen() {
  const { usuario, logout, foto, definirFoto } = useAuth();
  const styles = useEstilos(criarEstilos);

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroDeCarga, setErroDeCarga] = useState<string | null>(null);

  const [mexendoNaFoto, setMexendoNaFoto] = useState(false);
  const [avisoFoto, setAvisoFoto] = useState<{ texto: string; erro: boolean } | null>(null);


  useEffect(() => {
    let cancelado = false;
    buscarPerfil()
      .then(r => { if (!cancelado) setPerfil(r.perfil); })
      .catch(e => { if (!cancelado) setErroDeCarga(e instanceof ApiError ? e.message : 'Não foi possível carregar os seus dados.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, []);

  // ── foto ──
  async function trocarFoto() {
    if (!perfil || mexendoNaFoto) return;
    setAvisoFoto(null);
    setMexendoNaFoto(true);
    try {
      const escolhida = await escolherFoto();
      if (!escolhida) return;                      // a pessoa fechou a galeria
      const { imagem, onde } = await salvarFoto(perfil.id, escolhida);
      definirFoto(imagem);
      setAvisoFoto({ texto: onde === 'servidor' ? 'Foto trocada.' : 'Foto trocada. Por enquanto ela fica salva só neste aparelho.', erro: false });
    } catch (e) {
      setAvisoFoto({ texto: e instanceof ApiError ? e.message : 'Não foi possível trocar a foto. Tente de novo.', erro: true });
    } finally {
      setMexendoNaFoto(false);
    }
  }

  async function removerFoto() {
    if (!perfil || mexendoNaFoto) return;
    if (!(await confirmar('Remover a foto?', 'Voltam a aparecer as iniciais do seu nome.', 'Remover'))) return;
    setAvisoFoto(null);
    setMexendoNaFoto(true);
    try {
      await apagarFoto(perfil.id);
      definirFoto(null);
      setAvisoFoto({ texto: 'Foto removida.', erro: false });
    } catch (e) {
      setAvisoFoto({ texto: e instanceof ApiError ? e.message : 'Não foi possível remover a foto. Tente de novo.', erro: true });
    } finally {
      setMexendoNaFoto(false);
    }
  }

  async function sair() {
    if (await confirmar('Sair da conta?', 'Você vai precisar do email e da senha para entrar de novo.', 'Sair')) {
      await logout();
    }
  }

  const papel = perfil?.role ?? usuario?.role;

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.tela}>
      <BarraCarregando ativa={carregando} />
      <ScrollView contentContainerStyle={styles.rolagem} keyboardShouldPersistTaps="handled">
        <TopoDaAba titulo="Conta" />
        <View style={styles.conteudo}>
        {/* quem é */}
        <Cartao style={styles.cartaoDeQuem}>
          <Toque onPress={() => { void trocarFoto(); }} disabled={!perfil || mexendoNaFoto} accessibilityRole="button" accessibilityLabel="Trocar a foto do perfil">
            <Avatar tamanho={componentes.avatarGrande} />
          </Toque>
          <View style={styles.quemTexto}>
            <Text style={styles.nome} numberOfLines={2}>{perfil?.nome ?? usuario?.nome ?? ''}</Text>
            {perfil && <Text style={styles.apoio} numberOfLines={1}>{perfil.email}</Text>}
            {papel && <Text style={styles.papel}>{NOME_DO_PAPEL[papel] ?? papel}</Text>}
          </View>
        </Cartao>

        {perfil && (
          <View style={styles.acoesDaFoto}>
            <View style={styles.acaoDaFoto}>
              <Botao titulo={foto ? 'Trocar foto' : 'Escolher foto'} variante="secundario" onPress={() => { void trocarFoto(); }} carregando={mexendoNaFoto} />
            </View>
            {foto && (
              <View style={styles.acaoDaFoto}>
                <Botao titulo="Remover foto" variante="perigo" onPress={() => { void removerFoto(); }} desabilitado={mexendoNaFoto} />
              </View>
            )}
          </View>
        )}
        {avisoFoto && <Mensagem texto={avisoFoto.texto} tom={avisoFoto.erro ? 'erro' : 'azul'} />}

        {erroDeCarga && <Mensagem texto={erroDeCarga} tom="erro" />}

        <Secao titulo="Nome e senha">
          <Mensagem texto="São os mesmos da dash e se mudam lá, em Minha conta. Este app só lê o seu cadastro." />
          <Botao titulo="Abrir a dash" variante="secundario" onPress={() => { void Linking.openURL('https://dash.cmport.com.br'); }} />
        </Secao>

        <Secao titulo="Sobre">
          <View>
            {papel && <LinhaInfo rotulo="Nível de acesso" valor={NOME_DO_PAPEL[papel] ?? papel} />}
            <LinhaInfo rotulo="Versão do aplicativo" valor={Constants.expoConfig?.version ?? '–'} />
          </View>
        </Secao>

        <Botao titulo="Sair da conta" variante="perigo" onPress={() => { void sair(); }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  tela: { flex: 1 },
  rolagem: { width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center', paddingBottom: componentes.abas.reserva },
  conteudo: { paddingHorizontal: espaco[4], gap: espaco[6] },
  cartaoDeQuem: { flexDirection: 'row', alignItems: 'center', gap: espaco[4] },
  acoesDaFoto: { flexDirection: 'row', gap: espaco[3], marginTop: -espaco[3] },
  acaoDaFoto: { flex: 1 },
  quemTexto: { flex: 1, gap: espaco[0.5] },
  nome: { ...fontes.nome, fontSize: corpo.cabecalho, lineHeight: entrelinha.titulo, color: c.texto },
  apoio: { ...fontes.texto, fontSize: corpo.legenda, color: c.textoSuave },
  papel: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave, marginTop: espaco[0.5] },
});
