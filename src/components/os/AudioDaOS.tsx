/**
 * Áudio na OS: gravar (até 2 minutos, só enquanto o técnico segura a tela aberta e tocou em gravar)
 * e tocar os que já estão na OS. O microfone só liga no toque — nada fica ouvindo em segundo plano.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus,
  useAudioRecorder, useAudioRecorderState,
} from 'expo-audio';

import { Botao } from '@/components/os/ui';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { urlAbsoluta } from '@/lib/config';
import { quando } from '@/lib/os/ordens';
import { corpo, espaco, fontes, raio, type Paleta } from '@/lib/tema';
import type { AudioDaOS as Audio } from '@/lib/os/types';

const MAXIMO_MS = 120_000;
const minutos = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Um áudio da OS com o botão de tocar/pausar. */
export function TocarAudio({ audio }: { audio: Audio }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const player = useAudioPlayer(urlAbsoluta(audio.url));
  const estado = useAudioPlayerStatus(player);
  const tocando = estado.playing;
  return (
    <View style={styles.audio}>
      <Pressable accessibilityRole="button" accessibilityLabel={tocando ? 'Pausar o áudio' : 'Tocar o áudio'}
        onPress={() => { if (tocando) player.pause(); else { if (estado.didJustFinish || estado.currentTime >= estado.duration) player.seekTo(0); player.play(); } }}
        style={[styles.tocar, { backgroundColor: cores.azul }]}>
        <Text style={styles.tocarTexto}>{tocando ? '❚❚' : '▶'}</Text>
      </Pressable>
      <View style={{ flex: 1, gap: espaco[0.5] }}>
        <Text style={styles.nome}>{audio.nome}{audio.id < 0 ? ' · no celular' : ''}</Text>
        <Text style={styles.legenda}>
          {quando(audio.em)}{audio.duracao_s != null ? ` · ${minutos(audio.duracao_s)}` : ''}
          {tocando ? ` · ${minutos(estado.currentTime)}` : ''}
        </Text>
      </View>
    </View>
  );
}

/** Gravar um áudio e mandar para a OS (sem sinal, entra na fila como a foto). */
export function GravarAudio({ desativado, onGravado, onErro }: {
  desativado: boolean;
  onGravado: (arquivo: { uri: string; nome: string; tipo: string }, duracaoS: number) => Promise<void>;
  onErro: (texto: string) => void;
}) {
  const styles = useEstilos(criarEstilos);
  const gravador = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estado = useAudioRecorderState(gravador);
  const [enviando, setEnviando] = useState(false);
  const parando = useRef(false);
  const limite = useRef<ReturnType<typeof setTimeout> | null>(null);

  // saiu da tela gravando: o temporizador do limite não fica solto
  useEffect(() => () => { if (limite.current) clearTimeout(limite.current); }, []);

  const comecar = async () => {
    const permissao = await requestRecordingPermissionsAsync();
    if (!permissao.granted) { onErro('Sem permissão para o microfone. Libere nas configurações do celular.'); return; }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await gravador.prepareToRecordAsync();
    gravador.record();
    // passou de 2 minutos: para e manda sozinho
    limite.current = setTimeout(() => { void parar(true); }, MAXIMO_MS);
  };

  const parar = async (enviar: boolean) => {
    if (parando.current) return;
    parando.current = true;
    if (limite.current) { clearTimeout(limite.current); limite.current = null; }
    const duracao = Math.round(gravador.getStatus().durationMillis / 1000);
    try {
      await gravador.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = gravador.uri;
      if (enviar && uri) {
        setEnviando(true);
        const web = Platform.OS === 'web';
        await onGravado({ uri, nome: web ? 'audio.webm' : 'audio.m4a', tipo: web ? 'audio/webm' : 'audio/mp4' }, duracao);
      }
    } catch {
      onErro('Não deu para gravar o áudio. Tente de novo.');
    } finally {
      setEnviando(false);
      parando.current = false;
    }
  };

  if (!estado.isRecording) {
    return <Botao tipo="secundario" rotulo="Gravar áudio" carregando={enviando} desativado={desativado || enviando} onPress={() => { void comecar(); }} />;
  }
  return (
    <View style={styles.gravando} accessibilityLiveRegion="polite">
      <Text style={styles.gravandoTexto}>● Gravando {minutos(estado.durationMillis / 1000)} · máx. 2:00</Text>
      <View style={styles.dupla}>
        <View style={{ flex: 1 }}><Botao tipo="secundario" rotulo="Descartar" onPress={() => { void parar(false); }} /></View>
        <View style={{ flex: 1 }}><Botao rotulo="Parar e enviar" onPress={() => { void parar(true); }} /></View>
      </View>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  audio: { flexDirection: 'row', alignItems: 'center', gap: espaco[3] },
  tocar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tocarTexto: { color: c.sobreAzul, ...fontes.textoForte, fontSize: corpo.base },
  nome: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.texto },
  legenda: { ...fontes.texto, fontSize: corpo.micro, color: c.textoSuave },
  gravando: { gap: espaco[2], padding: espaco[3], borderRadius: raio.pequeno, backgroundColor: c.superficieForte },
  gravandoTexto: { ...fontes.textoForte, fontSize: corpo.base, color: c.erro },
  dupla: { flexDirection: 'row', gap: espaco[2] },
});
