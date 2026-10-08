import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarraCarregando } from '@/components/efeitos';
import { Botao, Campo, confirmar, Mensagem, Opcoes, Secao } from '@/components/formulario';
import SeletorDeAcessos, { camerasAlcancadas, type Acessos } from '@/components/SeletorDeAcessos';
import { Cabecalho, Progresso } from '@/components/ui';
import { useEstilos } from '@/contexts/TemaContext';
import { api, ApiError } from '@/lib/api';
import { componentes, corpo, entrelinha, espaco, fontes, type Paleta } from '@/lib/tema';
import type { Camera, Poste, Usuario } from '@/lib/types';

type Modo = 'acrescentar' | 'substituir';

/**
 * Liberar postes e câmeras para vários moradores de uma vez: marca-se quem, marca-se o
 * quê, e o app aplica um por um. "Acrescentar" soma ao que cada um já vê; "Substituir"
 * troca tudo pelo que foi marcado aqui.
 */
export default function AcessoEmGrupoScreen() {
  const styles = useEstilos(criarEstilos);
  const [moradores, setMoradores] = useState<Usuario[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [escolhidos, setEscolhidos] = useState<Set<number>>(new Set());
  const [busca, setBusca] = useState('');
  const [modo, setModo] = useState<Modo>('acrescentar');
  const [acessos, setAcessos] = useState<Acessos>({ postes: new Set(), cameras: new Set() });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [andamento, setAndamento] = useState<number | null>(null);
  const [feito, setFeito] = useState<{ certos: number; falhas: string[] } | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([api<Usuario[]>('/usuarios'), api<Poste[]>('/postes'), api<Camera[]>('/cameras')])
      .then(([u, p, c]) => {
        if (cancelado) return;
        setMoradores(u.filter(x => x.role === 'MORADOR' && x.ativo).sort((a, b) => a.nome.localeCompare(b.nome)));
        setPostes(p);
        setCameras(c);
      })
      .catch(e => { if (!cancelado) setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os moradores.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, []);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? moradores.filter(m => `${m.nome} ${m.email}`.toLowerCase().includes(termo)) : moradores;
  }, [moradores, busca]);

  const alternar = (id: number) => setEscolhidos(atual => {
    const novo = new Set(atual);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    return novo;
  });
  const todosVisiveisMarcados = visiveis.length > 0 && visiveis.every(m => escolhidos.has(m.id));
  const marcarTodos = () => setEscolhidos(atual => {
    const novo = new Set(atual);
    for (const m of visiveis) { if (todosVisiveisMarcados) novo.delete(m.id); else novo.add(m.id); }
    return novo;
  });

  const alcance = camerasAlcancadas(cameras, acessos);
  const aplicando = andamento !== null;
  const temAcesso = acessos.postes.size + acessos.cameras.size > 0;
  // substituir por nada é permitido (tira tudo), mas pede confirmação; acrescentar nada não faz sentido
  const podeAplicar = escolhidos.size > 0 && (modo === 'substituir' || temAcesso);

  async function aplicar() {
    if (!podeAplicar || aplicando) return;
    if (modo === 'substituir') {
      const ok = await confirmar(
        temAcesso ? 'Substituir o que eles veem?' : 'Tirar todas as câmeras deles?',
        temAcesso
          ? `${escolhidos.size} ${escolhidos.size === 1 ? 'morador passa' : 'moradores passam'} a ver só o que está marcado aqui. O que viam antes deixa de valer.`
          : `Nada está marcado: ${escolhidos.size} ${escolhidos.size === 1 ? 'morador deixa' : 'moradores deixam'} de ver qualquer câmera.`,
        'Substituir',
      );
      if (!ok) return;
    }
    setErro(null);
    setFeito(null);
    setAndamento(0);
    const alvos = moradores.filter(m => escolhidos.has(m.id));
    const falhas: string[] = [];
    let certos = 0;
    for (let i = 0; i < alvos.length; i++) {
      const m = alvos[i];
      try {
        let posteIds = [...acessos.postes];
        let cameraIds = [...acessos.cameras];
        if (modo === 'acrescentar') {
          const atual = await api<{ poste_ids: number[]; camera_ids: number[] }>(`/usuarios/${m.id}/acessos`);
          posteIds = [...new Set([...atual.poste_ids, ...posteIds])];
          cameraIds = [...new Set([...atual.camera_ids, ...cameraIds])];
        }
        await api(`/usuarios/${m.id}/acessos`, { method: 'PUT', body: { poste_ids: posteIds, camera_ids: cameraIds } });
        certos++;
      } catch {
        falhas.push(m.nome);
      }
      setAndamento((i + 1) / alvos.length);
    }
    setFeito({ certos, falhas });
    setAndamento(null);
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.tela}>
      <Cabecalho titulo={'Liberar em grupo'} />
      <BarraCarregando ativa={carregando} />

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {erro && <Mensagem texto={erro} tom="erro" />}
        {!carregando && !erro && moradores.length === 0 && (
          <Mensagem texto="Ainda não há moradores cadastrados. Crie um pelo botão Criar novo usuário, ou vários de uma vez em Moradores em lote." />
        )}

        {moradores.length > 0 && (
          <>
            <Secao titulo={`1. Quem (${escolhidos.size} de ${moradores.length})`}>
              {moradores.length > 8 && <Campo rotulo="Buscar morador" placeholder="Nome ou email" autoCorrect={false} autoCapitalize="none" value={busca} onChangeText={setBusca} />}
              <Botao titulo={todosVisiveisMarcados ? 'Desmarcar todos' : 'Marcar todos'} variante="secundario" onPress={marcarTodos} desabilitado={aplicando || visiveis.length === 0} />
              <View>
                {visiveis.slice(0, 60).map(m => {
                  const marcado = escolhidos.has(m.id);
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => alternar(m.id)}
                      disabled={aplicando}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: marcado }}
                      accessibilityLabel={`Morador ${m.nome}`}
                      style={({ pressed }) => [styles.linha, pressed && styles.linhaPressionada]}
                    >
                      <View style={[styles.caixa, marcado && styles.caixaMarcada]}>{marcado && <View style={styles.caixaMiolo} />}</View>
                      <View style={styles.linhaTexto}>
                        <Text style={[styles.linhaNome, marcado && styles.linhaNomeMarcado]} numberOfLines={1}>{m.nome}</Text>
                        <Text style={styles.nota} numberOfLines={1}>{m.email}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {visiveis.length > 60 && <Mensagem texto={`Mostrando 60 de ${visiveis.length}. Use a busca para achar os outros.`} />}
            </Secao>

            <Secao titulo="2. O que liberar">
              <Opcoes<Modo>
                rotulo="Como aplicar"
                valor={modo}
                opcoes={[{ valor: 'acrescentar', rotulo: 'Acrescentar ao que já veem' }, { valor: 'substituir', rotulo: 'Substituir o que veem' }]}
                onChange={setModo}
              />
              <Mensagem
                texto={alcance === 0
                  ? (modo === 'substituir' ? 'Nada marcado: aplicar assim tira todas as câmeras dos escolhidos.' : 'Marque os postes ou as câmeras que os escolhidos passam a ver.')
                  : `${alcance} ${alcance === 1 ? 'câmera marcada' : 'câmeras marcadas'}.`}
              />
              <SeletorDeAcessos postes={postes} cameras={cameras} valor={acessos} aoMudar={setAcessos} />
            </Secao>

            {aplicando && (
              <View style={styles.andamento}>
                <Text style={styles.andamentoTexto} accessibilityLiveRegion="polite">Aplicando… {Math.round(andamento * escolhidos.size)} de {escolhidos.size}</Text>
                <Progresso fracao={andamento} rotulo="Aplicando a liberação" />
              </View>
            )}
            {feito && (
              <Mensagem
                texto={feito.falhas.length === 0
                  ? `Pronto: liberação aplicada a ${feito.certos} ${feito.certos === 1 ? 'morador' : 'moradores'}.`
                  : `Aplicado a ${feito.certos}. Falhou para: ${feito.falhas.join(', ')}.`}
                tom={feito.falhas.length === 0 ? 'azul' : 'erro'}
              />
            )}
            <Botao
              titulo={escolhidos.size === 0 ? 'Aplicar' : `Aplicar a ${escolhidos.size} ${escolhidos.size === 1 ? 'morador' : 'moradores'}`}
              onPress={() => { void aplicar(); }}
              carregando={aplicando}
              desabilitado={!podeAplicar}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const criarEstilos = (c: Paleta) => StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { width: '100%', maxWidth: componentes.conteudo.larguraMaxima, alignSelf: 'center', padding: espaco[4], paddingBottom: espaco[10], gap: espaco[6] },
  linha: {
    flexDirection: 'row', alignItems: 'center', gap: espaco[3], minHeight: componentes.alvoDeToque + espaco[2],
    paddingVertical: espaco[2], borderBottomWidth: 1, borderBottomColor: c.linha,
  },
  linhaPressionada: { backgroundColor: c.azulSuave },
  linhaTexto: { flex: 1, gap: espaco[0.5] },
  linhaNome: { fontFamily: fontes.texto, fontSize: corpo.base, lineHeight: entrelinha.base, color: c.textoSuave },
  linhaNomeMarcado: { fontFamily: fontes.textoForte, color: c.texto },
  nota: { fontFamily: fontes.texto, fontSize: corpo.pequeno, color: c.textoSuave },
  caixa: {
    width: componentes.caixaDeMarcar, height: componentes.caixaDeMarcar, borderRadius: espaco[1.5],
    borderWidth: 2, borderColor: c.textoSuave, alignItems: 'center', justifyContent: 'center',
  },
  caixaMarcada: { borderColor: c.luz, backgroundColor: c.luz, boxShadow: c.brilho },
  caixaMiolo: { width: componentes.caixaDeMarcar / 2.4, height: componentes.caixaDeMarcar / 2.4, borderRadius: espaco[0.5], backgroundColor: c.sobreLuz },
  andamento: { gap: espaco[2.5] },
  andamentoTexto: { fontFamily: fontes.textoForte, fontSize: corpo.legenda, color: c.texto, fontVariant: ['tabular-nums'] },
});
