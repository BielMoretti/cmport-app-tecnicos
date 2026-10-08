import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { BarraCarregando } from '@/components/efeitos';
import { Botao, Campo, Mensagem, Secao } from '@/components/formulario';
import SeletorDeAcessos, { camerasAlcancadas, type Acessos } from '@/components/SeletorDeAcessos';
import { Cabecalho, Cartao, Progresso } from '@/components/ui';
import { useEstilos } from '@/contexts/TemaContext';
import { api, ApiError } from '@/lib/api';
import { lerLote } from '@/lib/lote';
import { componentes, corpo, entrelinha, espaco, fontes, type Paleta } from '@/lib/tema';
import type { Camera, Poste, Usuario } from '@/lib/types';

interface Resultado {
  nome: string;
  email: string;
  senha: string;
  /** null = criado; texto = por que não foi */
  erro: string | null;
  /** criado, mas a liberação de postes e câmeras falhou */
  semAcesso: boolean;
}

const EXEMPLO = 'Maria Souza\tmaria@email.com\nJoão Lima\tjoao@email.com\tsenha123';

/**
 * Cadastrar vários moradores de uma vez: cola-se a lista da planilha (nome, email e,
 * se quiser, senha), escolhe-se o que todos vão ver e o app cria um por um.
 * No fim mostra as senhas, para repassar a cada pessoa.
 */
export default function MoradoresEmLoteScreen() {
  const styles = useEstilos(criarEstilos);
  const [texto, setTexto] = useState('');
  const [postes, setPostes] = useState<Poste[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [acessos, setAcessos] = useState<Acessos>({ postes: new Set(), cameras: new Set() });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [andamento, setAndamento] = useState<number | null>(null);   // fração pronta, de 0 a 1
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    Promise.all([api<Poste[]>('/postes'), api<Camera[]>('/cameras')])
      .then(([p, c]) => { if (!cancelado) { setPostes(p); setCameras(c); } })
      .catch(e => { if (!cancelado) setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os postes e as câmeras.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, []);

  const linhas = useMemo(() => lerLote(texto), [texto]);
  const boas = linhas.filter(l => !l.problema);
  const ruins = linhas.filter(l => l.problema);
  const alcance = camerasAlcancadas(cameras, acessos);
  const criando = andamento !== null;

  async function criar() {
    if (boas.length === 0 || criando) return;
    setErro(null);
    setAndamento(0);
    const feitos: Resultado[] = [];
    const temAcesso = acessos.postes.size + acessos.cameras.size > 0;
    // um por vez: se o servidor recusar um, os outros seguem, e a ordem da lista é mantida
    for (let i = 0; i < boas.length; i++) {
      const l = boas[i];
      const r: Resultado = { nome: l.nome, email: l.email, senha: l.senha, erro: null, semAcesso: false };
      try {
        const novo = await api<Usuario>('/usuarios', { method: 'POST', body: { nome: l.nome, email: l.email, senha: l.senha, role: 'MORADOR' } });
        if (temAcesso) {
          try {
            await api(`/usuarios/${novo.id}/acessos`, { method: 'PUT', body: { poste_ids: [...acessos.postes], camera_ids: [...acessos.cameras] } });
          } catch {
            r.semAcesso = true;
          }
        }
      } catch (e) {
        r.erro = e instanceof ApiError && e.status === 422 ? 'O servidor ainda não tem o nível Morador.'
          : e instanceof ApiError ? e.message : 'Sem conexão com o servidor.';
      }
      feitos.push(r);
      setAndamento((i + 1) / boas.length);
    }
    setResultados(feitos);
    setAndamento(null);
  }

  const criados = resultados?.filter(r => !r.erro) ?? [];
  const falhas = resultados?.filter(r => r.erro) ?? [];

  async function copiar() {
    const lista = criados.map(r => `${r.nome}\t${r.email}\t${r.senha}`).join('\n');
    setCopiado(await Clipboard.setStringAsync(lista).catch(() => false));
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.tela}>
      <Cabecalho titulo={'Moradores em lote'} />
      <BarraCarregando ativa={carregando} />

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {erro && <Mensagem texto={erro} tom="erro" />}

        {resultados ? (
          <>
            <Secao titulo={`${criados.length} ${criados.length === 1 ? 'morador criado' : 'moradores criados'}`}>
              {criados.length > 0 && (
                <>
                  <Mensagem texto="Anote ou copie agora: as senhas não aparecem de novo. Passe a cada pessoa por um canal seguro." tom="azul" />
                  {criados.map(r => (
                    <Cartao key={r.email} style={styles.resultado}>
                      <Text style={styles.nome} numberOfLines={1}>{r.nome}</Text>
                      <Text style={styles.apoio} numberOfLines={1} selectable>{r.email}</Text>
                      <Text style={styles.senha} selectable>Senha: {r.senha}</Text>
                      {r.semAcesso && <Text style={styles.problema}>Criado, mas a liberação de postes e câmeras falhou. Marque na ficha dele.</Text>}
                    </Cartao>
                  ))}
                  <Botao titulo={copiado ? 'Lista copiada' : 'Copiar a lista com as senhas'} variante="secundario" onPress={() => { void copiar(); }} />
                </>
              )}
            </Secao>
            {falhas.length > 0 && (
              <Secao titulo={`${falhas.length} não ${falhas.length === 1 ? 'foi criado' : 'foram criados'}`}>
                {falhas.map(r => (
                  <Cartao key={r.email} style={styles.resultado}>
                    <Text style={styles.nome} numberOfLines={1}>{r.nome}</Text>
                    <Text style={styles.apoio} numberOfLines={1}>{r.email}</Text>
                    <Text style={styles.problema}>{r.erro}</Text>
                  </Cartao>
                ))}
              </Secao>
            )}
            <Botao titulo="Cadastrar outra lista" onPress={() => { setResultados(null); setTexto(''); setCopiado(false); }} />
          </>
        ) : (
          <>
            <Secao titulo="1. Cole a lista">
              <Mensagem texto="Uma pessoa por linha: nome, email e, se quiser, a senha. Pode copiar direto das células da planilha. Quem vier sem senha ganha uma, que aparece no final." />
              <Campo
                rotulo="Lista de moradores"
                value={texto}
                onChangeText={setTexto}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                editable={!criando}
                placeholder={EXEMPLO.replace(/\t/g, '   ')}
              />
              {linhas.length > 0 && (
                <Mensagem
                  texto={`${boas.length} ${boas.length === 1 ? 'pessoa pronta' : 'pessoas prontas'} para criar${ruins.length > 0 ? `, ${ruins.length} com problema` : ''}.`}
                  tom={ruins.length > 0 ? 'suave' : 'azul'}
                />
              )}
              {ruins.map(l => (
                <Text key={l.numero} style={styles.problema}>Linha {l.numero}{l.nome ? ` (${l.nome})` : ''}: {l.problema}</Text>
              ))}
            </Secao>

            <Secao titulo="2. O que todos vão ver">
              <Mensagem
                texto={alcance === 0
                  ? 'Opcional. Sem nada marcado, os moradores são criados sem ver nenhuma câmera, e você libera depois, um a um ou em grupo.'
                  : `Todos da lista vão ver ${alcance} ${alcance === 1 ? 'câmera' : 'câmeras'}.`}
              />
              {!carregando && <SeletorDeAcessos postes={postes} cameras={cameras} valor={acessos} aoMudar={setAcessos} />}
            </Secao>

            {criando && (
              <View style={styles.andamento}>
                <Text style={styles.andamentoTexto} accessibilityLiveRegion="polite">Criando… {Math.round(andamento * boas.length)} de {boas.length}</Text>
                <Progresso fracao={andamento} rotulo="Criando os moradores" />
              </View>
            )}
            <Botao
              titulo={boas.length === 0 ? 'Criar moradores' : `Criar ${boas.length} ${boas.length === 1 ? 'morador' : 'moradores'}`}
              onPress={() => { void criar(); }}
              carregando={criando}
              desabilitado={boas.length === 0}
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
  resultado: { gap: espaco[0.5], padding: espaco[4] },
  nome: { fontFamily: fontes.nome, fontSize: corpo.nome, color: c.texto },
  apoio: { fontFamily: fontes.texto, fontSize: corpo.legenda, color: c.textoSuave },
  senha: { fontFamily: fontes.textoForte, fontSize: corpo.base, color: c.azul, marginTop: espaco[1], fontVariant: ['tabular-nums'] },
  problema: { fontFamily: fontes.textoForte, fontSize: corpo.legenda, lineHeight: entrelinha.base, color: c.erro },
  andamento: { gap: espaco[2.5] },
  andamentoTexto: { fontFamily: fontes.textoForte, fontSize: corpo.legenda, color: c.texto, fontVariant: ['tabular-nums'] },
});
