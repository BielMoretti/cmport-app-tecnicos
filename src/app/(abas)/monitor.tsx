import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Fundo } from '@/components/arte';
import { Entrada, Pulso } from '@/components/efeitos';
import { Mensagem } from '@/components/formulario';
import MarcaDagua from '@/components/MarcaDagua';
import { AnelDePontos, ColunasDePontos, Ladrilho, Leitura, LinhaDePontos, Nivel } from '@/components/monitor';
import { Esqueleto, Saudacao } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { podeGerenciarUsuarios } from '@/lib/acesso';
import { api, ApiError } from '@/lib/api';
import { urlAbsoluta } from '@/lib/config';
import { NUVEM_CONTRATADA_BYTES, tamanhoLegivel } from '@/lib/nuvem';
import { buscarResumos, type Resumo24h } from '@/lib/resumo24h';
import { estadoDe } from '@/lib/saude';
import usoDoAssistente from '@/lib/usoDoAssistente.json';
import { componentes, corpo, entrelinha, espaco, fontes, palco, raio, type Paleta } from '@/lib/tema';
import type { Camera, Poste, Usuario } from '@/lib/types';

const INTERVALO_MS = 30_000;
const TROCA_DA_RONDA_MS = 4_000;
const MAX_LEITURAS = 24;
const LENTO_MS = 1500;

// As últimas respostas do servidor, em milissegundos. Fora do componente: a linha continua
// de onde parou quando a pessoa sai da aba e volta.
const leituras: number[] = [];

const dois = (n: number) => String(n).padStart(2, '0');
/** 1037015 → "1,04 mi"; 18400 → "18,4 mil" */
const contagem = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2).replace('.', ',')} mi` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace('.', ',')} mil` : String(n));
const diaEMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const horasEMinutos = (minutos: number) => (minutos >= 60 ? `${Math.floor(minutos / 60)} h ${dois(minutos % 60)} min` : `${minutos} min`);

/**
 * Monitor: o estado do sistema num painel de instrumentos — câmeras, resposta do servidor,
 * gravação, movimento, armazenamento. Tudo sai de dados reais da API; o que depende da
 * lista de gravações (mais pesada) chega depois e vale por meia hora.
 */
export default function MonitorScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);
  const gereUsuarios = podeGerenciarUsuarios(usuario?.role);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [resumos, setResumos] = useState<Resumo24h[]>([]);
  const [analisando, setAnalisando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [semResposta, setSemResposta] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [, redesenhar] = useState(0);        // as leituras ficam fora do estado; isto pede novo desenho
  const analisado = useRef('');             // para quais câmeras o resumo já foi pedido

  const carregar = useCallback(async () => {
    const inicio = Date.now();
    try {
      const [listaCameras, listaPostes] = await Promise.all([api<Camera[]>('/cameras'), api<Poste[]>('/postes')]);
      leituras.push(Date.now() - inicio);
      if (leituras.length > MAX_LEITURAS) leituras.shift();
      setCameras(listaCameras);
      setPostes(listaPostes);
      setSemResposta(false);
      setErro(null);
      setAtualizadoEm(new Date());
      redesenhar(n => n + 1);
      if (gereUsuarios) api<Usuario[]>('/usuarios').then(setUsuarios).catch(() => {});
    } catch (e) {
      setSemResposta(true);
      setErro(e instanceof ApiError ? e.message : 'Não foi possível falar com o servidor.');
    }
  }, [gereUsuarios]);

  useFocusEffect(useCallback(() => {
    carregar().finally(() => setCarregando(false));
    const t = setInterval(carregar, INTERVALO_MS);
    return () => clearInterval(t);
  }, [carregar]));

  // o resumo das últimas 24 h (gravação e movimento) é pedido uma vez por conjunto de câmeras
  const ativas = useMemo(() => cameras.filter(c => c.ativo), [cameras]);
  useEffect(() => {
    const chave = ativas.map(c => c.id).join(',');
    if (!chave || chave === analisado.current) return;
    analisado.current = chave;
    let cancelado = false;
    setAnalisando(true);
    buscarResumos(ativas.map(c => c.id), prontos => { if (!cancelado) setResumos(prontos); })
      .finally(() => { if (!cancelado) setAnalisando(false); });
    return () => { cancelado = true; };
  }, [ativas]);

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }, [carregar]);

  // ── números ──
  const online = ativas.filter(c => estadoDe(c) === 'online').length;
  const offline = ativas.filter(c => estadoDe(c) === 'offline').length;
  const semInfo = ativas.length - online - offline;
  const comAtencao = ativas.filter(c => c.saude === 'ATENCAO').length;
  const comProblema = ativas.filter(c => c.saude === 'PROBLEMA').length;
  const saudaveis = ativas.filter(c => c.saude === 'SAUDAVEL').length;
  const medidas = saudaveis + comAtencao + comProblema;
  const postesVazios = postes.filter(p => p.total_cameras === 0).length;
  const pontosDeAtencao = offline + comProblema + (semResposta ? 1 : 0);

  const ultima = leituras[leituras.length - 1];
  const media = leituras.length ? Math.round(leituras.reduce((s, v) => s + v, 0) / leituras.length) : 0;

  const movimentoPorHora = useMemo(() => {
    const soma = new Array<number>(24).fill(0);
    for (const r of resumos) r.movimentoPorHora.forEach((m, i) => { soma[i] += m; });
    return soma;
  }, [resumos]);
  const minutosDeMovimento = resumos.reduce((s, r) => s + r.minutosComMovimento, 0);
  const minutosGravados = resumos.reduce((s, r) => s + r.minutosGravados, 0);
  const cobertura = resumos.length ? Math.min(1, minutosGravados / (resumos.length * 24 * 60)) : 0;
  const disco = resumos.reduce((s, r) => s + r.bytesEmDisco, 0);
  const limiteDeDisco = resumos.reduce((s, r) => s + r.limiteDeDisco, 0);
  // estimativa da nuvem: o que cada câmera mandou em 24 h vezes os dias do plano dela (ver lib/nuvem.ts)
  const nuvem = resumos.reduce((s, r) => s + r.bytesNaNuvem * (ativas.find(c => c.id === r.cameraId)?.dias_retencao ?? 0), 0);
  const maisMovimento = useMemo(() => (
    resumos
      .filter(r => r.minutosComMovimento > 0)
      .sort((a, b) => b.minutosComMovimento - a.minutosComMovimento)
      .slice(0, 5)
      .map(r => ({ ...r, camera: ativas.find(c => c.id === r.cameraId) }))
      .filter((r): r is typeof r & { camera: Camera } => !!r.camera)
  ), [resumos, ativas]);

  const agora = new Date();
  const eixoDasHoras: [string, string, string] = [`${dois((agora.getHours() + 1) % 24)}h ontem`, `${dois((agora.getHours() + 13) % 24)}h`, 'agora'];
  const esperandoResumo = resumos.length === 0 && analisando;
  let n = 0;   // numeração dos ladrilhos, na ordem em que aparecem

  return (
    <View style={styles.tela}>
      <Fundo />
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.azul} />}
      >
        <Saudacao titulo="Monitor" />

        <View style={styles.corpo}>
          {/* a situação geral, numa linha */}
          <View style={styles.situacao} accessibilityLiveRegion="polite">
            <Pulso cor={pontosDeAtencao > 0 ? cores.estadoOffline : cores.estadoOnline} tamanho={componentes.selo.ponto + 2} />
            <Text style={styles.situacaoTexto}>
              {carregando ? 'Consultando o sistema…'
                : pontosDeAtencao === 0 ? 'Todos os sistemas operando'
                  : `${pontosDeAtencao} ${pontosDeAtencao === 1 ? 'ponto de atenção' : 'pontos de atenção'}`}
            </Text>
            {atualizadoEm && <Text style={styles.hora}>{dois(atualizadoEm.getHours())}:{dois(atualizadoEm.getMinutes())}:{dois(atualizadoEm.getSeconds())}</Text>}
          </View>

          {erro && <Mensagem texto={erro} tom="erro" />}

          {carregando ? (
            <View style={styles.grade}>
              <View style={styles.esqueletoLargo}><Esqueleto altura={componentes.monitor.anel + espaco[12]} /></View>
              <View style={styles.esqueletoMeio}><Esqueleto altura={componentes.monitor.anel} /></View>
              <View style={styles.esqueletoMeio}><Esqueleto altura={componentes.monitor.anel} /></View>
            </View>
          ) : (
            <View style={styles.grade}>
              <Ladrilho numero={++n} titulo="Câmeras" largo>
                <AnelDePontos
                  centro={String(ativas.length)}
                  legendaDoCentro={ativas.length === 1 ? 'câmera' : 'câmeras'}
                  fatias={[
                    { rotulo: 'No ar', valor: online, cor: cores.estadoOnline },
                    { rotulo: 'Fora do ar', valor: offline, cor: cores.estadoOffline },
                    { rotulo: 'Sem informação', valor: semInfo, cor: cores.estadoNeutro },
                  ]}
                  descricao={`De ${ativas.length} câmeras: ${online} no ar, ${offline} fora do ar e ${semInfo} sem informação.`}
                />
              </Ladrilho>

              <Ladrilho numero={++n} titulo="Servidor">
                <Leitura
                  valor={semResposta || ultima === undefined ? '–' : String(ultima)}
                  unidade="ms"
                  legenda={semResposta ? 'Sem resposta agora' : ultima > LENTO_MS ? 'Respondendo devagar' : 'Respondendo normalmente'}
                />
                <LinhaDePontos valores={leituras} descricao={`Tempo de resposta do servidor nas últimas ${leituras.length} consultas. Média de ${media} milissegundos.`} />
                <Text style={styles.nota}>Média {media} ms</Text>
              </Ladrilho>

              <Ladrilho numero={++n} titulo="Gravação 24 h">
                {esperandoResumo ? <Text style={styles.nota}>Analisando as gravações…</Text> : (
                  <>
                    <Leitura valor={String(Math.round(cobertura * 100))} unidade="%" legenda="do tempo foi gravado" />
                    <Nivel rotulo="Cobertura" fracao={cobertura} valor={`${Math.round(minutosGravados / 60)} h gravadas`} alerta={resumos.length > 0 && cobertura < 0.8} />
                    <Text style={styles.nota}>{resumos.length} de {ativas.length} câmeras analisadas{analisando ? '…' : ''}</Text>
                  </>
                )}
              </Ladrilho>

              <Ladrilho numero={++n} titulo="Movimento nas últimas 24 h" largo>
                {esperandoResumo ? <Text style={styles.nota}>Analisando as gravações…</Text> : (
                  <>
                    <Leitura valor={horasEMinutos(minutosDeMovimento)} legenda="de movimento, somando todas as câmeras" />
                    <ColunasDePontos
                      valores={movimentoPorHora}
                      destaque={23}
                      rotulos={eixoDasHoras}
                      descricao={`Minutos com movimento em cada uma das últimas 24 horas. Na última hora: ${movimentoPorHora[23]} minutos. A hora mais movimentada teve ${Math.max(...movimentoPorHora)} minutos.`}
                    />
                  </>
                )}
              </Ladrilho>

              <Ronda numero={++n} cameras={ativas} aoAbrir={id => router.push({ pathname: '/camera/[id]', params: { id: String(id) } })} />

              <Ladrilho numero={++n} titulo="Qualidade">
                {medidas === 0 ? <Text style={styles.nota}>O servidor ainda não mediu a qualidade.</Text> : (
                  <>
                    <Nivel rotulo="Saudável" fracao={saudaveis / medidas} valor={String(saudaveis)} />
                    <Nivel rotulo="Instável" fracao={comAtencao / medidas} valor={String(comAtencao)} />
                    <Nivel rotulo="Com problema" fracao={comProblema / medidas} valor={String(comProblema)} alerta={comProblema > 0} />
                  </>
                )}
              </Ladrilho>

              <Ladrilho numero={++n} titulo="Armazenamento" largo>
                {esperandoResumo ? <Text style={styles.nota}>Analisando as gravações…</Text> : (
                  <>
                    <Nivel
                      rotulo="Disco do servidor"
                      fracao={limiteDeDisco > 0 ? disco / limiteDeDisco : 0}
                      valor={`${tamanhoLegivel(disco)} de ${tamanhoLegivel(limiteDeDisco)}`}
                    />
                    <Nivel
                      rotulo="Nuvem (estimativa)"
                      fracao={nuvem / NUVEM_CONTRATADA_BYTES}
                      valor={`${tamanhoLegivel(nuvem)} de ${tamanhoLegivel(NUVEM_CONTRATADA_BYTES)}`}
                      alerta={nuvem / NUVEM_CONTRATADA_BYTES >= 0.9}
                    />
                    <Text style={styles.nota}>O disco do servidor gira: cheio é normal, o trecho mais antigo dá lugar ao novo.</Text>
                  </>
                )}
              </Ladrilho>

              {maisMovimento.length > 0 && (
                <Ladrilho numero={++n} titulo="Onde mais houve movimento" largo>
                  {maisMovimento.map(r => (
                    <Nivel
                      key={r.cameraId}
                      rotulo={r.camera.nome}
                      fracao={r.minutosComMovimento / maisMovimento[0].minutosComMovimento}
                      valor={horasEMinutos(r.minutosComMovimento)}
                    />
                  ))}
                </Ladrilho>
              )}

              <Ladrilho numero={++n} titulo="Postes">
                <Leitura valor={String(postes.length)} legenda={postesVazios === 0 ? 'todos com câmera' : `${postesVazios} sem câmera`} />
              </Ladrilho>

              {usuarios && (
                <Ladrilho numero={++n} titulo="Usuários">
                  <Leitura
                    valor={String(usuarios.filter(u => u.ativo).length)}
                    legenda={`${usuarios.filter(u => u.ativo && u.role === 'MORADOR').length} moradores, ${usuarios.filter(u => !u.ativo).length} bloqueados`}
                  />
                </Ladrilho>
              )}

              {/* quanto o assistente trabalhou no projeto — coisa de desenvolvimento, só o nível DEV vê */}
              {usuario?.role === 'DEV' && usoDoAssistente.encontrado && (
                <Ladrilho numero={++n} titulo="Assistente (Claude)" largo>
                  <Leitura
                    valor={contagem(usoDoAssistente.tokens.saida)}
                    unidade="tokens gerados"
                    legenda={`em ${usoDoAssistente.respostas} respostas e ${usoDoAssistente.acoes} ações no projeto${usoDoAssistente.primeiraResposta ? `, desde ${diaEMes(usoDoAssistente.primeiraResposta)}` : ''}`}
                  />
                  <ColunasDePontos
                    valores={usoDoAssistente.ultimosDias.map(d => d.saida)}
                    destaque={usoDoAssistente.ultimosDias.length - 1}
                    rotulos={[diaEMes(usoDoAssistente.ultimosDias[0].dia), diaEMes(usoDoAssistente.ultimosDias[Math.floor(usoDoAssistente.ultimosDias.length / 2)].dia), diaEMes(usoDoAssistente.ultimosDias[usoDoAssistente.ultimosDias.length - 1].dia)]}
                    descricao={`Tokens gerados pelo assistente em cada um dos últimos ${usoDoAssistente.ultimosDias.length} dias. No dia mais cheio: ${contagem(Math.max(...usoDoAssistente.ultimosDias.map(d => d.saida)))}.`}
                  />
                  <Nivel
                    rotulo="Lidos da memória da conversa"
                    fracao={usoDoAssistente.tokens.cacheLido / Math.max(1, usoDoAssistente.tokens.cacheLido + usoDoAssistente.tokens.cacheGravado + usoDoAssistente.tokens.entrada)}
                    valor={contagem(usoDoAssistente.tokens.cacheLido)}
                  />
                  <Nivel
                    rotulo="Lidos pela primeira vez"
                    fracao={(usoDoAssistente.tokens.cacheGravado + usoDoAssistente.tokens.entrada) / Math.max(1, usoDoAssistente.tokens.cacheLido + usoDoAssistente.tokens.cacheGravado + usoDoAssistente.tokens.entrada)}
                    valor={contagem(usoDoAssistente.tokens.cacheGravado + usoDoAssistente.tokens.entrada)}
                  />
                  <Text style={styles.nota}>
                    {usoDoAssistente.sessoes} {usoDoAssistente.sessoes === 1 ? 'sessão' : 'sessões'}
                    {usoDoAssistente.modelos[0] ? `, modelo ${usoDoAssistente.modelos[0].modelo}` : ''}. Retrato de {diaEMes(usoDoAssistente.geradoEm)}, tirado do computador de desenvolvimento.
                  </Text>
                  <Text style={styles.nota}>Quanto falta do limite do plano não fica registrado em lugar nenhum que o app alcance: veja com o comando /usage no Claude Code.</Text>
                </Ladrilho>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** Ronda: passa sozinha pela imagem mais recente de cada câmera, uma de cada vez. */
function Ronda({ numero, cameras, aoAbrir }: { numero: number; cameras: Camera[]; aoAbrir: (id: number) => void }) {
  const styles = useEstilos(criarEstilos);
  const comImagem = useMemo(() => cameras.filter(c => c.miniatura_url), [cameras]);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (comImagem.length < 2) return;
    const t = setInterval(() => setIndice(i => i + 1), TROCA_DA_RONDA_MS);
    return () => clearInterval(t);
  }, [comImagem.length]);

  const atual = comImagem.length ? comImagem[indice % comImagem.length] : null;
  return (
    <Ladrilho numero={numero} titulo="Ronda">
      {atual ? (
        <Pressable onPress={() => aoAbrir(atual.id)} accessibilityRole="button" accessibilityLabel={`Ronda: ${atual.nome}. Abrir a câmera.`} style={styles.ronda}>
          <Image source={{ uri: urlAbsoluta(atual.miniatura_url)! }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
          <MarcaDagua tamanho="pequena" />
          <View style={styles.rondaTarja}><Text style={styles.rondaNome} numberOfLines={1}>{atual.nome}</Text></View>
        </Pressable>
      ) : (
        <View style={[styles.ronda, styles.rondaVazia]}><Text style={styles.nota}>Sem imagem das câmeras agora.</Text></View>
      )}
      <Text style={styles.nota}>{atual ? `${(indice % comImagem.length) + 1} de ${comImagem.length}` : ' '}</Text>
    </Ladrilho>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { paddingBottom: componentes.abas.reserva, width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  corpo: { paddingHorizontal: espaco[5], gap: espaco[3] },
  situacao: { flexDirection: 'row', alignItems: 'center', gap: espaco[2.5] },
  situacaoTexto: { flex: 1, fontFamily: fontes.textoForte, fontSize: corpo.base, lineHeight: entrelinha.base, color: c.texto },
  hora: { fontFamily: fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave, fontVariant: ['tabular-nums'] },
  // os ladrilhos têm respiro próprio; a margem negativa alinha as bordas com o resto da tela
  grade: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', marginHorizontal: -espaco[1.5] },
  esqueletoLargo: { width: '100%', padding: espaco[1.5] },
  esqueletoMeio: { width: '50%', padding: espaco[1.5] },
  nota: { fontFamily: fontes.texto, fontSize: corpo.micro, lineHeight: entrelinha.base - espaco[1.5], color: c.textoSuave, fontVariant: ['tabular-nums'] },
  ronda: { width: '100%', aspectRatio: 16 / 9, borderRadius: raio.medio, overflow: 'hidden', backgroundColor: palco.fundo, justifyContent: 'flex-end' },
  rondaVazia: { alignItems: 'center', justifyContent: 'center', padding: espaco[3], backgroundColor: c.predio },
  rondaTarja: { backgroundColor: palco.veu, paddingHorizontal: espaco[2], paddingVertical: espaco[1] },
  rondaNome: { fontFamily: fontes.textoForte, fontSize: corpo.micro, color: palco.texto },
});
