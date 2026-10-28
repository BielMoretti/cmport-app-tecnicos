import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aviso, Botao, Campo } from '@/components/os/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos } from '@/contexts/TemaContext';
import { componentes, corpo, espaco, fontes, type Paleta } from '@/lib/tema';

/** A mesma regra do servidor (os_comum.validar_senha): 8+ caracteres, letras e números. */
function problemaDaSenha(senha: string): string | null {
  if (senha.length < 8) return 'Pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return 'Use letras e números.';
  return null;
}

export default function PrimeiraSenha() {
  const styles = useEstilos(criarEstilos);
  const { usuario, criarSenha, senhaInicial, logout } = useAuth();
  const margem = useSafeAreaInsets();
  // reabriu o app no meio da troca: a senha provisória não está mais na memória
  const pedirAtual = senhaInicial() === null;
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [repetir, setRepetir] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const problema = nova ? problemaDaSenha(nova) : null;
  const naoBate = !!repetir && repetir !== nova;
  const pronto = !problemaDaSenha(nova) && repetir === nova && (!pedirAtual || !!atual);

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      await criarSenha(nova, pedirAtual ? atual : undefined);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a senha.');
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.conteudo, { paddingTop: margem.top + espaco[12], paddingBottom: margem.bottom + espaco[8] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formulario}>
          <View style={{ gap: espaco[2] }}>
            <Text style={styles.titulo} accessibilityRole="header">Crie a sua senha</Text>
            <Text style={styles.sub}>
              Olá, {usuario?.nome.split(' ')[0]}. A senha que o escritório passou é provisória: troque por uma só sua para continuar.
            </Text>
          </View>

          {pedirAtual && (
            <Campo rotulo="Senha provisória" value={atual} onChangeText={setAtual} secureTextEntry autoComplete="current-password" />
          )}
          <Campo rotulo="Senha nova" value={nova} onChangeText={setNova} secureTextEntry autoComplete="new-password"
            textContentType="newPassword" />
          {problema && <Text style={styles.ajuda}>{problema}</Text>}
          <Campo rotulo="Repita a senha nova" value={repetir} onChangeText={setRepetir} secureTextEntry autoComplete="new-password"
            onSubmitEditing={() => { if (pronto) void salvar(); }} returnKeyType="go" />
          {naoBate && <Text style={styles.ajuda}>As duas senhas não estão iguais.</Text>}

          {erro && <Aviso texto={erro} />}
          <Botao rotulo="Salvar e entrar" onPress={salvar} carregando={salvando} desativado={!pronto} />
          <Botao tipo="secundario" rotulo="Sair" onPress={() => { void logout(); }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  conteudo: { flexGrow: 1, paddingHorizontal: componentes.tela.margem, alignItems: 'center' },
  formulario: { width: '100%', maxWidth: componentes.tela.larguraMaxFormulario, gap: espaco[4] },
  titulo: { ...fontes.nome, fontSize: corpo.destaque, color: c.texto },
  sub: { ...fontes.texto, fontSize: corpo.base, color: c.textoSuave, lineHeight: 22 },
  ajuda: { ...fontes.texto, fontSize: corpo.pequeno, color: c.erro, marginTop: -espaco[2] },
});
