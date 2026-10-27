import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { GlifoPulso } from '@/components/arte';
import { Campo, Mensagem } from '@/components/formulario';
import { Grupo, Linha } from '@/components/lista';
import { Passos } from '@/components/passos';
import { Bloco, Esqueleto, IconeCaixa, TopoDaAba } from '@/components/ui';
import { useEstilos, useTema } from '@/contexts/TemaContext';
import { api, ApiError } from '@/lib/api';
import { lerRecentes, marcarRecente, type Recente } from '@/lib/recentes';
import { componentes, espaco, type Paleta } from '@/lib/tema';
import type { Camera, Condominio, Poste } from '@/lib/types';

interface LinhaDoCondominio extends Condominio {
  postes: number;
  cameras: number;
}

// com a lista inteira (centenas de condomínios) a tela fica pesada; mostra os primeiros e pede busca
const MAX_VISIVEIS = 30;

const resumoDe = (l: { postes: number; cameras: number }) => (l.postes + l.cameras === 0
  ? 'Nada instalado ainda'
  : `${l.postes} ${l.postes === 1 ? 'poste' : 'postes'} · ${l.cameras} ${l.cameras === 1 ? 'câmera' : 'câmeras'}`);

/**
 * Instalar, passo 1: escolher o condomínio. Os recentes vêm primeiro; a busca acha os outros.
 * Os passos seguintes (poste, câmeras, endereços) ficam em app/instalar/[id].tsx.
 */
export default function InstalarScreen() {
  const router = useRouter();
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);
  const [linhas, setLinhas] = useState<LinhaDoCondominio[]>([]);
  const [recentes, setRecentes] = useState<Recente[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    lerRecentes().then(setRecentes).catch(() => {});
    try {
      const [condominios, postes, cameras] = await Promise.all([
        api<Condominio[]>('/condominios?tipo=CONDOMINIO&ativo=true&limit=700'),
        api<Poste[]>('/postes'),
        api<Camera[]>('/cameras'),
      ]);
      const conta = new Map<number, { postes: number; cameras: number }>();
      const de = (id: number) => conta.get(id) ?? { postes: 0, cameras: 0 };
      for (const p of postes) conta.set(p.condominio_id, { ...de(p.condominio_id), postes: de(p.condominio_id).postes + 1 });
      for (const c of cameras) conta.set(c.condominio_id, { ...de(c.condominio_id), cameras: de(c.condominio_id).cameras + 1 });
      setLinhas(
        condominios
          .map(c => ({ ...c, ...de(c.id) }))
          // quem já tem algo instalado primeiro; depois por nome
          .sort((a, b) => Number(b.postes + b.cameras > 0) - Number(a.postes + a.cameras > 0) || a.nome.localeCompare(b.nome)),
      );
      setErro(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Sem conexão com o servidor. Puxe a tela para tentar de novo.');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    carregar().finally(() => setCarregando(false));
  }, [carregar]));

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }, [carregar]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toUpperCase();
    return termo ? linhas.filter(l => l.nome.toUpperCase().includes(termo)) : linhas;
  }, [linhas, busca]);

  const abrir = (c: { id: number; nome: string }) => {
    void marcarRecente({ id: c.id, nome: c.nome });
    router.push({ pathname: '/instalar/[id]', params: { id: String(c.id), nome: c.nome } });
  };

  const recentesComContagem = recentes.map(r => linhas.find(l => l.id === r.id) ?? { ...r, postes: -1, cameras: -1 });
  const mostrarRecentes = !busca.trim() && recentes.length > 0;

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.azul} />}
    >
      <TopoDaAba titulo="Instalar" />

      <View style={styles.corpo}>
        <Passos atual={1} />
        <Campo rotulo="Condomínio" placeholder="Buscar pelo nome" autoCorrect={false} value={busca} onChangeText={setBusca} returnKeyType="search" />
        {erro && <Mensagem texto={erro} tom="erro" />}

        {mostrarRecentes && (
          <Bloco titulo="Recentes">
            <Grupo>
              {recentesComContagem.map((l, i) => (
                <Linha
                  key={l.id}
                  titulo={l.nome}
                  detalhe={l.postes < 0 ? undefined : resumoDe(l)}
                  onPress={() => abrir(l)}
                  ultima={i === recentesComContagem.length - 1}
                />
              ))}
            </Grupo>
          </Bloco>
        )}

        <Bloco titulo={busca.trim() ? 'Resultado' : 'Todos os condomínios'}>
          {carregando ? (
            <Esqueleto altura={componentes.linha.alturaMin * 4} />
          ) : filtradas.length === 0 && !erro ? (
            <Mensagem texto={busca.trim() ? `Nenhum condomínio com "${busca.trim()}" no nome.` : 'Nenhum condomínio ativo no sistema.'} />
          ) : (
            <Grupo>
              {filtradas.slice(0, MAX_VISIVEIS).map((l, i, lista) => (
                <Linha key={l.id} titulo={l.nome} detalhe={resumoDe(l)} onPress={() => abrir(l)} ultima={i === lista.length - 1} />
              ))}
            </Grupo>
          )}
          {filtradas.length > MAX_VISIVEIS && (
            <Mensagem texto={`Mostrando ${MAX_VISIVEIS} de ${filtradas.length}. Use a busca para achar os outros.`} />
          )}
        </Bloco>

        <Bloco titulo="Ferramentas">
          <Grupo>
            <Linha
              esquerda={<IconeCaixa><GlifoPulso cor={cores.azul} tamanho={componentes.iconeCaixa.glifo} /></IconeCaixa>}
              titulo="Diagnóstico das câmeras"
              detalhe="Conexão, qualidade do vídeo e espaço de gravação"
              onPress={() => router.push('/admin/diagnostico')}
              ultima
            />
          </Grupo>
        </Bloco>
      </View>
    </ScrollView>
  );
}

const criarEstilos = (_c: Paleta) => StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { paddingBottom: componentes.abas.reserva, width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center' },
  corpo: { paddingHorizontal: espaco[4], gap: espaco[6] },
});
