/** Faixa da fila sem internet: o que espera sinal, o que está subindo e o que o servidor recusou. */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useEstilos, useTema } from '@/contexts/TemaContext';
import { descartar, tentarDeNovo, useFila, type ItemDaFila } from '@/lib/os/fila';
import type { Acao } from '@/lib/os/regras';
import { corpo, espaco, fontes, raio, type Paleta } from '@/lib/tema';

// o que foi recusado, já concordando ("O check-in não foi aceito", "A foto não foi aceita")
const RECUSADA: Record<Acao['tipo'], string> = {
  checkin: 'O check-in não foi aceito', pausar: 'A pausa não foi aceita', retomar: 'A retomada não foi aceita',
  item: 'O item do checklist não foi aceito', foto: 'A foto não foi aceita', concluir: 'A conclusão não foi aceita',
  mensagem: 'A mensagem não foi aceita', audio: 'O áudio não foi aceito',
};

function plural(n: number) {
  return n === 1 ? '1 ação' : `${n} ações`;
}

/** `osId`: só o que é desta OS (tela da OS); sem ele, a fila toda (lista). */
export default function AvisoDaFila({ osId }: { osId?: number }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const { itens, enviando, semSinal, semServidor } = useFila();
  const daqui = osId === undefined ? itens : itens.filter(i => i.acao.os === osId);
  if (!daqui.length) return null;
  const recusada: ItemDaFila | undefined = daqui.find(i => i.erro);

  if (recusada) {
    return (
      <View style={[styles.faixa, { backgroundColor: cores.erroSuave }]} accessibilityRole="alert">
        <Text style={[styles.texto, { color: cores.erro }]}>
          {RECUSADA[recusada.acao.tipo]}: {recusada.erro}
        </Text>
        <View style={styles.botoes}>
          <Pressable onPress={() => { void tentarDeNovo(); }} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.botao, { color: cores.erro }]}>Tentar de novo</Text>
          </Pressable>
          <Pressable onPress={() => { void descartar(recusada.id); }} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.botao, { color: cores.textoSuave }]}>Descartar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const guardadas = `${plural(daqui.length)} ${daqui.length === 1 ? 'guardada' : 'guardadas'} no celular`;
  const texto = enviando
    ? `Enviando ${plural(daqui.length)}…`
    : semSinal
      ? `Sem sinal: ${guardadas}. Sobem sozinhas quando o sinal voltar.`
      : semServidor
        ? `O servidor não respondeu: ${guardadas}. O app tenta de novo sozinho.`
        : `${plural(daqui.length)} esperando para enviar.`;
  return (
    <View style={[styles.faixa, { backgroundColor: cores.andamento.fundo }]} accessibilityLiveRegion="polite">
      <Text style={[styles.texto, { color: cores.andamento.texto }]}>{texto}</Text>
      {!enviando && (
        <View style={styles.botoes}>
          <Pressable onPress={() => { void tentarDeNovo(); }} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.botao, { color: cores.andamento.texto }]}>Enviar agora</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Marquinha "aguardando envio" para o cartão da OS. */
export function MarcaPendente({ quantas }: { quantas: number }) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  if (!quantas) return null;
  return <Text style={[styles.marca, { color: cores.andamento.texto }]}>Aguardando envio ({quantas})</Text>;
}

const criarEstilos = (_c: Paleta) => StyleSheet.create({
  faixa: { borderRadius: raio.medio, padding: espaco[3], gap: espaco[2] },
  texto: { ...fontes.textoForte, fontSize: corpo.pequeno, lineHeight: 19 },
  botoes: { flexDirection: 'row', gap: espaco[5] },
  botao: { ...fontes.nome, fontSize: corpo.pequeno },
  marca: { ...fontes.textoForte, fontSize: corpo.micro },
});
