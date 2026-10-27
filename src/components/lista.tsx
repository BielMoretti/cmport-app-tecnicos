import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlifoAbrir } from '@/components/arte';
import { Toque } from '@/components/efeitos';
import { estadoDaPorta, PainelDePortas, Porta, resumoDasPortas, type EstadoDaPorta } from '@/components/portas';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { componentes, corpo, entrelinha, espaco, fontes, vidro, type Paleta } from '@/lib/tema';
import type { Camera } from '@/lib/types';

/**
 * Lista agrupada: uma superfície com linhas separadas por fio fino (o padrão de lista do
 * Android e do iPhone). Cada linha é um alvo de toque grande.
 */
export function Grupo({ children }: { children: ReactNode }) {
  const styles = useEstilos(criarEstilos);
  return <View style={styles.grupo}>{children}</View>;
}

/**
 * Uma linha da lista. À esquerda, a porta da câmera (o estado dela) ou outro ícone; no meio,
 * título e detalhe; à direita, uma ação ou a seta de abrir.
 */
export function Linha({
  titulo, detalhe, abaixo, estado, numero, esquerda, direita, onPress, rotulo, ultima = false,
}: {
  titulo: string;
  detalhe?: string;
  /** algo desenhado embaixo do título (ex.: o painel de portas de um poste) */
  abaixo?: ReactNode;
  estado?: EstadoDaPorta;
  numero?: number;
  esquerda?: ReactNode;
  direita?: ReactNode;
  onPress?: () => void;
  rotulo?: string;
  ultima?: boolean;
}) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const corpoDaLinha = (
    <View style={[styles.linha, !ultima && styles.linhaComFio]}>
      {estado ? <Porta numero={numero ?? 0} estado={estado} /> : esquerda}
      <View style={styles.textos}>
        <Text style={styles.titulo} numberOfLines={2}>{titulo}</Text>
        {detalhe ? <Text style={styles.detalhe} numberOfLines={2}>{detalhe}</Text> : null}
        {abaixo ? <View style={styles.abaixo}>{abaixo}</View> : null}
      </View>
      {direita ?? (onPress ? <GlifoAbrir cor={cores.textoSuave} tamanho={componentes.glifo} /> : null)}
    </View>
  );
  if (!onPress) return corpoDaLinha;
  return (
    <Toque onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo ?? (detalhe ? `${titulo}. ${detalhe}` : titulo)}>
      {corpoDaLinha}
    </Toque>
  );
}

/**
 * Um poste na lista: o nome (toque abre o poste) e, embaixo, as portas (toque abre a câmera).
 * São dois alvos separados, nunca um botão dentro do outro.
 */
export function LinhaDePoste({
  nome, cameras, onAbrir, onAbrirCamera, ultima = false,
}: {
  nome: string;
  cameras: Pick<Camera, 'id' | 'nome' | 'online' | 'ativo' | 'criado_em'>[];
  onAbrir: () => void;
  onAbrirCamera: (id: number) => void;
  ultima?: boolean;
}) {
  const styles = useEstilos(criarEstilos);
  const { cores } = useTema();
  const estados = cameras.map(c => estadoDaPorta(c));
  const resumo = cameras.length ? resumoDasPortas(estados) : 'nenhuma câmera';
  return (
    <View style={[styles.poste, !ultima && styles.linhaComFio]}>
      <Toque onPress={onAbrir} accessibilityRole="button" accessibilityLabel={`Abrir ${nome}: ${resumo}`}>
        <View style={styles.posteCabeca}>
          <View style={styles.textos}>
            <Text style={styles.titulo} numberOfLines={2}>{nome}</Text>
            <Text style={styles.detalhe} numberOfLines={1}>{resumo}</Text>
          </View>
          <GlifoAbrir cor={cores.textoSuave} tamanho={componentes.glifo} />
        </View>
      </Toque>
      {cameras.length > 0 && <PainelDePortas cameras={cameras} onPressPorta={onAbrirCamera} rotulo={nome} />}
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  poste: { paddingHorizontal: espaco[4], paddingTop: espaco[1], paddingBottom: espaco[4], gap: espaco[2], backgroundColor: c.superficie },
  posteCabeca: { flexDirection: 'row', alignItems: 'center', gap: espaco[3], minHeight: componentes.alvoDeToque + espaco[2] },
  grupo: { ...vidro(c), borderRadius: componentes.cartao.raio, overflow: 'hidden' },
  linha: {
    flexDirection: 'row', alignItems: 'center', gap: espaco[3], minHeight: componentes.linha.alturaMin,
    paddingHorizontal: espaco[4], paddingVertical: espaco[3], backgroundColor: c.superficie,
  },
  linhaComFio: { borderBottomWidth: 1, borderBottomColor: c.linha },
  textos: { flex: 1, gap: espaco[0.5] },
  titulo: { ...fontes.textoForte, fontSize: corpo.nome, lineHeight: entrelinha.base, color: c.texto },
  detalhe: { ...fontes.texto, fontSize: corpo.pequeno, lineHeight: entrelinha.micro + espaco[1], color: c.textoSuave },
  abaixo: { marginTop: espaco[2], alignItems: 'flex-start' },
});
