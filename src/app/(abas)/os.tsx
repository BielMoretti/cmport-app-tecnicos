import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlifoLocal, GlifoRelogio } from '@/components/os/arte';
import AvisoDaFila, { MarcaPendente } from '@/components/os/AvisoDaFila';
import { Esqueleto, Surgir, useProgresso } from '@/components/os/movimento';
import { Aviso, Cartao, LogoPlaca, SeloSituacao, Tela } from '@/components/os/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { pendentesDaOS, useFila } from '@/lib/os/fila';
import { estaACaminho, listarOS, ordenarOS, paraFazerHoje, quando } from '@/lib/os/ordens';
import { componentes, corpo, espaco, fontes, raio, vidro, type Paleta } from '@/lib/tema';
import { ROTULO_PRIORIDADE, type OrdemServico } from '@/lib/os/types';

const mesmoDia = (iso: string, d: Date) => new Date(iso).toDateString() === d.toDateString();

/** A parada desta OS na rota de hoje (só vale para OS agendada hoje: a rota é do dia). */
function paradaDeHoje(os: OrdemServico, hoje = new Date()): number | null {
  return os.rota_posicao && os.agendada_para && mesmoDia(os.agendada_para, hoje) ? os.rota_posicao : null;
}

/**
 * A aba mostra só o dia: o que falta fazer hoje (ver paraFazerHoje) e, no fim, o que foi concluído hoje.
 * Com rota mandada pelo escritório, a lista segue a rota; o que não está nela vem depois.
 */
function separarHoje(lista: OrdemServico[], hoje = new Date()) {
  const pendentes = lista.filter(o => paraFazerHoje(o, hoje));
  const comRota = pendentes.filter(o => paradaDeHoje(o, hoje) !== null).sort((a, b) => paradaDeHoje(a, hoje)! - paradaDeHoje(b, hoje)!);
  return {
    aFazer: [...comRota, ...pendentes.filter(o => !comRota.includes(o))],
    feitas: lista.filter(o => o.situacao === 'concluida' && !!o.concluida_em && mesmoDia(o.concluida_em, hoje)),
  };
}

function LinhaDaOS({ os, pendentes }: { os: OrdemServico; pendentes: number }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const router = useRouter();
  const urgente = os.prioridade === 'urgente' || os.prioridade === 'alta';
  return (
    <Cartao onPress={() => router.push({ pathname: '/os/[id]', params: { id: String(os.id) } })} rotulo={`${os.numero}, ${os.titulo}`}>
      <View style={styles.linhaTopo}>
        <Text style={styles.numero}>{paradaDeHoje(os) ? `${paradaDeHoje(os)}ª parada · ` : ''}{os.numero}</Text>
        <SeloSituacao situacao={os.situacao} aCaminho={estaACaminho(os)} />
      </View>
      <Text style={styles.titulo} numberOfLines={2}>{os.titulo}</Text>
      <Text style={styles.cliente} numberOfLines={1}>{os.cliente.nome}</Text>
      <View style={styles.rodape}>
        <View style={styles.info}>
          <GlifoRelogio cor={cores.textoSuave} />
          <Text style={styles.infoTexto}>{quando(os.agendada_para)}</Text>
        </View>
        <View style={[styles.info, { flexShrink: 1 }]}>
          <GlifoLocal cor={cores.textoSuave} />
          <Text style={styles.infoTexto} numberOfLines={1}>{os.endereco.split(' — ')[0]}</Text>
        </View>
      </View>
      {urgente && (
        <Text style={[styles.prioridade, { color: os.prioridade === 'urgente' ? cores.erro : cores.andamento.texto }]}>
          Prioridade {ROTULO_PRIORIDADE[os.prioridade].toLowerCase()}
        </Text>
      )}
      <MarcaPendente quantas={pendentes} />
    </Cartao>
  );
}

export default function MinhasOS() {
  const styles = useEstilos(criarEstilos);
  const router = useRouter();
  const { cores } = useTema();
  const { usuario } = useAuth();
  const margem = useSafeAreaInsets();
  const [lista, setLista] = useState<OrdemServico[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [semSinalDesde, setSemSinalDesde] = useState<string | null>(null);
  const fila = useFila();

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const r = await listarOS();
      setLista(ordenarOS(r.lista));
      setSemSinalDesde(r.semSinalDesde);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as OS.');
    }
  }, []);

  // busca de novo sempre que a aba aparece: a OS aberta ou mudada na dash chega sem puxar a lista
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  // a fila terminou de subir alguma ação: a lista passa a mostrar a versão do servidor
  const naFila = useRef(fila.itens.length);
  useEffect(() => {
    if (fila.itens.length < naFila.current) void carregar();
    naFila.current = fila.itens.length;
  }, [fila.itens.length, carregar]);

  async function puxar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  const hoje = useMemo(() => separarHoje(lista ?? []), [lista]);
  const aFazer = hoje.aFazer.length;
  const primeiroNome = usuario?.nome.split(' ')[0] ?? '';
  const secoes = useMemo(() => [
    { titulo: 'Hoje', data: hoje.aFazer },
    { titulo: 'Concluídas hoje', data: hoje.feitas },
  ].filter(s => s.data.length > 0), [hoje]);
  // progresso do dia: as concluídas hoje contra o total de hoje
  const feitasHoje = hoje.feitas.length;
  const totalHoje = feitasHoje + aFazer;
  const larguraDaBarra = useProgresso(totalHoje ? feitasHoje / totalHoje : 0);
  // a cascata de entrada é só da primeira carga; ao atualizar, a lista já está ali
  const [cascata, setCascata] = useState(true);
  useEffect(() => { if (lista) { const t = setTimeout(() => setCascata(false), 900); return () => clearTimeout(t); } }, [lista]);

  const cabecalho = (
    <View style={{ gap: espaco[4], paddingBottom: espaco[2] }}>
      <View style={styles.saudacao}>
        <View style={{ gap: espaco[1], flex: 1 }}>
          <Text style={styles.ola}>Olá, {primeiroNome}</Text>
          <Text style={styles.resumo} accessibilityRole="header">
            {lista === null ? 'Carregando…' : aFazer === 0 ? 'Nada pendente hoje' : aFazer === 1 ? '1 OS para hoje' : `${aFazer} OS para hoje`}
          </Text>
        </View>
        <LogoPlaca tamanho={componentes.logoPlaca.topo} />
      </View>
      {totalHoje > 0 && (
        <View style={{ gap: espaco[1.5] }} accessibilityLabel={`Hoje: ${feitasHoje} de ${totalHoje} feitas`}>
          <Text style={styles.progressoTexto}>Hoje: {feitasHoje} de {totalHoje} {totalHoje === 1 ? 'feita' : 'feitas'}</Text>
          <View style={styles.trilho}>
            <Animated.View style={[styles.barra, { width: larguraDaBarra }]} />
          </View>
        </View>
      )}
      {Platform.OS !== 'web' || __DEV__ ? (
        <Pressable onPress={() => router.push('/ler-qr')} accessibilityRole="button" style={[styles.chip, vidro(cores), { alignSelf: 'flex-start' }]}>
          <Text style={styles.chipTexto}>Ler QR do equipamento</Text>
        </Pressable>
      ) : null}
      <AvisoDaFila />
      {semSinalDesde && (
        <Aviso tipo="info" texto={`Sem sinal: mostrando a lista guardada às ${new Date(semSinalDesde).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`} />
      )}
      {erro && <Aviso texto={erro} />}
    </View>
  );

  // a <Tela> (fundo opaco) é da própria aba: sem ela, a aba de onde se saiu aparecia por baixo
  if (lista === null && !erro) {
    return (
      <Tela>
        <View style={[styles.conteudo, { paddingTop: margem.top + espaco[6], gap: espaco[3] }]} accessibilityLabel="Carregando as OS">
          {cabecalho}
          {[0, 1, 2].map(i => <Esqueleto key={i} cor={cores.superficieForte} altura={132} style={{ borderRadius: componentes.cartao.raio }} />)}
        </View>
      </Tela>
    );
  }

  return (
    <Tela>
    <SectionList
      sections={secoes}
      keyExtractor={os => String(os.id)}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (section.titulo ? <Text style={styles.secao}>{section.titulo}</Text> : null)}
      renderItem={({ item, index }) => {
        const linha = <LinhaDaOS os={item} pendentes={pendentesDaOS(fila.itens, item.id)} />;
        return cascata && index < 6 ? <Surgir atraso={60 * index}>{linha}</Surgir> : linha;
      }}
      ListHeaderComponent={cabecalho}
      ListEmptyComponent={lista ? <Text style={styles.vazio}>Nenhuma OS para hoje.</Text> : null}
      ItemSeparatorComponent={() => <View style={{ height: espaco[3] }} />}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={puxar} tintColor={cores.azul} />}
      contentContainerStyle={[styles.conteudo, { paddingTop: margem.top + espaco[6], paddingBottom: componentes.abas.reserva + margem.bottom }]}
    />
    </Tela>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  conteudo: { paddingHorizontal: componentes.tela.margem, width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  saudacao: { flexDirection: 'row', alignItems: 'center', gap: espaco[3] },
  ola: { ...fontes.texto, fontSize: corpo.base, color: c.textoSuave },
  resumo: { ...fontes.nome, fontSize: corpo.titulo, color: c.texto },
  chip: { height: componentes.chip.altura, borderRadius: componentes.chip.raio, paddingHorizontal: componentes.chip.respiroH, justifyContent: 'center', borderWidth: 1 },
  chipTexto: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.texto },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco[2] },
  numero: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave, fontVariant: ['tabular-nums'] },
  titulo: { ...fontes.nome, fontSize: corpo.nome, color: c.texto },
  cliente: { ...fontes.texto, fontSize: corpo.legenda, color: c.textoSuave },
  rodape: { flexDirection: 'row', gap: espaco[4], marginTop: espaco[1] },
  info: { flexDirection: 'row', alignItems: 'center', gap: espaco[1.5] },
  infoTexto: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave, flexShrink: 1 },
  prioridade: { ...fontes.textoForte, fontSize: corpo.micro },
  vazio: { ...fontes.texto, fontSize: corpo.base, color: c.textoSuave, textAlign: 'center', paddingVertical: espaco[10] },
  secao: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave, textTransform: 'uppercase', letterSpacing: 0.6,
    paddingTop: espaco[4], paddingBottom: espaco[2] },
  progressoTexto: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.texto },
  trilho: { height: 6, borderRadius: raio.pilula, backgroundColor: c.superficieForte, overflow: 'hidden' },
  barra: { position: 'absolute', left: 0, top: 0, height: 6, borderRadius: raio.pilula, backgroundColor: c.concluida.texto },
});
