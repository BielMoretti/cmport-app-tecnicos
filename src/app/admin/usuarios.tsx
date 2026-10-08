import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { GlifoMais } from '@/components/arte';
import { Cabecalho, Cartao } from '@/components/ui';
import { BarraCarregando, Toque } from '@/components/efeitos';
import { Alternador, Botao, Campo, Mensagem, Opcoes, Secao, Selo } from '@/components/formulario';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { niveisQuePodeDar, NOME_DO_PAPEL } from '@/lib/acesso';
import { api, ApiError } from '@/lib/api';
import { aceso, componentes, corpo, entrelinha, espaco, fontes, raio, type Paleta } from '@/lib/tema';
import type { Condominio, Role, Usuario } from '@/lib/types';

/**
 * Usuários do sistema (GET/POST /usuarios — DEV e ADMIN_MASTER).
 * São os mesmos logins do sistema web: mexer aqui vale para os dois.
 * Em cima fica o botão de criar; tocar num usuário abre a ficha dele (nível, senha,
 * bloqueio e, para o morador, os postes e câmeras que ele vê).
 */
export default function UsuariosScreen() {
  const router = useRouter();
  const { usuario: eu } = useAuth();
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  // ?novo=1 (vindo do botão da aba Gestão) já abre o formulário de criar
  const { novo: abrirNovo } = useLocalSearchParams<{ novo?: string }>();
  const niveis = niveisQuePodeDar(eu?.role);
  const opcoes = niveis.map(valor => ({ valor, rotulo: NOME_DO_PAPEL[valor] }));

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState<Role>('MORADOR');
  const [soUmAparelho, setSoUmAparelho] = useState(false);
  // síndico: o condomínio que ele vai cuidar
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [buscaCondominio, setBuscaCondominio] = useState('');
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [criando, setCriando] = useState(false);
  const [erroNovo, setErroNovo] = useState<string | null>(null);
  const [criandoAberto, setCriandoAberto] = useState(abrirNovo === '1');
  const [busca, setBusca] = useState('');

  useEffect(() => { if (abrirNovo === '1') setCriandoAberto(true); }, [abrirNovo]);

  useEffect(() => {
    if (papel !== 'SINDICO' || condominios.length > 0) return;
    api<Condominio[]>('/condominios?tipo=CONDOMINIO&ativo=true&limit=700').then(setCondominios).catch(() => {});
  }, [papel, condominios.length]);

  const termo = buscaCondominio.trim().toLowerCase();
  const condominiosAchados = condominios.filter(c => c.id === condominioId || (termo.length >= 2 && c.nome.toLowerCase().includes(termo))).slice(0, 6);

  const carregar = useCallback(async () => {
    try {
      setUsuarios(await api<Usuario[]>('/usuarios'));
      setErro(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os usuários.');
    }
  }, []);

  // recarrega ao voltar da ficha de um usuário
  useFocusEffect(useCallback(() => {
    carregar().finally(() => setCarregando(false));
  }, [carregar]));

  const podeCriar = nome.trim().length >= 2 && /\S+@\S+\.\S+/.test(email.trim()) && senha.length >= 6 && (papel !== 'SINDICO' || condominioId !== null);

  async function criar() {
    if (!podeCriar) return;
    setCriando(true);
    setErroNovo(null);
    try {
      const novo = await api<Usuario>('/usuarios', {
        method: 'POST',
        body: { nome: nome.trim(), email: email.trim().toLowerCase(), senha, role: papel, so_um_aparelho: papel === 'MORADOR' && soUmAparelho, ...(papel === 'SINDICO' ? { condominio_id: condominioId } : {}) },
      });
      setNome(''); setEmail(''); setSenha('');
      setSoUmAparelho(false);
      setCondominioId(null); setBuscaCondominio('');
      setCriandoAberto(false);
      // morador recém-criado não vê nada até ganhar postes ou câmeras — abre a ficha direto
      router.push({ pathname: '/admin/usuario', params: { id: String(novo.id) } });
    } catch (e) {
      setErroNovo(
        e instanceof ApiError && e.status === 422
          ? 'O servidor não aceitou esses dados. Se o nível for Morador, ele ainda não existe no servidor.'
          : e instanceof ApiError ? e.message : 'Não foi possível criar o usuário. Tente de novo.',
      );
    } finally {
      setCriando(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.tela}>
      <Cabecalho titulo={'Usuários'} />
      <BarraCarregando ativa={carregando} />

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {/* criar: primeiro item da tela, em destaque */}
        {niveis.length === 0 ? (
          <Mensagem texto="O seu nível não permite criar usuários. Peça a um desenvolvedor ou administrador master." />
        ) : !criandoAberto ? (
          <Toque onPress={() => setCriandoAberto(true)} brilho accessibilityRole="button" accessibilityLabel="Criar novo usuário" style={styles.criar}>
            <GlifoMais cor={cores.sobreLuz} tamanho={componentes.iconeCaixa.glifo} />
            <View style={styles.criarTexto}>
              <Text style={styles.criarTitulo}>Criar novo usuário</Text>
              <Text style={styles.criarApoio}>Morador, síndico, técnico, administrador</Text>
            </View>
          </Toque>
        ) : (
          <Cartao destaque style={styles.formulario}>
            <Text style={styles.formularioTitulo} accessibilityRole="header">Novo usuário</Text>
            <Campo rotulo="Nome" value={nome} onChangeText={setNome} autoFocus />
            <Campo rotulo="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
            <Campo rotulo="Senha inicial" value={senha} onChangeText={setSenha} secureTextEntry ajuda="Pelo menos 6 caracteres. A pessoa pode trocar depois." />
            <Opcoes rotulo="Nível de acesso" valor={papel} opcoes={opcoes} onChange={setPapel} />
            {papel === 'MORADOR' && (
              <Alternador
                rotulo="Só um aparelho"
                descricao="O primeiro celular que entrar fica registrado e só ele consegue usar este login. Se a pessoa passar a senha adiante, no outro celular não entra."
                valor={soUmAparelho}
                onChange={setSoUmAparelho}
              />
            )}
            {papel === 'SINDICO' && (
              <>
                <Campo rotulo="Condomínio do síndico" placeholder="Digite parte do nome" value={buscaCondominio} onChangeText={setBuscaCondominio} autoCorrect={false} ajuda="Ele vê todas as câmeras deste condomínio e cria os moradores dele." />
                {condominiosAchados.length > 0 && (
                  <Opcoes<number> rotulo="Escolha o condomínio" valor={condominioId ?? -1} opcoes={condominiosAchados.map(c => ({ valor: c.id, rotulo: c.nome }))} onChange={setCondominioId} />
                )}
              </>
            )}
            {papel === 'MORADOR' && <Mensagem texto="Depois de criar, a ficha abre para você marcar os postes e as câmeras que este morador vai ver." />}
            {erroNovo && <Mensagem texto={erroNovo} tom="erro" />}
            <View style={styles.acoes}>
              <View style={styles.acao}><Botao titulo="Cancelar" variante="secundario" onPress={() => { setCriandoAberto(false); setErroNovo(null); }} desabilitado={criando} /></View>
              <View style={styles.acao}><Botao titulo="Criar usuário" onPress={criar} carregando={criando} desabilitado={!podeCriar} /></View>
            </View>
          </Cartao>
        )}

        {/* atalhos para quem cuida de muitos moradores */}
        {niveis.includes('MORADOR') && !criandoAberto && (
          <View style={styles.atalhos}>
            <Cartao onPress={() => router.push('/admin/moradores-lote')} rotulo="Moradores em lote. Criar vários de uma vez, a partir de uma planilha" style={styles.atalho}>
              <Text style={styles.atalhoTitulo}>Moradores em lote</Text>
              <Text style={styles.email}>Criar vários de uma vez, a partir de uma planilha</Text>
            </Cartao>
            <Cartao onPress={() => router.push('/admin/acesso-em-grupo')} rotulo="Liberar em grupo. Dar os mesmos postes e câmeras a vários moradores" style={styles.atalho}>
              <Text style={styles.atalhoTitulo}>Liberar em grupo</Text>
              <Text style={styles.email}>Dar os mesmos postes e câmeras a vários moradores</Text>
            </Cartao>
          </View>
        )}

        {erro && <Mensagem texto={erro} tom="erro" />}

        <Secao titulo={`Quem tem acesso (${usuarios.length})`}>
          <Mensagem texto="São os mesmos logins do sistema web. O morador só assiste os postes e as câmeras liberados para ele." />
          {usuarios.length > 8 && <Campo rotulo="Buscar" placeholder="Nome ou email" autoCorrect={false} autoCapitalize="none" value={busca} onChangeText={setBusca} />}
          {usuarios.filter(u => !busca.trim() || `${u.nome} ${u.email}`.toLowerCase().includes(busca.trim().toLowerCase())).map(u => (
            <Pressable
              key={u.id}
              onPress={() => router.push({ pathname: '/admin/usuario', params: { id: String(u.id) } })}
              accessibilityRole="button"
              accessibilityLabel={`Abrir a ficha de ${u.nome}`}
              style={({ pressed }) => [styles.cartao, pressed && styles.cartaoPressionado]}
            >
              <View style={styles.cartaoTexto}>
                <Text style={styles.nome} numberOfLines={1}>{u.nome}</Text>
                <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
              </View>
              {!u.ativo && <Selo texto="Bloqueado" tom="erro" />}
              <Selo texto={NOME_DO_PAPEL[u.role] ?? u.role} tom={u.role === 'MORADOR' ? 'suave' : 'azul'} />
            </Pressable>
          ))}
          {!carregando && usuarios.length === 0 && !erro && <Mensagem texto="Nenhum usuário cadastrado." />}
        </Secao>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center', padding: espaco[4], paddingBottom: espaco[10], gap: espaco[6] },
  cartao: {
    flexDirection: 'row', alignItems: 'center', gap: espaco[2], minHeight: componentes.linha.alturaMin + espaco[2],
    backgroundColor: c.superficie, borderRadius: componentes.cartao.raio, borderWidth: 1, borderColor: c.linha,
    paddingHorizontal: espaco[4], paddingVertical: espaco[3],
  },
  cartaoPressionado: { borderColor: c.azul, boxShadow: c.brilho },
  criar: {
    ...aceso(c), borderRadius: raio.grande, minHeight: componentes.botao.altura + espaco[5],
    flexDirection: 'row', alignItems: 'center', gap: espaco[3.5], paddingHorizontal: espaco[5], paddingVertical: espaco[3.5],
  },
  criarTexto: { flex: 1, gap: espaco[0.5] },
  criarTitulo: { fontFamily: fontes.nome, fontSize: corpo.nomeGrande, color: c.sobreLuz },
  criarApoio: { fontFamily: fontes.texto, fontSize: corpo.pequeno, color: c.sobreLuz, opacity: 0.85 },
  formulario: { gap: espaco[4] },
  formularioTitulo: { fontFamily: fontes.nome, fontSize: corpo.cabecalho, lineHeight: entrelinha.titulo, color: c.texto },
  acoes: { flexDirection: 'row', gap: espaco[3] },
  atalhos: { gap: espaco[3], marginTop: -espaco[2] },
  atalho: { gap: espaco[0.5], padding: espaco[4] },
  atalhoTitulo: { fontFamily: fontes.nome, fontSize: corpo.nome, color: c.texto },
  acao: { flex: 1 },
  cartaoTexto: { flex: 1, gap: espaco[0.5] },
  nome: { fontFamily: fontes.nome, fontSize: corpo.nomeGrande, color: c.texto },
  email: { fontFamily: fontes.texto, fontSize: corpo.legenda, color: c.textoSuave },
});
