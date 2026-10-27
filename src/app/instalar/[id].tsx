import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { GlifoCopiar, GlifoMais } from '@/components/arte';
import { BarraCarregando, Toque } from '@/components/efeitos';
import { Alternador, Botao, Campo, Mensagem, Opcoes } from '@/components/formulario';
import { Grupo, Linha } from '@/components/lista';
import { Passos } from '@/components/passos';
import { estadoDaPorta, PainelDePortas, Porta, ROTULO_DA_PORTA } from '@/components/portas';
import { Bloco, Cabecalho } from '@/components/ui';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { porCriacao, postesDoCondominio } from '@/lib/agrupar';
import { api, ApiError } from '@/lib/api';
import { marcarRecente } from '@/lib/recentes';
import { componentes, corpo, entrelinha, espaco, fontes, raio, vidro, type Paleta } from '@/lib/tema';
import { useTransmissao } from '@/lib/transmissao';
import type { Camera, DiasRetencao, Poste } from '@/lib/types';

const MAXIMO_DO_LOTE = 16;

/**
 * Instalação em passos, depois de escolher o condomínio (passo 1, aba Instalar):
 *   2. Poste      escolher um poste do condomínio, criar um novo ou seguir sem poste
 *   3. Câmeras    quantas, o nome e por quanto tempo guardar as gravações
 *   4. Endereços  o endereço de cada câmera e as portas acendendo quando o vídeo chega
 *
 * Cada passo é uma tela empilhada (parâmetro `passo`): o voltar do Android e o gesto do iPhone
 * voltam um passo. Depois de criar, o passo 3 é trocado pelo 4, e voltar leva ao poste.
 */
export default function InstalacaoScreen() {
  const params = useLocalSearchParams<{ id: string; nome?: string; passo?: string; posteId?: string; posteNome?: string; ids?: string }>();
  const condominioId = Number(params.id);
  const nome = params.nome ?? 'Condomínio';
  const passo = params.passo === '3' ? 3 : params.passo === '4' ? 4 : 2;

  useEffect(() => {
    if (params.nome) void marcarRecente({ id: condominioId, nome: params.nome });
  }, [condominioId, params.nome]);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <Cabecalho titulo={nome} />
      {passo === 2 && <PassoPoste condominioId={condominioId} nome={nome} />}
      {passo === 3 && (
        <PassoCameras
          condominioId={condominioId}
          nome={nome}
          posteId={params.posteId ? Number(params.posteId) : null}
          posteNome={params.posteNome ?? 'Fora de poste'}
        />
      )}
      {passo === 4 && (
        <PassoEnderecos
          condominioId={condominioId}
          posteId={params.posteId ? Number(params.posteId) : null}
          posteNome={params.posteNome ?? 'Fora de poste'}
          ids={(params.ids ?? '').split(',').map(Number).filter(n => n > 0)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────── 2. Poste ───────────────────────────────

function PassoPoste({ condominioId, nome }: { condominioId: number; nome: string }) {
  const router = useRouter();
  const styles = useEstilos(criarEstilos);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let cancelado = false;
    Promise.all([
      api<Poste[]>(`/postes?condominio_id=${condominioId}`),
      api<Camera[]>(`/cameras/por-condominio/${condominioId}`),
    ])
      .then(([p, c]) => { if (!cancelado) { setPostes(p); setCameras(c); setErro(null); } })
      .catch(e => { if (!cancelado) setErro(e instanceof ApiError ? e.message : 'Sem conexão com o servidor. Volte e tente de novo.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [condominioId]));

  const grupos = useMemo(() => postesDoCondominio(condominioId, postes.filter(p => p.ativo), cameras), [condominioId, postes, cameras]);

  const seguir = (posteId: number | null, posteNome: string) => router.push({
    pathname: '/instalar/[id]',
    params: { id: String(condominioId), nome, passo: '3', posteId: posteId === null ? '' : String(posteId), posteNome },
  });

  async function criarPoste() {
    if (novo.trim().length < 2 || criando) return;
    setCriando(true);
    setErro(null);
    try {
      const p = await api<Poste>('/postes', { method: 'POST', body: { nome: novo.trim(), observacao: null, condominio_id: condominioId } });
      setNovo('');
      seguir(p.id, p.nome);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar o poste. Tente de novo.');
    } finally {
      setCriando(false);
    }
  }

  return (
    <>
      <BarraCarregando ativa={carregando} />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Passos atual={2} />
        <Text style={styles.pergunta}>Em qual poste?</Text>
        {erro && <Mensagem texto={erro} tom="erro" />}

        {grupos.postes.length > 0 && (
          <Grupo>
            {grupos.postes.map((l, i) => (
              <Linha
                key={l.poste.id}
                titulo={l.poste.nome}
                detalhe={l.cameras.length ? undefined : 'Sem câmera ainda'}
                abaixo={l.cameras.length ? <PainelDePortas cameras={l.cameras} rotulo={l.poste.nome} /> : undefined}
                onPress={() => seguir(l.poste.id, l.poste.nome)}
                rotulo={`Instalar no ${l.poste.nome}`}
                ultima={i === grupos.postes.length - 1}
              />
            ))}
          </Grupo>
        )}

        <Bloco titulo="Poste novo">
          <Campo rotulo="Nome do poste" placeholder="Ex.: Poste 3 — portaria" value={novo} onChangeText={setNovo} maxLength={150} returnKeyType="done" onSubmitEditing={() => { void criarPoste(); }} />
          <Botao titulo="Criar poste e continuar" onPress={() => { void criarPoste(); }} carregando={criando} desabilitado={novo.trim().length < 2} />
        </Bloco>

        <Grupo>
          <Linha titulo="Seguir sem poste" detalhe="Câmera presa na parede ou num lugar sem poste" onPress={() => seguir(null, 'Fora de poste')} />
          <Linha
            titulo="Administrar este condomínio"
            detalhe="Editar, mover ou desativar postes e câmeras"
            onPress={() => router.push({ pathname: '/admin/condominio/[id]', params: { id: String(condominioId), nome } })}
            ultima
          />
        </Grupo>
      </ScrollView>
    </>
  );
}

// ─────────────────────────────── 3. Câmeras ──────────────────────────────

function PassoCameras({ condominioId, nome, posteId, posteNome }: { condominioId: number; nome: string; posteId: number | null; posteNome: string }) {
  const router = useRouter();
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const [quantidade, setQuantidade] = useState(1);
  const [nomeBase, setNomeBase] = useState('Câmera');
  const [gravador, setGravador] = useState(false);
  const [retencao, setRetencao] = useState<DiasRetencao>(7);
  const [corrigirTempo, setCorrigirTempo] = useState(false);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [existentes, setExistentes] = useState<Camera[]>([]);

  // as portas que o poste já tem: as novas entram depois delas, na posição de verdade
  useEffect(() => {
    let cancelado = false;
    api<Camera[]>(`/cameras/por-condominio/${condominioId}`)
      .then(lista => { if (!cancelado) setExistentes(lista.filter(c => c.poste_id === posteId).sort(porCriacao)); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [condominioId, posteId]);

  const previa = [
    ...existentes,
    ...Array.from({ length: quantidade }, (_, i) => ({ id: -(i + 1), nome: `Nova ${i + 1}`, online: false, ativo: true, criado_em: new Date().toISOString() })),
  ];

  const nomeValido = nomeBase.trim().length >= 2;
  const exemplo = quantidade > 1 ? `${nomeBase.trim() || 'Câmera'} 1, ${nomeBase.trim() || 'Câmera'} 2${quantidade > 2 ? '…' : ''}` : (nomeBase.trim() || 'Câmera');

  async function criar() {
    if (!nomeValido || criando) return;
    setCriando(true);
    setErro(null);
    try {
      let criadas: Camera[];
      if (quantidade > 1) {
        // o servidor numera pelo {n} e devolve um endereço por câmera
        const padrao = nomeBase.includes('{n}') ? nomeBase.trim() : `${nomeBase.trim()} {n}`;
        criadas = await api<Camera[]>('/cameras/lote', {
          method: 'POST',
          body: { condominio_id: condominioId, poste_id: posteId, quantidade, nome_padrao: padrao, dias_retencao: retencao, corrigir_tempo: corrigirTempo },
        });
      } else {
        criadas = [await api<Camera>('/cameras', {
          method: 'POST',
          body: { condominio_id: condominioId, poste_id: posteId, nome: nomeBase.trim(), tipo_conexao: 'RTMP_ISOLADA', dias_retencao: retencao, corrigir_tempo: corrigirTempo },
        })];
      }
      router.replace({
        pathname: '/instalar/[id]',
        params: {
          id: String(condominioId), nome, passo: '4', posteNome,
          posteId: posteId === null ? '' : String(posteId), ids: criadas.map(c => c.id).join(','),
        },
      });
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar as câmeras. Tente de novo.');
      setCriando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
      <Passos atual={3} />
      <Text style={styles.pergunta}>Quantas câmeras no {posteNome === 'Fora de poste' ? 'local' : posteNome}?</Text>

      <Opcoes
        rotulo="Como ela se conecta"
        valor={gravador ? 'gravador' : 'envia'}
        onChange={v => setGravador(v === 'gravador')}
        opcoes={[{ valor: 'envia', rotulo: 'Envia o vídeo pro servidor' }, { valor: 'gravador', rotulo: 'Canal de um gravador' }]}
      />

      {gravador ? (
        <>
          <Mensagem texto="Câmera de gravador (NVR/DVR) pede IP, porta, canal, usuário e senha, uma por vez. Ainda não transmite ao vivo pelo app." />
          <Botao
            titulo="Abrir o cadastro de gravador"
            onPress={() => router.push({ pathname: '/admin/camera', params: { condominioId: String(condominioId), ...(posteId ? { posteId: String(posteId) } : {}) } })}
          />
        </>
      ) : (
        <>
          <View>
            <Text style={styles.rotulo}>Quantidade</Text>
            <View style={styles.contador}>
              <Pressable
                onPress={() => setQuantidade(q => Math.max(1, q - 1))}
                disabled={quantidade <= 1}
                accessibilityRole="button"
                accessibilityLabel="Uma a menos"
                style={[styles.contadorBotao, quantidade <= 1 && styles.parado]}
              >
                <View style={[styles.menos, { backgroundColor: cores.texto }]} />
              </Pressable>
              <Text style={styles.contadorValor} accessibilityLiveRegion="polite" accessibilityLabel={`${quantidade} ${quantidade === 1 ? 'câmera' : 'câmeras'}`}>
                {quantidade}
              </Text>
              <Pressable
                onPress={() => setQuantidade(q => Math.min(MAXIMO_DO_LOTE, q + 1))}
                disabled={quantidade >= MAXIMO_DO_LOTE}
                accessibilityRole="button"
                accessibilityLabel="Uma a mais"
                style={[styles.contadorBotao, quantidade >= MAXIMO_DO_LOTE && styles.parado]}
              >
                <GlifoMais cor={cores.texto} tamanho={componentes.botaoIcone.icone} />
              </Pressable>
            </View>
            <View style={styles.previa}>
              <PainelDePortas cameras={previa} parado rotulo={`${posteNome}: ${existentes.length} já instaladas e ${quantidade} novas`} />
              <Text style={[styles.dica, styles.novas]}>
                {quantidade === 1 ? `Nova: porta ${existentes.length + 1}` : `Novas: portas ${existentes.length + 1} a ${existentes.length + quantidade}`}
              </Text>
            </View>
          </View>

          <Campo
            rotulo="Nome"
            value={nomeBase}
            onChangeText={setNomeBase}
            maxLength={140}
            ajuda={quantidade > 1 ? `Ficam numeradas: ${exemplo}` : undefined}
          />

          <Opcoes
            rotulo="Guardar as gravações por"
            valor={retencao}
            onChange={setRetencao}
            opcoes={[{ valor: 7 as DiasRetencao, rotulo: '7 dias' }, { valor: 14 as DiasRetencao, rotulo: '14 dias' }, { valor: 30 as DiasRetencao, rotulo: '30 dias' }]}
          />
          <Alternador
            rotulo="Corrigir o horário no servidor"
            descricao="Ligue se a gravação fica picotada (comum em equipamento com relógio errado)."
            valor={corrigirTempo}
            onChange={setCorrigirTempo}
          />

          {erro && <Mensagem texto={erro} tom="erro" />}
          <Botao titulo={quantidade > 1 ? `Criar ${quantidade} câmeras` : 'Criar câmera'} onPress={() => { void criar(); }} carregando={criando} desabilitado={!nomeValido} />
        </>
      )}
    </ScrollView>
  );
}

// ────────────────────────────── 4. Endereços ─────────────────────────────

function PassoEnderecos({ condominioId, posteId, posteNome, ids }: { condominioId: number; posteId: number | null; posteNome: string; ids: number[] }) {
  const router = useRouter();
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [copiada, setCopiada] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { estados, conferindo, retomar } = useTransmissao(condominioId, ids);
  const chave = ids.join(',');

  useEffect(() => {
    let cancelado = false;
    const procurados = chave.split(',').map(Number);
    api<Camera[]>(`/cameras/por-condominio/${condominioId}`)
      // o poste inteiro: as novas aparecem na posição real, depois das que já estavam lá
      .then(lista => { if (!cancelado) setCameras(lista.filter(c => c.poste_id === posteId || procurados.includes(c.id)).sort(porCriacao)); })
      .catch(e => { if (!cancelado) setErro(e instanceof ApiError ? e.message : 'Sem conexão com o servidor. Volte e tente de novo.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [condominioId, posteId, chave]);

  // o estado que vale é o da conferência de 5 em 5 s (só das novas); antes dela, o da primeira carga
  const comEstado = cameras.map(c => ({ ...c, online: estados.has(c.id) ? estados.get(c.id) === 'online' ? true : estados.get(c.id) === 'offline' ? false : null : c.online }));
  const novas = comEstado.filter(c => ids.includes(c.id));
  const portaDe = (id: number) => comEstado.findIndex(c => c.id === id) + 1;
  const transmitindo = novas.filter(c => c.online === true).length;
  const total = novas.length;
  const todas = total > 0 && transmitindo === total;
  const situacao = total === 1
    ? (todas ? 'Transmitindo' : 'Aguardando vídeo')
    : todas ? 'Todas as novas transmitindo' : `${transmitindo} de ${total} novas transmitindo`;

  async function copiar(c: Camera) {
    if (!c.rtmp_url) return;
    const deu = await Clipboard.setStringAsync(c.rtmp_url).catch(() => false);
    setCopiada(deu ? c.id : null);
    if (!deu) setErro('Não foi possível copiar neste aparelho. Use Enviar os endereços.');
  }

  const todos = novas.map(c => `${c.nome}\n${c.rtmp_url ?? ''}`).join('\n\n');

  return (
    <>
      <BarraCarregando ativa={carregando} />
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Passos atual={4} />

        <View style={styles.painelGrande}>
          <Text style={styles.painelTitulo}>{posteNome}</Text>
          <PainelDePortas cameras={comEstado} grande rotulo={posteNome} />
          <Text style={[styles.estado, { color: todas ? cores.estadoOnline : cores.texto }]} accessibilityLiveRegion="polite">
            {situacao}
          </Text>
          {todas ? (
            <Text style={styles.dica}>Abra cada uma ao vivo para conferir o enquadramento.</Text>
          ) : conferindo ? (
            <Text style={styles.dica}>Configure o endereço em cada câmera. O app confere sozinho a cada 5 segundos.</Text>
          ) : (
            <Botao titulo="Conferir de novo" variante="secundario" onPress={retomar} />
          )}
        </View>

        {erro && <Mensagem texto={erro} tom="erro" />}

        {novas.map(c => {
          const estado = estadoDaPorta(c, true);
          return (
            <View key={c.id} style={styles.camera}>
              <View style={styles.cameraCabeca}>
                <Porta numero={portaDe(c.id)} estado={estado} />
                <View style={styles.cameraTextos}>
                  <Text style={styles.cameraNome} numberOfLines={2}>{c.nome}</Text>
                  <Text style={[styles.cameraEstado, estado === 'transmitindo' && { color: cores.estadoOnline }, estado === 'aguardando' && { color: cores.estadoEspera }]}>
                    {ROTULO_DA_PORTA[estado]}
                  </Text>
                </View>
              </View>
              {c.rtmp_url ? (
                <Toque
                  onPress={() => { void copiar(c); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Copiar o endereço de ${c.nome}`}
                  style={[styles.endereco, copiada === c.id && styles.enderecoCopiado]}
                >
                  <Text style={styles.enderecoTexto} selectable>{c.rtmp_url}</Text>
                  <View style={styles.enderecoAcao}>
                    <GlifoCopiar cor={copiada === c.id ? cores.estadoOnline : cores.azul} tamanho={componentes.glifo} />
                    <Text style={[styles.enderecoDica, copiada === c.id && { color: cores.estadoOnline }]} accessibilityLiveRegion="polite">
                      {copiada === c.id ? 'Copiado' : 'Tocar para copiar'}
                    </Text>
                  </View>
                </Toque>
              ) : (
                <Mensagem texto="O servidor não mostrou o endereço desta câmera." />
              )}
              <Botao titulo="Conferir ao vivo" variante="secundario" onPress={() => router.push({ pathname: '/camera/[id]', params: { id: String(c.id) } })} />
            </View>
          );
        })}

        <Mensagem texto="Quem tem estes endereços consegue mandar vídeo no lugar das câmeras. Passe só para quem está instalando." />
        <Botao titulo={total > 1 ? 'Enviar os endereços' : 'Enviar o endereço'} variante="secundario" onPress={() => { void Share.share({ message: todos }); }} />
        <Botao titulo="Concluir" onPress={() => router.dismissTo('/')} />
      </ScrollView>
    </>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  conteudo: {
    width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center',
    padding: espaco[4], paddingBottom: espaco[12], gap: espaco[6],
  },
  pergunta: { ...fontes.nome, fontSize: corpo.titulo, lineHeight: entrelinha.titulo, color: c.texto },
  rotulo: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave, marginBottom: espaco[1.5] },
  parado: { opacity: 0.35 },

  contador: { flexDirection: 'row', alignItems: 'center', gap: espaco[4] },
  contadorBotao: {
    width: componentes.botao.altura, height: componentes.botao.altura, borderRadius: raio.medio, ...vidro(c, 'forte'),
    alignItems: 'center', justifyContent: 'center',
  },
  menos: { width: espaco[3.5], height: 2.2, borderRadius: 1 },
  contadorValor: { ...fontes.mono, fontSize: corpo.destaque, minWidth: espaco[12], textAlign: 'center', color: c.texto },
  previa: { marginTop: espaco[4], gap: espaco[2] },
  novas: { color: c.estadoEspera },

  painelGrande: { ...vidro(c), borderRadius: componentes.cartao.raio, padding: espaco[4], gap: espaco[3] },
  painelTitulo: { ...fontes.textoForte, fontSize: corpo.legenda, color: c.textoSuave },
  estado: { ...fontes.nome, fontSize: corpo.cabecalho },
  dica: { ...fontes.texto, fontSize: corpo.pequeno, lineHeight: entrelinha.base, color: c.textoSuave },

  camera: { gap: espaco[3], paddingTop: espaco[5], borderTopWidth: 1, borderTopColor: c.linha },
  cameraCabeca: { flexDirection: 'row', alignItems: 'center', gap: espaco[3] },
  cameraTextos: { flex: 1, gap: espaco[0.5] },
  cameraNome: { ...fontes.nome, fontSize: corpo.nome, color: c.texto },
  cameraEstado: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave },
  endereco: { ...vidro(c), borderRadius: raio.medio, padding: espaco[4], gap: espaco[3] },
  enderecoCopiado: { borderColor: c.estadoOnline },
  enderecoTexto: { ...fontes.mono, fontSize: corpo.legenda, lineHeight: entrelinha.base, color: c.texto },
  enderecoAcao: { flexDirection: 'row', alignItems: 'center', gap: espaco[2] },
  enderecoDica: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.azul },
});
