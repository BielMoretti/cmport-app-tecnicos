import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toque } from '@/components/efeitos';
import { LogoPlaca } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { ApiError } from '@/lib/api';
import { aceso, componentes, corpo, entrelinha, espaco, fontes, vidro, type Paleta } from '@/lib/tema';

// Freio no aparelho: depois de 5 senhas erradas seguidas, o botão espera 1 minuto. Não é a
// proteção de verdade (quem quiser contorna) — essa é a trava do servidor, que responde 429.
const ERROS_ATE_O_FREIO = 5;
const SEGUNDOS_DE_FREIO = 60;
let errosSeguidos = 0;       // fora do componente: sobrevive a sair e voltar da tela
let liberadoEm = 0;

export default function LoginScreen() {
  const { login } = useAuth();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);
  const topo = useSafeAreaInsets().top;
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [foco, setFoco] = useState<'email' | 'senha' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(() => Math.max(0, Math.ceil((liberadoEm - Date.now()) / 1000)));

  // conta o freio para baixo, de segundo em segundo
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(Math.max(0, Math.ceil((liberadoEm - Date.now()) / 1000))), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const podeEnviar = email.trim().length > 0 && senha.length > 0 && !enviando && espera === 0;

  async function entrar() {
    if (!podeEnviar) return;
    setEnviando(true);
    setErro(null);
    try {
      await login(email, senha);
      errosSeguidos = 0;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        errosSeguidos += 1;
        if (errosSeguidos >= ERROS_ATE_O_FREIO) {
          errosSeguidos = 0;
          liberadoEm = Date.now() + SEGUNDOS_DE_FREIO * 1000;
          setEspera(SEGUNDOS_DE_FREIO);
        }
      }
      // 422 = email fora do formato; o backend responde uma lista técnica, não uma frase.
      // 429 = o servidor travou as tentativas e já diz em quanto tempo libera.
      setErro(e instanceof ApiError && e.status !== 422 ? e.message : 'Confira o email digitado.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.tela}>
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingTop: topo + espaco[8] }]} keyboardShouldPersistTaps="handled">
        <View style={styles.marca}>
          <LogoPlaca tamanho={componentes.logoPlaca.entrada} />
          <View>
            <Text style={styles.nomeMarca}>CM PORT</Text>
            <Text style={styles.lema}>Técnico: instalar e conferir as câmeras.</Text>
          </View>
        </View>

        <View style={styles.formulario}>
          <Text style={styles.titulo} accessibilityRole="header">Entrar</Text>
          <View>
            <Text style={styles.rotulo}>Email</Text>
            <TextInput
              style={[styles.campo, foco === 'email' && styles.campoFoco]}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              accessibilityLabel="Email"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFoco('email')}
              onBlur={() => setFoco(null)}
            />
          </View>
          <View>
            <Text style={styles.rotulo}>Senha</Text>
            <TextInput
              style={[styles.campo, foco === 'senha' && styles.campoFoco]}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              accessibilityLabel="Senha"
              value={senha}
              onChangeText={setSenha}
              onSubmitEditing={entrar}
              onFocus={() => setFoco('senha')}
              onBlur={() => setFoco(null)}
            />
          </View>

          {erro && <Text style={styles.erro} accessibilityRole="alert">{erro}</Text>}
          {espera > 0 && (
            <Text style={styles.erro} accessibilityLiveRegion="polite">
              Muitas tentativas. Aguarde {espera} {espera === 1 ? 'segundo' : 'segundos'} para tentar de novo.
            </Text>
          )}

          <Toque
            onPress={entrar}
            disabled={!podeEnviar}
            accessibilityRole="button"
            accessibilityState={{ disabled: !podeEnviar }}
            style={[styles.botao, !podeEnviar && styles.botaoDesabilitado]}
          >
            {enviando ? <ActivityIndicator color={cores.sobreLuz} /> : <Text style={styles.botaoTexto}>Entrar</Text>}
          </Toque>
          <Text style={styles.ajuda}>Use o mesmo email e a mesma senha da dash.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  tela: { flex: 1 },
  conteudo: {
    flexGrow: 1, paddingHorizontal: espaco[5], paddingBottom: espaco[12], gap: espaco[10],
    maxWidth: componentes.tela.larguraMaxFormulario, width: '100%', alignSelf: 'center',
  },
  marca: { flexDirection: 'row', alignItems: 'center', gap: espaco[4] },
  nomeMarca: { ...fontes.nome, fontSize: corpo.titulo, lineHeight: entrelinha.titulo, color: c.texto, letterSpacing: espaco[1.5] },
  lema: { ...fontes.texto, fontSize: corpo.legenda, lineHeight: entrelinha.base, color: c.textoSuave, marginTop: espaco[0.5] },
  formulario: { gap: espaco[4] },
  titulo: { ...fontes.nome, fontSize: corpo.destaque, lineHeight: entrelinha.destaque, color: c.texto, letterSpacing: -0.5 },
  rotulo: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave, marginBottom: espaco[1.5] },
  campo: {
    ...vidro(c), borderRadius: componentes.campo.raio, minHeight: componentes.botao.altura,
    ...fontes.texto, fontSize: corpo.nome, color: c.texto,
    paddingHorizontal: componentes.campo.respiroH, paddingVertical: componentes.campo.respiroV,
  },
  campoFoco: { borderColor: c.azul },
  erro: { ...fontes.textoForte, fontSize: corpo.base, lineHeight: entrelinha.base, color: c.erro },
  botao: {
    ...aceso(c), borderRadius: componentes.botao.raio, minHeight: componentes.botao.altura,
    alignItems: 'center', justifyContent: 'center', marginTop: espaco[2],
  },
  botaoDesabilitado: { opacity: 0.45 },
  botaoTexto: { ...fontes.nome, fontSize: corpo.nome, color: c.sobreLuz },
  ajuda: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
});
