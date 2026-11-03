/**
 * Campo de assinatura: a pessoa desenha com o dedo. O traço sai como caminho SVG numa área
 * fixa de 320×160 (types.ts, Assinatura.traco), qualquer que seja o tamanho da tela.
 */
import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import Svg, { Path } from 'react-native-svg';

import { Botao } from '@/components/os/ui';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { marcarAqui } from '@/lib/os/local';
import type { Marcacao } from '@/lib/os/types';
import { corpo, espaco, fontes, raio, vidro, type Paleta } from '@/lib/tema';

export const AREA = { largura: 320, altura: 160 } as const;

/** Desenho só para mostrar (assinatura já feita). */
export function VerAssinatura({ traco }: { traco: string }) {
  const { cores } = useTema();
  return (
    <Svg width="100%" height={120} viewBox={`0 0 ${AREA.largura} ${AREA.altura}`}>
      <Path d={traco} stroke={cores.texto} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CampoDeAssinatura({ aoMudar, aoDesenhar, inicial = '', semApagar = false }: {
  /** esconde o link "Apagar": quem usa o campo já tem o próprio botão de limpar (a tela deitada) */
  semApagar?: boolean;
  /** o traço atual ('' = vazio) */
  aoMudar: (traco: string) => void;
  /** true enquanto o dedo está na área: quem tem rolagem trava a rolagem */
  aoDesenhar?: (desenhando: boolean) => void;
  /** traço recuperado do rascunho (o app tinha fechado no meio) */
  inicial?: string;
}) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const [traco, setTraco] = useState(inicial);
  const tamanho = useRef({ w: 1, h: 1 });

  const ponto = (e: GestureResponderEvent) => {
    const x = (e.nativeEvent.locationX / tamanho.current.w) * AREA.largura;
    const y = (e.nativeEvent.locationY / tamanho.current.h) * AREA.altura;
    return `${Math.round(x)} ${Math.round(y)}`;
  };
  const mudar = (novo: string) => { setTraco(novo); aoMudar(novo); };

  return (
    <View style={{ gap: espaco[2] }}>
      <View
        style={styles.area}
        onLayout={(e: LayoutChangeEvent) => { tamanho.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={e => { aoDesenhar?.(true); mudar(`${traco} M${ponto(e)}`.trim()); }}
        onResponderMove={e => mudar(`${traco} L${ponto(e)}`)}
        onResponderRelease={() => aoDesenhar?.(false)}
        onResponderTerminate={() => aoDesenhar?.(false)}
        accessibilityLabel="Área de assinatura. Desenhe a assinatura com o dedo."
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${AREA.largura} ${AREA.altura}`} pointerEvents="none">
          <Path d={traco || 'M0 0'} stroke={cores.texto} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        {!traco && <Text style={styles.dica} pointerEvents="none">Assine aqui</Text>}
        <View style={styles.linhaBase} pointerEvents="none" />
      </View>
      {!!traco && !semApagar && (
        <Pressable onPress={() => mudar('')} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-end' }}>
          <Text style={styles.limpar}>Apagar e assinar de novo</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Assinar com o celular deitado: abre uma tela cheia em paisagem com a área grande e devolve
 * o aparelho à rotação normal ao fechar. Mostra a assinatura já feita e o botão de refazer.
 */
export function AssinarDeitado({ traco, aoMudar, conferir }: {
  traco: string;
  /** a assinatura confirmada, com onde e quando foi feita */
  aoMudar: (traco: string, marca: Marcacao | null) => void;
  /** texto do porquê não pode assinar aqui (longe do condomínio); null = pode */
  conferir: (aqui: Marcacao) => string | null;
}) {
  const styles = useEstilos(criarEstilos);
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(traco);
  // trocar a chave refaz o campo em branco (o traço mora dentro dele)
  const [versaoCampo, setVersaoCampo] = useState(0);
  const [conferindo, setConferindo] = useState(false);
  const [recusa, setRecusa] = useState<string | null>(null);
  // Se o sistema não deitou a janela (trava de rotação, aparelho que ignora o pedido), o desenho vira 90° por conta
  // própria: a pessoa gira o celular e assina deitada do mesmo jeito. Janela já deitada = layout normal.
  const { width: larguraJanela, height: alturaJanela } = useWindowDimensions();
  const emPe = alturaJanela > larguraJanela;

  const abrir = () => {
    setRascunho(traco);
    setRecusa(null);
    setAberto(true);
    if (Platform.OS !== 'web') void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  };
  const sair = () => {
    setAberto(false);
    if (Platform.OS !== 'web') void ScreenOrientation.unlockAsync().catch(() => {});
  };
  // "Pronto": só vale se o celular está perto do condomínio agora
  const confirmar = async () => {
    setConferindo(true);
    setRecusa(null);
    const aqui = await marcarAqui();
    setConferindo(false);
    const motivo = conferir(aqui);
    if (motivo) { setRecusa(motivo); return; }
    aoMudar(rascunho, aqui);
    sair();
  };

  return (
    <View style={{ gap: espaco[2] }}>
      <Pressable onPress={abrir} accessibilityRole="button" accessibilityLabel="Abrir a assinatura em tela cheia" style={styles.previa}>
        {traco
          ? <VerAssinatura traco={traco} />
          : <Text style={styles.dica2}>Toque para assinar (a tela vira de lado)</Text>}
      </Pressable>
      {!!traco && (
        <Pressable onPress={abrir} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-end' }}>
          <Text style={styles.limpar}>Assinar de novo</Text>
        </Pressable>
      )}
      <Modal visible={aberto} animationType="fade" statusBarTranslucent supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
        onRequestClose={sair}>
        <View style={styles.tela}>
        <View style={emPe
          ? { position: 'absolute', width: alturaJanela, height: larguraJanela, left: (larguraJanela - alturaJanela) / 2, top: (alturaJanela - larguraJanela) / 2, transform: [{ rotate: '90deg' }] }
          : { flex: 1 }}>
        <View style={[styles.deitado, emPe && { paddingHorizontal: espaco[10], paddingVertical: espaco[6] }]}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            {/* a maior área 2:1 que cabe na altura da tela deitada */}
            <View style={{ height: '100%', aspectRatio: AREA.largura / AREA.altura, maxWidth: '100%' }}>
              <CampoDeAssinatura key={versaoCampo} aoMudar={setRascunho} inicial={rascunho} semApagar />
            </View>
          </View>
          {!!recusa && <Text style={styles.recusa}>{recusa}</Text>}
          {/* botões grandes e afastados da borda: o polegar de quem segura o celular deitado alcança fácil */}
          <View style={styles.rodape}>
            <View style={{ flex: 1 }}><Botao rotulo="Cancelar" tipo="secundario" onPress={sair} /></View>
            <View style={{ flex: 1 }}>
              <Botao rotulo="Limpar" tipo="secundario" onPress={() => { setRascunho(''); setRecusa(null); setVersaoCampo(v => v + 1); }} desativado={!rascunho || conferindo} />
            </View>
            <View style={{ flex: 2 }}>
              <Botao rotulo={conferindo ? 'Conferindo o local…' : 'Pronto'} onPress={() => void confirmar()} desativado={!rascunho || conferindo} />
            </View>
          </View>
        </View>
        </View>
        </View>
      </Modal>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  previa: { ...vidro(c, 'forte'), borderRadius: raio.medio, minHeight: 120, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  dica2: { ...fontes.texto, fontSize: corpo.base, color: c.textoSuave },
  tela: { flex: 1, backgroundColor: c.fundo },
  deitado: { flex: 1, backgroundColor: c.fundo, paddingHorizontal: espaco[8], paddingVertical: espaco[4], gap: espaco[3] },
  recusa: { ...fontes.texto, fontSize: corpo.pequeno, color: c.erro },
  rodape: { flexDirection: 'row', gap: espaco[4], alignItems: 'center' },
  area: { ...vidro(c, 'forte'), borderRadius: raio.medio, aspectRatio: AREA.largura / AREA.altura, width: '100%', overflow: 'hidden' },
  dica: { position: 'absolute', alignSelf: 'center', top: '40%', ...fontes.texto, fontSize: corpo.base, color: c.textoSuave },
  linhaBase: { position: 'absolute', left: '8%', right: '8%', bottom: '22%', height: 1, backgroundColor: c.linha },
  limpar: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.azul },
});
