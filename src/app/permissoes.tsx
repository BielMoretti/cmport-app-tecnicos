import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlifoCamera, GlifoCheck, GlifoLocal, GlifoMicrofone, GlifoSino } from '@/components/os/arte';
import { Surgir } from '@/components/os/movimento';
import { Botao } from '@/components/os/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { pedirPermissao, PERMISSOES, verPermissao, type Permissao, type Situacao } from '@/lib/os/permissoes';
import { componentes, corpo, espaco, fontes, raio, vidro, type Paleta } from '@/lib/tema';

const ITENS: Record<Permissao, { titulo: string; porque: string; icone: (cor: string) => ReactNode }> = {
  localizacao: {
    titulo: 'Localização',
    porque: 'Só quando você toca em “Cheguei no local” e em “Concluir”. Nunca em segundo plano.',
    icone: cor => <GlifoLocal cor={cor} tamanho={22} />,
  },
  notificacoes: {
    titulo: 'Notificações',
    porque: 'Para avisar de OS nova, mudança de horário e mensagem do escritório.',
    icone: cor => <GlifoSino cor={cor} />,
  },
  camera: {
    titulo: 'Câmera',
    porque: 'Para as fotos de antes e depois e para ler o QR code do equipamento.',
    icone: cor => <GlifoCamera cor={cor} />,
  },
  microfone: {
    titulo: 'Microfone',
    porque: 'Só quando você toca em gravar um áudio na OS.',
    icone: cor => <GlifoMicrofone cor={cor} />,
  },
};

/**
 * Primeiro acesso, depois dos termos: as quatro permissões do app, cada uma com o motivo. Negar
 * não trava: o app pergunta de novo na hora do uso. Passa uma vez por aparelho.
 */
export default function Permissoes() {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const { concluirPermissoes } = useAuth();
  const margem = useSafeAreaInsets();
  const [situacoes, setSituacoes] = useState<Partial<Record<Permissao, Situacao>>>({});
  const [pedindo, setPedindo] = useState<Permissao | 'tudo' | null>(null);

  useEffect(() => {
    let vivo = true;
    void Promise.all(PERMISSOES.map(async p => [p, await verPermissao(p)] as const))
      .then(lista => { if (vivo) setSituacoes(Object.fromEntries(lista)); });
    return () => { vivo = false; };
  }, []);

  async function pedir(p: Permissao) {
    // negada de vez no aparelho: só os ajustes do sistema liberam
    if (situacoes[p] === 'negada') { void Linking.openSettings().catch(() => {}); return; }
    setPedindo(p);
    const s = await pedirPermissao(p);
    setSituacoes(atual => ({ ...atual, [p]: s }));
    setPedindo(null);
  }

  async function pedirTudo() {
    setPedindo('tudo');
    for (const p of PERMISSOES) {
      if (situacoes[p] !== 'perguntar') continue;
      const s = await pedirPermissao(p);
      setSituacoes(atual => ({ ...atual, [p]: s }));
    }
    setPedindo(null);
  }

  const faltam = PERMISSOES.filter(p => situacoes[p] === 'perguntar').length;

  return (
    <ScrollView contentContainerStyle={[styles.conteudo, { paddingTop: margem.top + espaco[10], paddingBottom: margem.bottom + espaco[8] }]}>
      <View style={styles.coluna}>
        <Surgir style={{ gap: espaco[2] }}>
          <Text style={styles.titulo} accessibilityRole="header">Permissões do app</Text>
          <Text style={styles.texto}>
            O app precisa destas permissões para registrar o atendimento. Você pode mudar depois nos ajustes do celular.
          </Text>
        </Surgir>

        <View style={{ gap: espaco[3] }}>
          {PERMISSOES.map((p, i) => {
            const s = situacoes[p];
            const item = ITENS[p];
            const ok = s === 'permitida';
            return (
              <Surgir key={p} atraso={80 + i * 60}>
                <View style={[styles.item, vidro(cores), ok && { borderColor: cores.concluida.texto }]}>
                  <View style={[styles.icone, { backgroundColor: ok ? cores.concluida.fundo : cores.azulSuave }]}>
                    {item.icone(ok ? cores.concluida.texto : cores.azul)}
                  </View>
                  <View style={{ flex: 1, gap: espaco[0.5] }}>
                    <Text style={styles.itemTitulo}>{item.titulo}</Text>
                    <Text style={styles.itemPorque}>{item.porque}</Text>
                  </View>
                  {ok ? (
                    <View style={styles.permitida} accessibilityLabel={`${item.titulo}: permitida`}>
                      <GlifoCheck cor={cores.concluida.texto} />
                    </View>
                  ) : s === 'indisponivel' ? (
                    <Text style={styles.indisponivel}>Não se aplica</Text>
                  ) : (
                    <Pressable
                      onPress={() => { void pedir(p); }}
                      disabled={!!pedindo || s === undefined}
                      accessibilityRole="button"
                      accessibilityLabel={`${s === 'negada' ? 'Abrir ajustes para' : 'Permitir'} ${item.titulo}`}
                      style={({ pressed }) => [styles.permitir, pressed && { transform: [{ scale: 0.96 }] }]}
                      hitSlop={6}
                    >
                      <Text style={styles.permitirTexto}>{s === 'negada' ? 'Ajustes' : 'Permitir'}</Text>
                    </Pressable>
                  )}
                </View>
              </Surgir>
            );
          })}
        </View>

        <Surgir atraso={380} style={{ gap: espaco[3] }}>
          {faltam > 0 && <Botao rotulo="Permitir tudo" onPress={pedirTudo} carregando={pedindo === 'tudo'} desativado={!!pedindo} />}
          <Botao tipo={faltam > 0 ? 'secundario' : 'principal'} rotulo={faltam > 0 ? 'Agora não' : 'Continuar'} onPress={concluirPermissoes} desativado={!!pedindo} />
          {faltam > 0 && <Text style={styles.nota}>Sem a permissão, o app pergunta de novo na hora em que precisar.</Text>}
        </Surgir>
      </View>
    </ScrollView>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  conteudo: { flexGrow: 1, paddingHorizontal: componentes.tela.margem, alignItems: 'center' },
  coluna: { width: '100%', maxWidth: componentes.tela.larguraMaxFormulario, gap: espaco[6] },
  titulo: { ...fontes.nome, fontSize: corpo.destaque, color: c.texto },
  texto: { ...fontes.texto, fontSize: corpo.base, lineHeight: 22, color: c.textoSuave },
  item: { flexDirection: 'row', alignItems: 'center', gap: espaco[3], borderRadius: raio.grande, padding: espaco[4] },
  icone: { width: 44, height: 44, borderRadius: raio.medio, alignItems: 'center', justifyContent: 'center' },
  itemTitulo: { ...fontes.nome, fontSize: corpo.base, color: c.texto },
  itemPorque: { ...fontes.texto, fontSize: corpo.pequeno, lineHeight: 18, color: c.textoSuave },
  permitida: { width: componentes.alvoDeToque, height: componentes.alvoDeToque, alignItems: 'center', justifyContent: 'center' },
  permitir: {
    minHeight: componentes.chip.altura, paddingHorizontal: espaco[4], borderRadius: raio.pilula,
    backgroundColor: c.azul, alignItems: 'center', justifyContent: 'center',
  },
  permitirTexto: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.sobreAzul },
  indisponivel: { ...fontes.texto, fontSize: corpo.micro, color: c.textoSuave, maxWidth: 70, textAlign: 'right' },
  nota: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave, textAlign: 'center' },
});
