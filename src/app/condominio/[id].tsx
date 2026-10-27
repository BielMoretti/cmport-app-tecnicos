import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Botao, Mensagem } from '@/components/formulario';
import { Grupo, LinhaDePoste } from '@/components/lista';
import { LegendaDasPortas } from '@/components/portas';
import { Cabecalho, Esqueleto } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { ehAdministrador } from '@/lib/acesso';
import { postesDoCondominio } from '@/lib/agrupar';
import { api, ApiError } from '@/lib/api';
import { marcarRecente } from '@/lib/recentes';
import { componentes, espaco, type Paleta } from '@/lib/tema';
import type { Camera, Poste } from '@/lib/types';

/** Um condomínio: cada poste com o painel de portas dele. */
export default function CondominioScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const condominioId = Number(id);

  const [postes, setPostes] = useState<Poste[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [p, c] = await Promise.all([
        api<Poste[]>(`/postes?condominio_id=${condominioId}`),
        api<Camera[]>(`/cameras/por-condominio/${condominioId}`),
      ]);
      setPostes(p);
      setCameras(c);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Sem conexão com o servidor. Puxe a tela para tentar de novo.');
    }
  }, [condominioId]);

  useEffect(() => {
    if (!Number.isInteger(condominioId)) {
      setErro('Condomínio inválido.');
      setCarregando(false);
      return;
    }
    if (nome) void marcarRecente({ id: condominioId, nome });
    carregar().finally(() => setCarregando(false));
  }, [carregar, condominioId, nome]);

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }, [carregar]);

  const grupos = useMemo(() => postesDoCondominio(condominioId, postes, cameras), [condominioId, postes, cameras]);
  const abrirCamera = (cameraId: number) => router.push({ pathname: '/camera/[id]', params: { id: String(cameraId) } });

  return (
    <View style={styles.tela}>
      <Cabecalho titulo={nome ?? 'Condomínio'} />
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.azul} />}
      >
        {erro && <Mensagem texto={erro} tom="erro" />}

        {carregando ? (
          <Esqueleto altura={componentes.linha.alturaMin * 3} />
        ) : grupos.postes.length === 0 && grupos.avulsas.length === 0 && !erro ? (
          <Mensagem texto="Este condomínio ainda não tem poste nem câmera." />
        ) : (
          <>
            <LegendaDasPortas />
            <Grupo>
              {grupos.postes.map((l, i) => (
                <LinhaDePoste
                  key={l.poste.id}
                  nome={l.poste.ativo ? l.poste.nome : `${l.poste.nome} (desativado)`}
                  cameras={l.cameras}
                  onAbrir={() => router.push({ pathname: '/poste/[id]', params: { id: String(l.poste.id) } })}
                  onAbrirCamera={abrirCamera}
                  ultima={i === grupos.postes.length - 1 && grupos.avulsas.length === 0}
                />
              ))}
              {grupos.avulsas.length > 0 && (
                <LinhaDePoste
                  nome="Fora de poste"
                  cameras={grupos.avulsas}
                  onAbrir={() => abrirCamera(grupos.avulsas[0].id)}
                  onAbrirCamera={abrirCamera}
                  ultima
                />
              )}
            </Grupo>
          </>
        )}

        {ehAdministrador(usuario?.role) && Number.isInteger(condominioId) && (
          <View style={styles.acoes}>
            <Botao
              titulo="Instalar neste condomínio"
              onPress={() => router.push({ pathname: '/instalar/[id]', params: { id: String(condominioId), nome: nome ?? 'Condomínio' } })}
            />
            <Botao
              titulo="Administrar postes e câmeras"
              variante="secundario"
              onPress={() => router.push({ pathname: '/admin/condominio/[id]', params: { id: String(condominioId), nome: nome ?? 'Condomínio' } })}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const criarEstilos = (_c: Paleta) => StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center', padding: espaco[4], paddingBottom: espaco[12], gap: espaco[5] },
  acoes: { gap: espaco[3], marginTop: espaco[2] },
});
