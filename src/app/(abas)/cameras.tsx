import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Monitor } from '@/components/central';
import { Campo, Mensagem, Opcoes, Segmentado } from '@/components/formulario';
import { Grupo, LinhaDePoste } from '@/components/lista';
import { LegendaDasPortas } from '@/components/portas';
import { Bloco, Esqueleto, TopoDaAba } from '@/components/ui';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { porCriacao, postesDoCondominio } from '@/lib/agrupar';
import { api, ApiError } from '@/lib/api';
import { estadoDe } from '@/lib/saude';
import { componentes, espaco, type Paleta } from '@/lib/tema';
import type { Camera, Poste } from '@/lib/types';

// o servidor renova o estado e a imagem de cada câmera a cada ~30 s
const INTERVALO_MS = 30_000;

type Vista = 'postes' | 'imagens';
type Filtro = 'todas' | 'fora' | 'semInfo';

/**
 * Câmeras: tudo o que está instalado. "Por poste" mostra cada condomínio com o painel de portas
 * de cada poste; "Imagens" mostra a última imagem de cada câmera.
 */
export default function CamerasScreen() {
  const router = useRouter();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);
  const { width } = useWindowDimensions();

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [vista, setVista] = useState<Vista>('postes');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [listaCameras, listaPostes] = await Promise.all([api<Camera[]>('/cameras'), api<Poste[]>('/postes')]);
      setCameras(listaCameras);
      setPostes(listaPostes);
      setErro(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Sem conexão com o servidor. Puxe a tela para tentar de novo.');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    carregar().finally(() => setCarregando(false));
    const t = setInterval(carregar, INTERVALO_MS);
    return () => clearInterval(t);
  }, [carregar]));

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }, [carregar]);

  const abrirCamera = (id: number) => router.push({ pathname: '/camera/[id]', params: { id: String(id) } });

  // filtro de estado e busca valem para as duas vistas
  const visiveis = useMemo(() => {
    const termo = busca.trim().toUpperCase();
    return cameras.filter(c => {
      if (filtro === 'fora' && !(c.ativo && estadoDe(c) === 'offline')) return false;
      if (filtro === 'semInfo' && estadoDe(c) !== 'desconhecido') return false;
      if (!termo) return true;
      return [c.nome, c.condominio_nome ?? '', c.poste_nome ?? ''].some(t => t.toUpperCase().includes(termo));
    });
  }, [cameras, filtro, busca]);

  const condominios = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const c of visiveis) if (!mapa.has(c.condominio_id)) mapa.set(c.condominio_id, c.condominio_nome ?? `Condomínio ${c.condominio_id}`);
    return [...mapa]
      .map(([id, nome]) => ({ id, nome, ...postesDoCondominio(id, postes, visiveis) }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [visiveis, postes]);

  const colunas = width >= 520 ? 2 : 1;
  const larguraUtil = Math.min(width, componentes.conteudo.larguraMaxima) - espaco[4] * 2;
  const larguraMonitor = (larguraUtil - espaco[3] * (colunas - 1)) / colunas;
  const foraDoAr = cameras.filter(c => c.ativo && estadoDe(c) === 'offline').length;

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.azul} />}
    >
      <TopoDaAba
        titulo="Câmeras"
        apoio={carregando ? undefined : `${cameras.length} ${cameras.length === 1 ? 'câmera instalada' : 'câmeras instaladas'}`}
      />

      <View style={styles.corpo}>
        <View style={styles.controles}>
          <Segmentado<Vista> rotulo="Ver" valor={vista} onChange={setVista} opcoes={[{ valor: 'postes', rotulo: 'Por poste' }, { valor: 'imagens', rotulo: 'Imagens' }]} />
          <Opcoes<Filtro>
            rotulo="Mostrar"
            semRotulo
            rolar
            valor={filtro}
            onChange={setFiltro}
            opcoes={[
              { valor: 'todas', rotulo: 'Todas' },
              { valor: 'fora', rotulo: foraDoAr ? `Fora do ar (${foraDoAr})` : 'Fora do ar' },
              { valor: 'semInfo', rotulo: 'Sem informação' },
            ]}
          />
          <Campo rotulo="Buscar" placeholder="Câmera, poste ou condomínio" autoCorrect={false} value={busca} onChangeText={setBusca} returnKeyType="search" />
        </View>

        {erro && <Mensagem texto={erro} tom="erro" />}

        {carregando ? (
          <Esqueleto altura={componentes.linha.alturaMin * 4} />
        ) : cameras.length === 0 && !erro ? (
          <Mensagem texto="Nenhuma câmera instalada ainda. Use a aba Instalar." />
        ) : visiveis.length === 0 ? (
          <Mensagem texto={filtro === 'fora' ? 'Nenhuma câmera fora do ar.' : 'Nenhuma câmera com esse filtro.'} />
        ) : vista === 'postes' ? (
          <>
            <LegendaDasPortas />
            {condominios.map(g => (
              <Bloco
                key={g.id}
                titulo={g.nome}
                acao="Abrir"
                aoTocar={() => router.push({ pathname: '/condominio/[id]', params: { id: String(g.id), nome: g.nome } })}
              >
                <Grupo>
                  {g.postes.filter(l => l.cameras.length > 0).map((l, i, lista) => (
                    <LinhaDePoste
                      key={l.poste.id}
                      nome={l.poste.nome}
                      cameras={l.cameras}
                      onAbrir={() => router.push({ pathname: '/poste/[id]', params: { id: String(l.poste.id) } })}
                      onAbrirCamera={abrirCamera}
                      ultima={i === lista.length - 1 && g.avulsas.length === 0}
                    />
                  ))}
                  {g.avulsas.length > 0 && (
                    <LinhaDePoste
                      nome="Fora de poste"
                      cameras={g.avulsas}
                      onAbrir={() => router.push({ pathname: '/condominio/[id]', params: { id: String(g.id), nome: g.nome } })}
                      onAbrirCamera={abrirCamera}
                      ultima
                    />
                  )}
                </Grupo>
              </Bloco>
            ))}
          </>
        ) : (
          <View style={styles.parede}>
            {[...visiveis].sort(porCriacao).map(c => (
              <View key={c.id} style={{ width: larguraMonitor }}>
                <Monitor camera={c} grande={colunas === 1} onPress={() => abrirCamera(c.id)} />
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const criarEstilos = (_c: Paleta) => StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { paddingBottom: componentes.abas.reserva, width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  corpo: { paddingHorizontal: espaco[4], gap: espaco[6] },
  controles: { gap: espaco[4] },
  parede: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco[3] },
});
