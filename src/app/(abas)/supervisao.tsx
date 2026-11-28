import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Esqueleto } from '@/components/os/movimento';
import { Aviso, Cartao, SeloSituacao, Tela } from '@/components/os/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { useAoVivo } from '@/lib/os/atualizar';
import { estaACaminho, pesoDaOS, quando } from '@/lib/os/ordens';
import { ApiError } from '@/lib/os/api';
import { listarSupervisao, type ItemDaSupervisao, type ListaDaSupervisao } from '@/lib/os/supervisao';
import { componentes, corpo, espaco, fontes, raio, vidro, type Paleta } from '@/lib/tema';

const INTERVALO_MS = 30_000;

const nomeDe = (o: ItemDaSupervisao) => o.tecnico?.nome ?? 'Sem técnico';

/** O que aconteceu na OS, com os horários. */
function horarios(o: ItemDaSupervisao): string {
  return [
    `Agendada: ${quando(o.agendada_para)}`,
    estaACaminho(o) ? `A caminho: ${quando(o.a_caminho_em)}` : '',
    o.iniciada_em ? `Check-in: ${quando(o.iniciada_em)}` : '',
    o.concluida_em ? `Concluída: ${quando(o.concluida_em)}` : '',
    o.cancelada_em ? `Cancelada: ${quando(o.cancelada_em)}` : '',
  ].filter(Boolean).join('\n');
}

function dataDaLista(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Supervisor: as OS do dia de todos os técnicos, agrupadas por técnico. Só consulta. */
export default function Supervisao() {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const router = useRouter();
  const margem = useSafeAreaInsets();
  const { conferirConta } = useAuth();
  const [lista, setLista] = useState<ListaDaSupervisao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setLista(await listarSupervisao());
      setErro(null);
    } catch (e) {
      // cargo retirado: confere a conta, e a aba some
      if (e instanceof ApiError && e.status === 403) { setLista(null); void conferirConta(); }
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as OS.');
    }
  }, [conferirConta]);

  useAoVivo(useCallback(() => { void carregar(); }, [carregar]), INTERVALO_MS);

  async function puxar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  const tecnicos = useMemo(() => [...new Set((lista?.ordens ?? []).map(nomeDe))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [lista]);
  // o técnico filtrado pode sumir da lista numa atualização: volta a mostrar todos
  const escolhido = filtro && tecnicos.includes(filtro) ? filtro : null;
  const secoes = useMemo(() => tecnicos.filter(t => !escolhido || t === escolhido).map(t => ({
    titulo: t,
    data: (lista?.ordens ?? []).filter(o => nomeDe(o) === t).sort((a, b) =>
      pesoDaOS(a) - pesoDaOS(b) || (a.agendada_para ?? '').localeCompare(b.agendada_para ?? '')),
  })), [lista, tecnicos, escolhido]);

  const total = lista?.ordens.length ?? 0;

  const cabecalho = (
    <View style={{ gap: espaco[3] }}>
      <View style={{ gap: espaco[1] }}>
        <Text style={styles.titulo} accessibilityRole="header">Supervisão</Text>
        <Text style={styles.ajuda}>
          {lista ? `${total} OS · atualizada em ${dataDaLista(lista.em)} · só consulta` : erro ? 'Só consulta' : 'Carregando…'}
        </Text>
      </View>
      {lista?.semSinal && <Aviso tipo="info" texto={`Sem sinal: mostrando a lista guardada em ${dataDaLista(lista.em)}.`} />}
      {erro && <Aviso texto={erro} />}
      {tecnicos.length > 1 && (
        <View style={styles.chips}>
          {[null, ...tecnicos].map(t => {
            const ativo = escolhido === t;
            return (
              <Pressable key={t ?? ' todos'} onPress={() => setFiltro(t)} accessibilityRole="radio" accessibilityState={{ checked: ativo }}
                style={[styles.chip, vidro(cores), ativo && { backgroundColor: cores.azul, borderColor: cores.azul }]}>
                <Text style={[styles.chipTexto, ativo && { color: cores.sobreAzul }]}>{t ?? 'Todos'}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <Tela>
      <SectionList
        sections={secoes}
        keyExtractor={o => String(o.id)}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={cabecalho}
        ListEmptyComponent={lista ? <Text style={styles.vazio}>Nenhuma OS hoje.</Text>
          : erro ? null : <Esqueleto cor={cores.superficieForte} altura={132} style={{ borderRadius: componentes.cartao.raio, marginTop: espaco[3] }} />}
        renderSectionHeader={({ section }) => <Text style={styles.secao}>{section.titulo} · {section.data.length}</Text>}
        renderItem={({ item: o }) => (
          <Cartao rotulo={`${o.numero}, ${o.titulo}`}
            onPress={() => router.push({ pathname: '/os/[id]', params: { id: String(o.id), supervisao: '1' } })}>
            <View style={styles.linhaTopo}>
              <Text style={styles.numero}>{o.numero}</Text>
              <SeloSituacao situacao={o.situacao} aCaminho={estaACaminho(o)} />
            </View>
            <Text style={styles.nome} numberOfLines={2}>{o.titulo}</Text>
            <Text style={styles.cliente} numberOfLines={1}>{o.cliente.nome}</Text>
            <Text style={styles.ajuda}>{horarios(o)}</Text>
          </Cartao>
        )}
        ItemSeparatorComponent={() => <View style={{ height: espaco[3] }} />}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={puxar} tintColor={cores.azul} />}
        contentContainerStyle={[styles.conteudo, { paddingTop: margem.top + espaco[6], paddingBottom: componentes.abas.reserva + margem.bottom }]}
      />
    </Tela>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  conteudo: { paddingHorizontal: componentes.tela.margem, width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  titulo: { ...fontes.destaque, fontSize: corpo.titulo, color: c.texto },
  secao: { ...fontes.nome, fontSize: corpo.nome, color: c.texto, paddingTop: espaco[5], paddingBottom: espaco[2] },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco[2] },
  numero: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave },
  nome: { ...fontes.nome, fontSize: corpo.base, color: c.texto },
  cliente: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.texto },
  ajuda: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave, lineHeight: 20 },
  vazio: { ...fontes.texto, fontSize: corpo.base, color: c.textoSuave, paddingTop: espaco[5] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco[2] },
  chip: { borderRadius: raio.pilula, borderWidth: 1, paddingHorizontal: espaco[3.5], minHeight: componentes.alvoDeToque, justifyContent: 'center' },
  chipTexto: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.texto },
});
