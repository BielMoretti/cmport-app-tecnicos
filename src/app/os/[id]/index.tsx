import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VerAssinatura } from '@/components/os/Assinatura';
import { GravarAudio, TocarAudio } from '@/components/os/AudioDaOS';
import AvisoDaFila from '@/components/os/AvisoDaFila';
import Cronometro from '@/components/os/Cronometro';
import MarcarFoto from '@/components/os/MarcarFoto';
import { Aviso, Botao, Campo, Carregando, Cartao, SeloSituacao, Topo } from '@/components/os/ui';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { urlAbsoluta } from '@/lib/config';
import { useFila } from '@/lib/os/fila';
import { reduzirFoto } from '@/lib/os/foto';
import { descreverMarcacao, marcarAqui } from '@/lib/os/local';
import { osDoLocal } from '@/lib/os/locais';
import { irAteOLocal } from '@/lib/os/rota';
import {
  anexarAudio, anexarFoto, buscarOS, fazerCheckin, mandarMensagem, marcarItem, osNoCelular, passouDoPrazo, pausar, pendenciasParaConcluir, quando,
  retomar,
} from '@/lib/os/ordens';
import { componentes, corpo, espaco, fontes, raio, type Paleta } from '@/lib/tema';
import { ROTULO_PRIORIDADE, type ItemDoChecklist, type OrdemServico, type TracoNaFoto } from '@/lib/os/types';

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={styles.linha}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

function Secao({ titulo, children, extra }: { titulo: string; children: ReactNode; extra?: string }) {
  const styles = useEstilos(criarEstilos);
  return (
    <Cartao>
      <View style={styles.secaoTopo}>
        <Text style={styles.rotulo}>{titulo}</Text>
        {extra && <Text style={styles.extra}>{extra}</Text>}
      </View>
      {children}
    </Cartao>
  );
}

export default function DetalheDaOS() {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const router = useRouter();
  // veio do histórico do local (QR): a OS pode ser de outro técnico e abre só para ver
  const { id, local } = useLocalSearchParams<{ id: string; local?: string }>();
  const somenteVer = !!local;
  const margem = useSafeAreaInsets();
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // qual ação está rodando (mostra o carregando só no botão dela)
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState('');

  // volta da tela de concluir: busca de novo para mostrar a OS concluída
  useFocusEffect(useCallback(() => {
    let cancelado = false;
    (local ? osDoLocal(Number(local), Number(id)) : buscarOS(Number(id)))
      .then(achada => { if (!cancelado) setOs(achada); })
      .catch(e => { if (!cancelado) setErro(e instanceof Error ? e.message : 'Não foi possível abrir a OS.'); });
    return () => { cancelado = true; };
  }, [id, local]));

  // a fila subiu (ou recusou) uma ação desta OS: mostra a versão nova, sem ir ao servidor
  const { itens } = useFila();
  const daqui = itens.filter(i => i.acao.os === Number(id)).length;
  const antes = useRef(daqui);
  useEffect(() => {
    if (!somenteVer && daqui !== antes.current) void osNoCelular(Number(id)).then(o => { if (o) setOs(o); });
    antes.current = daqui;
  }, [daqui, id, somenteVer]);

  // momento (Antes/Depois) ou item do checklist: a foto é de um ou do outro
  const [paraMarcar, setParaMarcar] = useState<{
    uri: string; largura: number; altura: number; momento?: 'Antes' | 'Depois'; item?: ItemDoChecklist;
  } | null>(null);

  async function agir(nome: string, acao: () => Promise<OrdemServico>) {
    setErro(null);
    setOcupado(nome);
    try {
      setOs(await acao());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu certo. Tente de novo.');
    } finally {
      setOcupado(null);
    }
  }

  // Antes / Depois: a legenda diz o momento; item do checklist: a legenda é o texto do item.
  // Nos dois casos o servidor carimba data, hora e local na foto
  async function tirarFoto(alvo: 'Antes' | 'Depois' | ItemDoChecklist) {
    // no navegador não há câmera do sistema: escolhe um arquivo
    const pedido = Platform.OS === 'web'
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();
    if (!pedido.granted) { setErro('Sem permissão para a câmera. Libere nas configurações do celular.'); return; }
    const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, exif: false };
    const r = Platform.OS === 'web' ? await ImagePicker.launchImageLibraryAsync(opcoes) : await ImagePicker.launchCameraAsync(opcoes);
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    // antes de enviar, a tela de marcar na foto (pode enviar sem marcar)
    setParaMarcar(typeof alvo === 'string'
      ? { uri: a.uri, largura: a.width, altura: a.height, momento: alvo }
      : { uri: a.uri, largura: a.width, altura: a.height, item: alvo });
  }

  async function enviarFoto(tracos: TracoNaFoto[]) {
    const f = paraMarcar;
    setParaMarcar(null);
    if (!f || !os) return;
    // reduz antes de subir (4 a 8 MB da câmera viram uns 300 KB): o servidor aceita até 3 MB
    if (f.item) {
      const item = f.item;
      // o servidor guarda a foto, liga ao item e marca o item como feito
      await agir(`item-${item.id}`, async () =>
        anexarFoto(os.id, await reduzirFoto(f.uri, f.largura), item.texto.slice(0, 120), tracos, item.id));
      return;
    }
    const n = os.fotos.filter(x => x.legenda.startsWith(f.momento ?? '')).length + 1;
    await agir(`foto-${f.momento}`, async () => anexarFoto(os.id, await reduzirFoto(f.uri, f.largura), `${f.momento} ${n}`, tracos));
  }

  if (!os) {
    return (
      <View style={{ flex: 1 }}>
        <Topo titulo="OS" />
        {erro ? <View style={styles.conteudo}><Aviso texto={erro} /></View> : <Carregando />}
      </View>
    );
  }

  const emAtendimento = os.situacao === 'andamento';
  // só para ver: nenhum botão que mude a OS (o servidor também recusa)
  const podeMexer = !somenteVer;
  const podeFotografar = podeMexer && (os.situacao === 'andamento' || os.situacao === 'pausada');
  const feitos = os.checklist.filter(i => i.feito).length;
  const falta = pendenciasParaConcluir(os);
  const mensagens = os.mensagens ?? [];
  const emAberto = os.situacao === 'aberta' || os.situacao === 'andamento' || os.situacao === 'pausada';
  const foraDoPrazo = emAberto && passouDoPrazo(os);

  return (
    <View style={{ flex: 1 }}>
      <Topo titulo={os.numero} />
      {paraMarcar && (
        <MarcarFoto foto={paraMarcar} aoEnviar={tracos => { void enviarFoto(tracos); }} aoCancelar={() => setParaMarcar(null)} />
      )}
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: margem.bottom + espaco[10] }]}>
        <View style={{ gap: espaco[2] }}>
          <SeloSituacao situacao={os.situacao} />
          <Text style={styles.titulo} accessibilityRole="header">{os.titulo}</Text>
        </View>

        {erro && <Aviso texto={erro} />}
        {somenteVer
          ? <Aviso tipo="info" texto="Só para consulta: daqui não dá para mudar nada nesta OS." />
          : <AvisoDaFila osId={os.id} />}

        {(os.situacao === 'andamento' || os.situacao === 'pausada') && os.iniciada_em && (
          <Cronometro desde={os.iniciada_em} rodando={emAtendimento} foraDoPrazo={foraDoPrazo} />
        )}

        {/* a ação principal de cada momento fica no topo */}
        {podeMexer && os.situacao === 'aberta' && (
          <View style={{ gap: espaco[2] }}>
            <Botao rotulo="Cheguei no local" carregando={ocupado === 'checkin'} desativado={!!ocupado}
              onPress={() => agir('checkin', async () => fazerCheckin(os.id, await marcarAqui()))} />
            <Text style={styles.ajuda}>Marca a hora e a sua localização e começa o atendimento.</Text>
          </View>
        )}
        {podeMexer && os.situacao === 'pausada' && (
          <Botao rotulo="Retomar atendimento" carregando={ocupado === 'retomar'} desativado={!!ocupado}
            onPress={() => agir('retomar', () => retomar(os.id))} />
        )}

        {podeMexer && (os.situacao === 'aberta' || os.situacao === 'pausada' || os.situacao === 'andamento') && (
          <View style={{ gap: espaco[2] }}>
            <Text style={styles.rotulo}>Como chegar</Text>
            <View style={styles.dupla}>
              <View style={{ flex: 1 }}>
                <Botao tipo="secundario" rotulo="Google Maps" onPress={() => { void irAteOLocal(os, 'google'); }} />
              </View>
              <View style={{ flex: 1 }}>
                <Botao tipo="secundario" rotulo="Waze" onPress={() => { void irAteOLocal(os, 'waze'); }} />
              </View>
            </View>
          </View>
        )}

        <Cartao>
          <Linha rotulo="Cliente" valor={os.cliente.nome} />
          {somenteVer && <Linha rotulo="Técnico" valor={os.tecnico?.nome ?? 'Sem técnico'} />}
          <Linha rotulo="Endereço" valor={os.endereco} />
          <Linha rotulo="Agendada" valor={quando(os.agendada_para)} />
          {emAberto && !!os.prazo_em && (
            <Linha rotulo="Prazo para concluir" valor={`${quando(os.prazo_em)}${foraDoPrazo ? ' · já passou' : ''}`} />
          )}
          <Linha rotulo="Tipo" valor={`${os.tipo} · prioridade ${ROTULO_PRIORIDADE[os.prioridade].toLowerCase()}`} />
          {os.checkin && <Linha rotulo="Check-in" valor={descreverMarcacao(os.checkin)} />}
          {os.conclusao && <Linha rotulo="Concluída" valor={descreverMarcacao(os.conclusao)} />}
        </Cartao>

        {podeMexer && os.cliente.id > 0 && (
          <Botao tipo="secundario" rotulo="Histórico deste local"
            onPress={() => router.push({ pathname: '/local/[id]', params: { id: String(os.cliente.id) } })} />
        )}

        <Secao titulo="O que fazer">
          <Text style={styles.descricao}>{os.descricao}</Text>
        </Secao>

        {os.checklist.length > 0 && (
          <Secao titulo="Checklist" extra={`${feitos} de ${os.checklist.length}`}>
            {os.checklist.map(item => {
              // pede foto e ainda não tem: o toque abre a câmera em vez de marcar
              const pedeFoto = !!item.exige_foto && !item.feito && !item.foto_id;
              const desativado = !emAtendimento || !podeMexer || !!ocupado;
              return (
                <Pressable
                  key={item.id}
                  disabled={desativado}
                  onPress={() => (pedeFoto ? tirarFoto(item) : agir(`item-${item.id}`, () => marcarItem(os.id, item.id, !item.feito)))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.feito, disabled: desativado }}
                  accessibilityHint={pedeFoto ? 'Toque para tirar a foto deste item' : undefined}
                  style={styles.item}
                >
                  <View style={[styles.caixa, item.feito && { backgroundColor: cores.azul, borderColor: cores.azul }]}>
                    {item.feito && <Text style={styles.marca}>✓</Text>}
                  </View>
                  <Text style={[styles.itemTexto, item.feito && styles.itemFeito]}>{item.texto}</Text>
                  {item.exige_foto && (
                    <Text style={[styles.itemCamera, pedeFoto && { color: cores.azul }]} accessibilityElementsHidden>
                      {pedeFoto ? '📷 foto' : 'foto ✓'}
                    </Text>
                  )}
                </Pressable>
              );
            })}
            {podeMexer && os.situacao === 'aberta' && <Text style={styles.ajuda}>Faça o check-in para marcar os itens.</Text>}
          </Secao>
        )}

        {(podeFotografar || os.fotos.length > 0) && (
          <Secao titulo="Fotos" extra={os.fotos.length ? String(os.fotos.length) : undefined}>
            {os.fotos.length > 0 && (
              <View style={styles.fotos}>
                {os.fotos.map(f => (
                  <View key={f.id} style={{ gap: espaco[1] }}>
                    <Image source={{ uri: urlAbsoluta(f.url) }} style={styles.foto} accessibilityLabel={f.legenda} />
                    <Text style={styles.legenda} numberOfLines={1}>{f.legenda}</Text>
                  </View>
                ))}
              </View>
            )}
            {podeFotografar && (
              <View style={styles.dupla}>
                {(['Antes', 'Depois'] as const).map(m => (
                  <View key={m} style={{ flex: 1 }}>
                    <Botao tipo="secundario" rotulo={`Foto ${m.toLowerCase()}`}
                      carregando={ocupado === `foto-${m}`} desativado={!!ocupado} onPress={() => tirarFoto(m)} />
                  </View>
                ))}
              </View>
            )}
          </Secao>
        )}

        {((podeMexer && (os.situacao === 'aberta' || os.situacao === 'andamento' || os.situacao === 'pausada' || os.situacao === 'concluida'))
          || (os.audios ?? []).length > 0) && (
          <Secao titulo="Áudios" extra={(os.audios ?? []).length ? String(os.audios!.length) : undefined}>
            {(os.audios ?? []).length === 0 && (
              <Text style={styles.ajuda}>Explique o que viu ou deixe um recado ao escritório em vez de digitar (até 2 minutos).</Text>
            )}
            {(os.audios ?? []).map(a => <TocarAudio key={a.id} audio={a} />)}
            {podeMexer && os.situacao !== 'cancelada' && os.situacao !== 'solicitada' && (
              <GravarAudio desativado={!!ocupado} onErro={setErro}
                onGravado={(arquivo, duracao) => agir('audio', () => anexarAudio(os.id, arquivo, duracao))} />
            )}
          </Secao>
        )}

        {os.situacao === 'concluida' && (
          <>
            {!!os.relato && <Secao titulo="Relato do técnico"><Text style={styles.descricao}>{os.relato}</Text></Secao>}
            {os.assinatura && (
              <Secao titulo="Assinatura do cliente" extra={os.assinatura.nome}>
                <VerAssinatura traco={os.assinatura.traco} />
              </Secao>
            )}
          </>
        )}

        {((podeMexer && os.situacao !== 'cancelada') || mensagens.length > 0) && (
          <Secao titulo="Conversa com o escritório" extra={mensagens.length ? String(mensagens.length) : undefined}>
            {mensagens.length === 0 && <Text style={styles.ajuda}>Precisa de algo do escritório? Escreva aqui. Sem sinal, a mensagem espera e sobe depois.</Text>}
            {mensagens.map(m => (
              <View key={m.id} style={[styles.balao, m.autor === 'tecnico' ? styles.balaoMeu : styles.balaoDeles]}>
                <Text style={styles.legendaBalao}>{m.autor === 'tecnico' && podeMexer ? 'Você' : m.nome} · {quando(m.em)}{m.id < 0 ? ' · no celular' : ''}</Text>
                <Text style={styles.descricao}>{m.texto}</Text>
              </View>
            ))}
            {podeMexer && os.situacao !== 'cancelada' && (
              <View style={{ gap: espaco[2] }}>
                <Campo rotulo="Mensagem" value={mensagem} onChangeText={setMensagem} multiline maxLength={2000}
                  placeholder="Ex.: a portaria não libera a entrada" />
                <Botao tipo="secundario" rotulo="Enviar" carregando={ocupado === 'mensagem'} desativado={!mensagem.trim() || !!ocupado}
                  onPress={() => agir('mensagem', async () => { const nova = await mandarMensagem(os.id, mensagem.trim()); setMensagem(''); return nova; })} />
              </View>
            )}
          </Secao>
        )}

        {podeMexer && emAtendimento && (
          <View style={{ gap: espaco[3] }}>
            {falta.length > 0 && <Aviso tipo="info" texto={`Para concluir falta: ${falta.join(' e ')}.`} />}
            <Botao rotulo="Concluir OS" desativado={falta.length > 0 || !!ocupado}
              onPress={() => router.push({ pathname: '/os/[id]/concluir', params: { id: String(os.id) } })} />
            <Botao tipo="secundario" rotulo="Pausar" carregando={ocupado === 'pausar'} desativado={!!ocupado}
              onPress={() => agir('pausar', () => pausar(os.id))} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  conteudo: { paddingHorizontal: componentes.tela.margem, gap: espaco[4], width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  titulo: { ...fontes.nome, fontSize: corpo.titulo, color: c.texto },
  linha: { gap: espaco[0.5] },
  rotulo: { ...fontes.textoForte, fontSize: corpo.micro, color: c.textoSuave, textTransform: 'uppercase', letterSpacing: 0.6 },
  valor: { ...fontes.texto, fontSize: corpo.base, color: c.texto },
  descricao: { ...fontes.texto, fontSize: corpo.base, color: c.texto, lineHeight: 22 },
  ajuda: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
  secaoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  extra: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave },
  item: { flexDirection: 'row', alignItems: 'center', gap: espaco[3], minHeight: componentes.alvoDeToque },
  caixa: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: c.textoSuave, alignItems: 'center', justifyContent: 'center' },
  marca: { color: c.sobreAzul, ...fontes.nome, fontSize: corpo.legenda, lineHeight: 18 },
  itemTexto: { flex: 1, ...fontes.texto, fontSize: corpo.base, color: c.texto },
  itemFeito: { color: c.textoSuave, textDecorationLine: 'line-through' },
  itemCamera: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco[2] },
  foto: { width: 96, height: 96, borderRadius: raio.pequeno, backgroundColor: c.superficieForte },
  legenda: { width: 96, ...fontes.texto, fontSize: corpo.micro, color: c.textoSuave },
  dupla: { flexDirection: 'row', gap: espaco[2] },
  balao: { borderRadius: raio.pequeno, paddingHorizontal: espaco[3], paddingVertical: espaco[2], gap: espaco[0.5], maxWidth: '88%' },
  balaoMeu: { alignSelf: 'flex-end', backgroundColor: c.azulSuave },
  balaoDeles: { alignSelf: 'flex-start', backgroundColor: c.superficieForte },
  legendaBalao: { ...fontes.textoForte, fontSize: corpo.micro, color: c.textoSuave },
});
