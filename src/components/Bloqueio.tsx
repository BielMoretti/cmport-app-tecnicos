import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/formulario';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos } from '@/contexts/TemaContext';
import { pedirBiometria } from '@/lib/biometria';
import { corpo, espaco, fontes, type Paleta } from '@/lib/tema';

/** Tela de bloqueio: aparece com a biometria ligada, ao abrir o app ou voltar depois de um tempo. */
export default function Bloqueio() {
  const styles = useEstilos(criarEstilos);
  const { usuario, desbloquear, logout } = useAuth();
  const [tentando, setTentando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const tentar = useCallback(async () => {
    setTentando(true);
    setFalhou(false);
    const ok = await pedirBiometria();
    setTentando(false);
    if (ok) desbloquear(); else setFalhou(true);
  }, [desbloquear]);

  // pede sozinho ao aparecer
  useEffect(() => { void tentar(); }, [tentar]);

  return (
    <View style={styles.tela}>
      <Text style={styles.titulo} accessibilityRole="header">App bloqueado</Text>
      <Text style={styles.texto}>{usuario?.nome ? `Olá, ${usuario.nome.split(' ')[0]}. ` : ''}Confirme que é você para continuar.</Text>
      {falhou && <Text style={styles.erro}>Não deu para confirmar. Tente de novo.</Text>}
      <View style={styles.acoes}>
        <Botao titulo="Desbloquear" onPress={() => { void tentar(); }} carregando={tentando} />
        <Botao titulo="Sair da conta" variante="perigo" onPress={() => { void logout(); }} />
      </View>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  tela: { flex: 1, backgroundColor: c.fundo, alignItems: 'center', justifyContent: 'center', padding: espaco[6], gap: espaco[4] },
  titulo: { ...fontes.nome, fontSize: corpo.titulo, color: c.texto, textAlign: 'center' },
  texto: { ...fontes.texto, fontSize: corpo.base, color: c.textoSuave, textAlign: 'center' },
  erro: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.erro, textAlign: 'center' },
  acoes: { width: '100%', maxWidth: 360, gap: espaco[3], marginTop: espaco[4] },
});
