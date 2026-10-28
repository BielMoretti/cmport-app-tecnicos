import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aviso, Botao, Topo } from '@/components/os/ui';
import { useEstilos } from '@/contexts/TemaContext';
import { idDoQr } from '@/lib/os/locais';
import { componentes, corpo, espaco, fontes, raio, type Paleta } from '@/lib/tema';

/** Lê o QR da etiqueta colada no equipamento e abre o local. A câmera só fica ligada nesta tela. */
export default function LerQr() {
  const styles = useEstilos(criarEstilos);
  const router = useRouter();
  const margem = useSafeAreaInsets();
  const [permissao, pedir] = useCameraPermissions();
  const [erro, setErro] = useState<string | null>(null);
  const lido = useRef(false);

  return (
    <View style={{ flex: 1 }}>
      <Topo titulo="Ler QR do equipamento" />
      <View style={[styles.conteudo, { paddingBottom: margem.bottom + espaco[6] }]}>
        {!permissao?.granted ? (
          <View style={{ gap: espaco[3] }}>
            <Text style={styles.texto}>Para ler a etiqueta, o app precisa usar a câmera só nesta tela.</Text>
            <Botao rotulo="Liberar a câmera" onPress={() => { void pedir(); }} />
          </View>
        ) : (
          <View style={styles.moldura}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (lido.current) return;
                const id = idDoQr(data);
                if (id === null) { setErro('Esse QR não é uma etiqueta da CMPort.'); return; }
                lido.current = true;
                router.replace({ pathname: '/local/[id]', params: { id: String(id) } });
              }}
            />
          </View>
        )}
        <Text style={styles.ajuda}>Aponte para o QR da etiqueta CMPort colada no poste ou no equipamento.</Text>
        {erro && <Aviso texto={erro} />}
      </View>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  conteudo: { flex: 1, paddingHorizontal: componentes.tela.margem, gap: espaco[4], width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  moldura: { width: '100%', aspectRatio: 1, borderRadius: raio.grande, overflow: 'hidden', backgroundColor: '#000' },
  texto: { ...fontes.texto, fontSize: corpo.base, color: c.texto },
  ajuda: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
});
