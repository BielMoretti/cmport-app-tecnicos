import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import MarcaDagua from '@/components/MarcaDagua';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { urlAbsoluta } from '@/lib/config';
import { estadoDe, type Estado } from '@/lib/saude';
import { componentes, corpo, espaco, fontes, palco, raio, type Paleta } from '@/lib/tema';
import type { Camera } from '@/lib/types';

/** Peças de acompanhamento: a imagem de cada câmera, a faixa de estado e o medidor de espaço. */

const codigoDaCamera = (id: number) => `CAM ${String(id).padStart(2, '0')}`;

/**
 * A imagem mais recente da câmera (o servidor renova a cada ~30 s), com o código, o nome e o
 * estado por cima.
 */
export function Monitor({ camera, onPress, grande = false }: { camera: Camera; onPress: () => void; grande?: boolean }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const estado = estadoDe(camera);
  const foto = urlAbsoluta(camera.miniatura_url);
  const atencao = camera.saude === 'ATENCAO' || camera.saude === 'PROBLEMA';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${camera.nome}, ${estado === 'online' ? 'transmitindo' : estado === 'offline' ? 'fora do ar' : 'sem informação'}. Abrir.`}
      style={({ pressed }) => [styles.monitor, estado === 'offline' && styles.monitorOffline, pressed && styles.monitorPressionado]}
    >
      {foto ? (
        <>
          <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
          <MarcaDagua tamanho={grande ? 'grande' : 'pequena'} />
        </>
      ) : (
        <View style={styles.semSinal}>
          <Text style={styles.semSinalTexto}>{estado === 'offline' ? 'Sem sinal' : 'Sem imagem'}</Text>
        </View>
      )}
      <View style={styles.tarja}>
        <Text style={styles.codigo}>{codigoDaCamera(camera.id)}</Text>
        <Text style={styles.nomeNoMonitor} numberOfLines={1}>{camera.nome}</Text>
      </View>

      <View style={styles.selo}>
        <View style={[styles.ponto, { backgroundColor: estado === 'online' ? cores.estadoOnline : estado === 'offline' ? cores.estadoOffline : cores.estadoNeutro }]} />
        <Text style={styles.seloTexto}>{estado === 'online' ? 'No ar' : estado === 'offline' ? 'Fora' : 'Sem info'}</Text>
      </View>

      {atencao && (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>{camera.saude === 'PROBLEMA' ? 'Vídeo com problema' : 'Vídeo instável'}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Faixa de estado: a proporção de câmeras no ar, fora e sem informação.
 * Cada parte tem rótulo e número ao lado — a cor nunca é a única pista.
 */
export function FaixaDeEstado({ cameras }: { cameras: Camera[] }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const conta: Record<Estado, number> = { online: 0, offline: 0, desconhecido: 0 };
  for (const c of cameras) conta[estadoDe(c)] += 1;
  const partes: { estado: Estado; rotulo: string; cor: string }[] = [
    { estado: 'online', rotulo: 'No ar', cor: cores.estadoOnline },
    { estado: 'offline', rotulo: 'Fora do ar', cor: cores.estadoOffline },
    { estado: 'desconhecido', rotulo: 'Sem informação', cor: cores.estadoNeutro },
  ];
  if (cameras.length === 0) return null;

  return (
    <View
      style={styles.faixaBloco}
      accessibilityRole="image"
      accessibilityLabel={`De ${cameras.length} câmeras: ${conta.online} no ar, ${conta.offline} fora do ar, ${conta.desconhecido} sem informação.`}
    >
      <View style={styles.faixa}>
        {partes.filter(p => conta[p.estado] > 0).map(p => (
          <View key={p.estado} style={[styles.faixaParte, { flex: conta[p.estado], backgroundColor: p.cor }]} />
        ))}
      </View>
      <View style={styles.legenda}>
        {partes.map(p => (
          <View key={p.estado} style={styles.legendaItem}>
            <View style={[styles.ponto, { backgroundColor: p.cor }]} />
            <Text style={styles.legendaTexto}>{p.rotulo}</Text>
            <Text style={styles.legendaNumero}>{conta[p.estado]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Barra de uso (ex.: espaço de gravação): preenchido / total, com o valor escrito ao lado. */
export function Medidor({ fracao, rotulo }: { fracao: number; rotulo: string }) {
  const styles = useEstilos(criarEstilos);
  const f = Math.max(0, Math.min(1, fracao));
  return (
    <View style={styles.medidorBloco} accessibilityRole="progressbar" accessibilityLabel={rotulo} accessibilityValue={{ min: 0, max: 100, now: Math.round(f * 100) }}>
      <View style={styles.medidorTrilho}>
        <View style={[styles.medidorCheio, { width: `${Math.max(f * 100, 2)}%` }]} />
      </View>
      <Text style={styles.medidorRotulo}>{rotulo}</Text>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  monitor: {
    aspectRatio: 16 / 9, backgroundColor: palco.fundo, borderRadius: raio.medio, overflow: 'hidden',
    borderWidth: 1, borderColor: c.vidroBorda,
  },
  monitorOffline: { borderColor: c.estadoOffline, borderWidth: 2 },
  monitorPressionado: { borderColor: c.luz },
  semSinal: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: c.superficie },
  semSinalTexto: { ...fontes.textoForte, fontSize: corpo.pequeno, color: c.textoSuave },
  tarja: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: espaco[2],
    backgroundColor: palco.veu, paddingHorizontal: espaco[2], paddingVertical: espaco[1],
  },
  codigo: { ...fontes.mono, fontSize: corpo.micro, color: palco.texto, opacity: 0.75 },
  nomeNoMonitor: { flex: 1, ...fontes.textoForte, fontSize: corpo.pequeno, color: palco.texto },
  selo: {
    position: 'absolute', top: espaco[1.5], right: espaco[1.5], flexDirection: 'row', alignItems: 'center', gap: espaco[1],
    backgroundColor: palco.veu, borderRadius: raio.pequeno, paddingHorizontal: espaco[1.5], paddingVertical: espaco[0.5],
  },
  seloTexto: { ...fontes.textoForte, fontSize: corpo.micro, color: palco.texto },
  ponto: { width: componentes.selo.ponto, height: componentes.selo.ponto, borderRadius: componentes.selo.ponto / 2 },
  aviso: {
    position: 'absolute', top: espaco[1.5], left: espaco[1.5], backgroundColor: palco.veu, borderRadius: raio.pequeno,
    borderWidth: 1, borderColor: c.estadoEspera, paddingHorizontal: espaco[1.5], paddingVertical: espaco[0.5],
  },
  avisoTexto: { ...fontes.textoForte, fontSize: corpo.micro, color: palco.texto },

  faixaBloco: { gap: espaco[2] },
  // partes separadas por um vão da cor do fundo, pra não depender só da cor
  faixa: { flexDirection: 'row', height: componentes.faixaDeEstado.altura, gap: espaco[0.5] },
  faixaParte: { borderRadius: raio.pequeno },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', columnGap: espaco[4], rowGap: espaco[1] },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: espaco[1.5] },
  legendaTexto: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
  legendaNumero: { ...fontes.mono, fontSize: corpo.base, color: c.texto },

  medidorBloco: { gap: espaco[1] },
  medidorTrilho: { height: componentes.medidor.altura, borderRadius: raio.pequeno, backgroundColor: c.superficieForte, overflow: 'hidden' },
  medidorCheio: { height: '100%', borderRadius: raio.pequeno, backgroundColor: c.luz },
  medidorRotulo: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
});
