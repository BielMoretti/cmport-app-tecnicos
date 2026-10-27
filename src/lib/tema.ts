/**
 * Sistema de design do app, em três camadas. É a ÚNICA fonte de cores, medidas e
 * fontes — nenhuma tela deve escrever um valor cru (hex, raio, espaçamento).
 *
 *   1. primitivos   valores crus, sem significado            (muda quase nunca)
 *   2. semânticos   o que cada valor significa                (a paleta do app)
 *   3. componentes  medidas próprias de cada peça da interface (muda por componente)
 *
 * As telas usam só as camadas 2 e 3. Os primitivos não são exportados.
 *
 * Visual "A preta" (direção A, ordem de serviço, escolhida em 26/10/2026): fundo quase preto,
 * folhas opacas em dois degraus, letra Atkinson Hyperlegible (feita para leitura difícil: o sol)
 * e cantos redondos com uma regra só: folhas 20, caixas internas 14, e portas, botões e abas
 * totalmente redondos. O estado de cada câmera é a cor que mais trabalha: verde transmite,
 * âmbar espera, vermelho caiu, cinza não sabe.
 */
import type { TextStyle, ViewStyle } from 'react-native';

// ───────────────────────────── 1. Primitivos ─────────────────────────────

const cor = {
  breu: '#0C0E12',       // fundo: quase preto, não preto puro
  folha1: '#171B21',     // folha (blocos, listas, campos)
  folha2: '#1F242C',     // folha mais alta (caixa dentro de uma folha, selecionado)
  folha3: '#262C35',
  fio: '#20252D',        // contorno discreto das folhas
  divisa: '#242A33',     // linha entre itens de uma lista
  branco: '#F2F4F7',     // texto
  cinza: '#A3ACB9',      // texto de apoio
  cinzaFraco: '#6B7482', // só para contornos de "sem informação"
  sinal: '#6E9BFF',      // o azul do leão clareado para ler no escuro: ação e seleção
  tinta: '#0C0E12',      // texto em cima do azul e das portas acesas
  verde: '#34C98B',
  ambar: '#F4B740',
  vermelho: '#FF6B5E',
  preto: '#000000',
  brancoPuro: '#FFFFFF',
  azulMarinho: '#0E2240',
  vermelhoAoVivo: '#D92D20',
} as const;

const semSombra = '0px 0px 0px rgba(0, 0, 0, 0)';
const transparente = 'rgba(0, 0, 0, 0)';

/** Espaçamento em base 4 (meio passo = 2px). Ex.: espaco[4] = 16. */
export const espaco = {
  0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 10: 40, 12: 48,
} as const;

/**
 * Raios de canto, uma regra só: `grande` nas folhas, `medio` nas caixas dentro delas,
 * `pequeno` no que é miúdo, `pilula` em tudo que se toca (botões, portas, abas, chips).
 */
export const raio = { pequeno: 8, medio: 14, grande: 20, pilula: 999 } as const;

/** Escala tipográfica (px, cresce com a letra do celular). Um degrau acima do comum: é lida no sol. */
export const corpo = {
  micro: 12, pequeno: 14, legenda: 15, base: 16, nome: 17, nomeGrande: 19, cabecalho: 20, titulo: 24, destaque: 32,
} as const;

/** Altura de linha (px), casada com a escala de fonte. */
export const entrelinha = { micro: 16, base: 23, titulo: 30, destaque: 38 } as const;

/**
 * Atkinson Hyperlegible Next: desenhada para quem lê com dificuldade, e no poste, de dia, todo
 * mundo lê com dificuldade. A versão mono é só para o que se confere caractere a caractere:
 * endereços, números de porta, contagens. Cada peso é um arquivo (carregados em app/_layout.tsx);
 * por isso não se usa `fontWeight` junto. Use espalhando: `{ ...fontes.texto, fontSize: corpo.base }`.
 */
export const fontes = {
  texto: { fontFamily: 'AtkinsonHyperlegibleNext_400Regular' },
  textoForte: { fontFamily: 'AtkinsonHyperlegibleNext_600SemiBold' },
  nome: { fontFamily: 'AtkinsonHyperlegibleNext_700Bold' },
  destaque: { fontFamily: 'AtkinsonHyperlegibleNext_800ExtraBold' },
  mono: { fontFamily: 'AtkinsonHyperlegibleMono_500Medium' },
  monoForte: { fontFamily: 'AtkinsonHyperlegibleMono_700Bold' },
} as const satisfies Record<string, Pick<TextStyle, 'fontFamily'>>;

// ───────────────────────────── 2. Semânticos ─────────────────────────────

export type Modo = 'escuro';

export interface Paleta {
  fundo: string;
  fundoAlto: string;
  veu: string;          // cor por cima de imagem, para o texto ler
  superficie: string;   // folhas: blocos, listas e campos
  superficieForte: string; // caixa dentro de uma folha, o que está selecionado
  vidroBorda: string;   // contorno de 1px das folhas (o nome ficou do visual antigo)
  vidroFio: string;
  vidroSombra: string;
  flutuante: string;    // barra de abas e o que fica por cima do conteúdo
  ciano: string;
  placa: string;        // placa clara atrás do logo (o leão é grafite: precisa de fundo claro)
  texto: string;
  textoSuave: string;
  linha: string;
  azul: string;         // ação e seleção
  azulSuave: string;    // fundo tingido de azul (aba ativa, seleção, toque)
  sobreAzul: string;    // texto em cima do azul
  sobreLuz: string;     // texto em cima do botão principal
  brilho: string;
  luz: string;          // preenchimento do botão principal e do que está ligado
  predio: string;
  erro: string;
  erroSuave: string;
  // Estado das câmeras. Nunca só pela cor: a porta muda de forma e o texto diz o estado.
  estadoOnline: string;
  estadoOnlineSuave: string;
  estadoEspera: string;
  estadoEsperaSuave: string;
  estadoOffline: string;
  estadoNeutro: string;
  sobreEstado: string;  // número dentro da porta acesa
}

export const paleta: Paleta = {
  fundo: cor.breu,
  fundoAlto: cor.breu,
  veu: 'rgba(12, 14, 18, 0.78)',
  superficie: cor.folha1,
  superficieForte: cor.folha2,
  vidroBorda: cor.fio,
  vidroFio: transparente,
  vidroSombra: semSombra,
  flutuante: cor.folha1,
  ciano: cor.sinal,
  placa: cor.branco,
  texto: cor.branco,
  textoSuave: cor.cinza,
  linha: cor.divisa,
  azul: cor.sinal,
  azulSuave: 'rgba(110, 155, 255, 0.16)',
  sobreAzul: cor.tinta,
  sobreLuz: cor.tinta,
  brilho: semSombra,
  luz: cor.sinal,
  predio: cor.folha3,
  erro: cor.vermelho,
  erroSuave: 'rgba(255, 107, 94, 0.16)',
  estadoOnline: cor.verde,
  estadoOnlineSuave: 'rgba(52, 201, 139, 0.16)',
  estadoEspera: cor.ambar,
  estadoEsperaSuave: 'rgba(244, 183, 64, 0.14)',
  estadoOffline: cor.vermelho,
  estadoNeutro: cor.cinzaFraco,
  sobreEstado: cor.tinta,
};

/** Cores que não mudam: o palco do vídeo é sempre preto, o logo sempre em placa clara. */
export const palco = {
  fundo: cor.preto,
  texto: cor.brancoPuro,
  veu: 'rgba(0, 0, 0, 0.6)',       // fundo do selo sobre o vídeo
  aoVivo: cor.vermelhoAoVivo,
  botaoFundo: cor.brancoPuro,
  botaoTexto: cor.azulMarinho,
  fundoDoLogo: cor.brancoPuro,
  // marca d'água discreta: uma assinatura pequena e legível num canto e, por trás, o mesmo
  // texto espalhado quase invisível (aparece ao aumentar o contraste de uma captura)
  marca: 'rgba(255, 255, 255, 0.62)',
  marcaSombra: 'rgba(0, 0, 0, 0.55)',
  marcaFantasma: 'rgba(255, 255, 255, 0.03)',
  // a marca do ao vivo, espalhada pela tela toda: visível sem tampar a imagem
  marcaEspalhada: 'rgba(255, 255, 255, 0.17)',
  marcaEspalhadaSombra: 'rgba(0, 0, 0, 0.16)',
} as const;

/** Folha opaca com contorno discreto de 1px. `forte` e `flutuante` sobem um degrau. */
export function vidro(c: Paleta, tipo: 'painel' | 'forte' | 'flutuante' = 'painel'): Pick<ViewStyle, 'backgroundColor' | 'borderWidth' | 'borderColor'> {
  return { backgroundColor: tipo === 'painel' ? c.superficie : c.superficieForte, borderWidth: 1, borderColor: c.vidroBorda };
}

/** Preenchimento do que está ligado: botão principal, seleção, progresso. Cor chapada. */
export function aceso(c: Paleta): Pick<ViewStyle, 'backgroundColor'> {
  return { backgroundColor: c.luz };
}

// ───────────────────────────── 3. Componentes ────────────────────────────

/** Medidas de cada peça. As cores vêm sempre da paleta (camada 2). */
export const componentes = {
  /** Menor área tocável aceitável (48dp no Android, 44pt no iPhone: vale a maior). */
  alvoDeToque: 48,
  botao: { altura: 54, raio: raio.pilula },
  botaoNoPalco: { altura: 48, raio: raio.pilula, respiroH: espaco[5] },
  botaoIcone: { tamanho: 48, icone: 22 },
  campo: { raio: raio.medio, respiroH: espaco[4], respiroV: espaco[3.5] },
  cartao: { raio: raio.grande, alturaMin: 88, respiro: espaco[4], miniatura: 150 },
  heroi: { altura: 200, raio: raio.grande },
  faixa: { altura: 140 },
  estatistica: { numero: 30, grande: 44 },
  mira: { canto: 22, traco: 2, margem: espaco[3] },
  glifo: 20,
  linhaDoTempo: { altura: 48, marca: 3, rotulo: 44 },
  controle: { tamanho: 48, principal: 60 },
  marcaDagua: { fonteGrande: 11, fontePequena: 7, fantasma: 12, entrelinhas: 5, angulo: '-24deg', margem: espaco[2], trocaMs: 20_000 },
  logoPlaca: { topo: 36, entrada: 88 },
  parede: { larguraMinima: 260, larguraMaxima: 1180 },
  situacao: { altura: 76 },
  faixaDeEstado: { altura: 8 },
  medidor: { altura: 6 },
  caixaDeMarcar: 24,
  miniatura: { largura: 64, altura: 36 },
  alternador: { largura: 52, altura: 32, pino: 24 },
  // barra de abas em pílula, flutuando acima do fim da tela; `reserva` é o espaço que as telas
  // deixam no fim para o conteúdo não ficar atrás dela
  abas: { altura: 64, icone: 24, margem: espaco[3], reserva: 64 + espaco[3] * 2 + espaco[4], larguraMaxima: 560, larguraDoTrilho: 600, larguraDoTrilhoAberto: 96 },
  iconeCaixa: { tamanho: 40, raio: raio.pilula, glifo: 22 },
  avatar: 44,
  avatarGrande: 72,
  cartaoDeCondominio: { largura: 248, altura: 132 },
  conteudo: { larguraMaxima: 560 },
  chip: { altura: 40, raio: raio.pilula, respiroH: espaco[4] },
  linha: { alturaMin: 68 },
  celulaHora: { altura: 52, raio: raio.medio },
  selo: { raio: raio.pilula, ponto: 8 },
  barraCarregando: { altura: 2 },
  logo: { disco: 132, largura: 96, altura: 112 },
  tela: { margem: espaco[4], larguraMaxFormulario: 440 },
  // painel de portas: cada câmera é uma porta redonda e numerada do poste
  // `vaoTocavel`: porta que abre a câmera — 44 com vão de 8 dá alvo de 48 sem encostar no vizinho
  porta: { tamanho: 32, vao: espaco[1.5], vaoTocavel: espaco[2], borda: 2, grande: 44 },
  passo: { altura: 5 },
} as const;
