import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { BarraCarregando } from '@/components/efeitos';
import { Botao, formatarData, LinhaInfo, Mensagem, Secao } from '@/components/formulario';
import { Grupo, Linha } from '@/components/lista';
import { estadoDaPorta, PainelDePortas, resumoDasPortas, ROTULO_DA_PORTA } from '@/components/portas';
import { Cabecalho } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { ehAdministrador } from '@/lib/acesso';
import { porCriacao } from '@/lib/agrupar';
import { api, ApiError } from '@/lib/api';
import { componentes, corpo, entrelinha, espaco, fontes, vidro, type Paleta } from '@/lib/tema';
import type { Camera, Poste } from '@/lib/types';


/** Um poste: o painel de portas grande, a lista das câmeras e os dados do poste. */
export default function PainelDoPosteScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);
  const { id } = useLocalSearchParams<{ id: string }>();
  const posteId = Number(id);
  const admin = ehAdministrador(usuario?.role);

  const [poste, setPoste] = useState<Poste | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [p, c] = await Promise.all([
        api<Poste>(`/postes/${posteId}`),
        api<Camera[]>(`/cameras/por-poste/${posteId}`),
      ]);
      setPoste(p);
      setCameras([...c].sort(porCriacao));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Sem conexão com o servidor. Puxe a tela para tentar de novo.');
    }
  }, [posteId]);

  useFocusEffect(useCallback(() => {
    if (!Number.isInteger(posteId)) {
      setErro('Poste inválido.');
      setCarregando(false);
      return;
    }
    carregar().finally(() => setCarregando(false));
  }, [carregar, posteId]));

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }, [carregar]);

  const abrirCamera = (cameraId: number) => router.push({ pathname: '/camera/[id]', params: { id: String(cameraId) } });
  const estados = cameras.map(c => estadoDaPorta(c));

  return (
    <View style={styles.tela}>
      <Cabecalho titulo={poste?.nome ?? 'Poste'} />
      <BarraCarregando ativa={carregando} />
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.azul} />}
      >
        {erro && <Mensagem texto={erro} tom="erro" />}

        {poste && (
          <>
            <View style={styles.painel}>
              {poste.condominio_nome && <Text style={styles.condominio}>{poste.condominio_nome}</Text>}
              <PainelDePortas cameras={cameras} grande onPressPorta={abrirCamera} rotulo={poste.nome} />
              <Text style={styles.resumo}>{cameras.length ? resumoDasPortas(estados) : 'Nenhuma câmera neste poste'}</Text>
            </View>

            {cameras.length > 0 && (
              <Grupo>
                {cameras.map((c, i) => (
                  <Linha
                    key={c.id}
                    estado={estados[i]}
                    numero={i + 1}
                    titulo={c.nome}
                    detalhe={`${ROTULO_DA_PORTA[estados[i]]} · ${c.tipo_conexao === 'RTMP_ISOLADA' ? 'envia o vídeo' : `gravador, canal ${c.canal ?? '?'}`}`}
                    onPress={() => abrirCamera(c.id)}
                    ultima={i === cameras.length - 1}
                  />
                ))}
              </Grupo>
            )}

            {admin && (
              <View style={styles.acoes}>
                <Botao
                  titulo="Adicionar câmeras neste poste"
                  onPress={() => router.push({
                    pathname: '/instalar/[id]',
                    params: {
                      id: String(poste.condominio_id), nome: poste.condominio_nome ?? 'Condomínio',
                      passo: '3', posteId: String(poste.id), posteNome: poste.nome,
                    },
                  })}
                />
                <Botao
                  titulo="Editar este poste"
                  variante="secundario"
                  onPress={() => router.push({ pathname: '/admin/poste', params: { condominioId: String(poste.condominio_id), id: String(poste.id) } })}
                />
              </View>
            )}

            <Secao titulo="Sobre este poste">
              <View>
                <LinhaInfo rotulo="Situação" valor={poste.ativo ? 'Ativo' : 'Desativado'} />
                <LinhaInfo rotulo="Instalado em" valor={formatarData(poste.criado_em)} />
                <LinhaInfo rotulo="Última alteração" valor={formatarData(poste.atualizado_em)} />
                <LinhaInfo rotulo="Observação" valor={poste.observacao ?? 'Nenhuma'} />
              </View>
            </Secao>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center', padding: espaco[4], paddingBottom: espaco[12], gap: espaco[6] },
  painel: { ...vidro(c), borderRadius: componentes.cartao.raio, padding: espaco[4], gap: espaco[3] },
  condominio: { ...fontes.textoForte, fontSize: corpo.legenda, color: c.textoSuave },
  resumo: { ...fontes.texto, fontSize: corpo.base, lineHeight: entrelinha.base, color: c.texto },
  acoes: { gap: espaco[3] },
});
