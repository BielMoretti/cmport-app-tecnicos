import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Botao, Mensagem } from '@/components/formulario';
import { Grupo, Linha } from '@/components/lista';
import { Contagem, estadoDaPorta, PainelDePortas, resumoDasPortas } from '@/components/portas';
import { Bloco, Esqueleto, Pilula, TopoDaAba } from '@/components/ui';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { postesDoCondominio, recemCriada } from '@/lib/agrupar';
import { api, ApiError } from '@/lib/api';
import { useFavoritas } from '@/lib/favoritas';
import { lerRecentes, type Recente } from '@/lib/recentes';
import { estadoDe } from '@/lib/saude';
import { componentes, corpo, espaco, fontes, type Paleta } from '@/lib/tema';
import type { Camera, Poste } from '@/lib/types';

const INTERVALO_MS = 30_000;
const MAX_PENDENCIAS = 8;
const MAX_RECENTES = 3;

type Pendencia = { camera: Camera; tipo: 'fora' | 'esperando' | 'video' };

/**
 * Início: o que fazer agora. Primeiro as pendências (o que caiu, o que ainda espera vídeo, o
 * que transmite mal); depois os condomínios em que você mexeu por último, com o painel de
 * portas de cada poste. A lista completa fica na aba Câmeras.
 */
export default function InicioScreen() {
  const router = useRouter();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);

  const [postes, setPostes] = useState<Poste[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [recentes, setRecentes] = useState<Recente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    lerRecentes().then(setRecentes).catch(() => {});
    try {
      const [listaPostes, listaCameras] = await Promise.all([api<Poste[]>('/postes'), api<Camera[]>('/cameras')]);
      setPostes(listaPostes);
      setCameras(listaCameras);
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

  const abrirCamera = useCallback((id: number) => router.push({ pathname: '/camera/[id]', params: { id: String(id) } }), [router]);

  // número da porta de cada câmera no poste dela (o mesmo do painel)
  const numeroDaPorta = useMemo(() => {
    const mapa = new Map<number, number>();
    const porPoste = new Map<number | null, Camera[]>();
    for (const c of [...cameras].sort((a, b) => a.id - b.id)) porPoste.set(c.poste_id, [...(porPoste.get(c.poste_id) ?? []), c]);
    for (const lista of porPoste.values()) lista.forEach((c, i) => mapa.set(c.id, i + 1));
    return mapa;
  }, [cameras]);

  const ativas = cameras.filter(c => c.ativo);
  const noAr = ativas.filter(c => estadoDe(c) === 'online').length;
  const sabidas = ativas.filter(c => estadoDe(c) !== 'desconhecido').length;

  const pendencias = useMemo<Pendencia[]>(() => {
    const fora: Pendencia[] = [];
    const esperando: Pendencia[] = [];
    const video: Pendencia[] = [];
    for (const c of cameras) {
      if (!c.ativo) continue;
      const e = estadoDe(c);
      if (e === 'offline') (recemCriada(c) ? esperando : fora).push({ camera: c, tipo: recemCriada(c) ? 'esperando' : 'fora' });
      else if (e === 'online' && (c.saude === 'PROBLEMA' || c.saude === 'ATENCAO')) video.push({ camera: c, tipo: 'video' });
    }
    return [...fora, ...esperando, ...video];
  }, [cameras]);

  const recentesComPostes = recentes.slice(0, MAX_RECENTES).map(r => ({ recente: r, ...postesDoCondominio(r.id, postes, cameras) }));

  const { favoritas } = useFavoritas();
  const camerasFavoritas = favoritas.map(id => cameras.find(c => c.id === id)).filter((c): c is Camera => !!c);

  // a contagem é sobre as câmeras ativas cujo estado o servidor sabe; o resto vai escrito ao lado
  const semInfo = ativas.length - sabidas;
  const desativadas = cameras.length - ativas.length;
  const foraDaConta = [
    semInfo ? `${semInfo} sem informação` : '',
    desativadas ? `${desativadas} ${desativadas === 1 ? 'desativada' : 'desativadas'}` : '',
  ].filter(Boolean).join(' · ');
  const estadoGeral = carregando || cameras.length === 0 ? undefined
    : sabidas === 0 ? <Text style={styles.semEstado}>O servidor não informou o estado das câmeras</Text>
      : (
        <View style={styles.estadoGeral}>
          <Contagem ligadas={noAr} total={sabidas} />
          {foraDaConta ? <Text style={styles.semEstado}>{foraDaConta}</Text> : null}
        </View>
      );

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.azul} />}
    >
      <TopoDaAba titulo="Agora" abaixo={estadoGeral} />

      <View style={styles.corpo}>
        {erro && <Mensagem texto={erro} tom="erro" />}

        {carregando ? (
          <>
            <Esqueleto altura={componentes.linha.alturaMin * 3} />
            <Esqueleto altura={componentes.linha.alturaMin * 2} />
          </>
        ) : cameras.length === 0 && !erro ? (
          <View style={styles.vazio}>
            <Mensagem texto="Nenhuma câmera cadastrada ainda. Comece pela aba Instalar: escolha o condomínio, crie o poste e as câmeras." />
            <Botao titulo="Instalar câmeras" onPress={() => router.navigate('/instalar')} />
          </View>
        ) : (
          <>
            <Bloco
              titulo={pendencias.length ? 'Precisa de você' : 'Tudo certo'}
              acao={pendencias.length > MAX_PENDENCIAS ? `Ver todas (${pendencias.length})` : undefined}
              aoTocar={() => router.navigate('/cameras')}
            >
              <Grupo>
                {pendencias.length === 0 ? (
                  <Linha
                    titulo="Nenhuma pendência"
                    detalhe="Nenhuma câmera fora do ar, esperando vídeo ou com vídeo ruim."
                    ultima
                  />
                ) : pendencias.slice(0, MAX_PENDENCIAS).map((p, i, lista) => (
                  <Linha
                    key={p.camera.id}
                    estado={p.tipo === 'fora' ? 'fora' : p.tipo === 'esperando' ? 'aguardando' : 'transmitindo'}
                    numero={numeroDaPorta.get(p.camera.id)}
                    titulo={p.camera.nome}
                    detalhe={[p.camera.poste_nome, p.camera.condominio_nome].filter(Boolean).join(', ')}
                    abaixo={
                      p.tipo === 'fora' ? <Pilula texto="Fora do ar" tom="erro" />
                        : p.tipo === 'esperando' ? <Pilula texto="Aguardando vídeo" tom="espera" />
                          : <Pilula texto="Vídeo ruim" tom="espera" />
                    }
                    onPress={() => abrirCamera(p.camera.id)}
                    ultima={i === lista.length - 1}
                  />
                ))}
              </Grupo>
            </Bloco>

            {recentesComPostes.map(g => (
              <Bloco
                key={g.recente.id}
                titulo={g.recente.nome}
                acao="Instalar"
                aoTocar={() => router.push({ pathname: '/instalar/[id]', params: { id: String(g.recente.id), nome: g.recente.nome } })}
              >
                <Grupo>
                  {g.postes.length === 0 && g.avulsas.length === 0 ? (
                    <Linha titulo="Nada instalado ainda" detalhe="Toque em Instalar para criar o primeiro poste." ultima />
                  ) : (
                    <>
                      {g.postes.map((l, i) => (
                        <Linha
                          key={l.poste.id}
                          titulo={l.poste.nome}
                          abaixo={<PainelDePortas cameras={l.cameras} rotulo={l.poste.nome} />}
                          rotulo={`${l.poste.nome}: ${l.cameras.length ? resumoDasPortas(l.cameras.map(c => estadoDaPorta(c))) : 'nenhuma câmera'}`}
                          onPress={() => router.push({ pathname: '/poste/[id]', params: { id: String(l.poste.id) } })}
                          ultima={i === g.postes.length - 1 && g.avulsas.length === 0}
                        />
                      ))}
                      {g.avulsas.length > 0 && (
                        <Linha
                          titulo="Fora de poste"
                          abaixo={<PainelDePortas cameras={g.avulsas} rotulo="Fora de poste" />}
                          onPress={() => router.push({ pathname: '/condominio/[id]', params: { id: String(g.recente.id), nome: g.recente.nome } })}
                          ultima
                        />
                      )}
                    </>
                  )}
                </Grupo>
              </Bloco>
            ))}

            {camerasFavoritas.length > 0 && (
              <Bloco titulo="Favoritas">
                <Grupo>
                  {camerasFavoritas.map((c, i) => (
                    <Linha
                      key={c.id}
                      estado={estadoDaPorta(c)}
                      numero={numeroDaPorta.get(c.id)}
                      titulo={c.nome}
                      detalhe={c.condominio_nome ?? undefined}
                      onPress={() => abrirCamera(c.id)}
                      ultima={i === camerasFavoritas.length - 1}
                    />
                  ))}
                </Grupo>
              </Bloco>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { paddingBottom: componentes.abas.reserva, width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  corpo: { paddingHorizontal: espaco[4], gap: espaco[8] },
  vazio: { gap: espaco[4] },
  estadoGeral: { gap: espaco[0.5] },
  semEstado: { ...fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
});
