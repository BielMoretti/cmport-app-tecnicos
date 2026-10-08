/**
 * Mede quanto o assistente (Claude Code) trabalhou neste projeto, para o ladrilho
 * "Assistente" da aba Monitor.
 *
 * De onde vem: o Claude Code grava cada conversa num arquivo local
 * (~/.claude/projects/<pasta do projeto>/<sessão>.jsonl), e cada resposta traz a contagem
 * de tokens. Este script soma essas contagens e escreve só os TOTAIS em
 * src/lib/usoDoAssistente.json — nenhum texto de conversa sai daqui.
 *
 * O que ele NÃO sabe: quanto falta do limite do plano. Esse número não fica em arquivo
 * nenhum; só o comando /usage, dentro do Claude Code, mostra.
 *
 * Rodar:  node scripts/uso-do-assistente.js   (o atalho "Rodar CMPort.bat" já roda antes de subir o app)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const raizDoApp = path.join(__dirname, '..');
const pastaDoProjeto = path.join(raizDoApp, '..');           // "Sistemas Cmport": é onde o Claude Code é aberto
const destino = path.join(raizDoApp, 'src/lib/usoDoAssistente.json');

// o Claude Code nomeia a pasta trocando tudo que não é letra ou número por "-"
const codificar = caminho => caminho.replace(/[^A-Za-z0-9]/g, '-');
const base = path.join(os.homedir(), '.claude', 'projects');
const pastas = fs.existsSync(base)
  ? fs.readdirSync(base).filter(n => n.startsWith(codificar(pastaDoProjeto))).map(n => path.join(base, n))
  : [];

const DIAS = 14;
const dia = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const total = { entrada: 0, saida: 0, cacheGravado: 0, cacheLido: 0 };
const porDia = new Map();
const modelos = new Map();
const vistas = new Set();           // cada resposta aparece em mais de uma linha: conta uma vez só
const sessoes = new Set();
let respostas = 0;
let acoes = 0;
let primeira = null;
let ultima = null;

for (const pasta of pastas) {
  for (const nome of fs.readdirSync(pasta).filter(n => n.endsWith('.jsonl'))) {
    sessoes.add(nome);
    for (const linha of fs.readFileSync(path.join(pasta, nome), 'utf8').split('\n')) {
      if (!linha.includes('"usage"')) continue;
      let registro;
      try { registro = JSON.parse(linha); } catch { continue; }
      const mensagem = registro.message;
      const uso = mensagem && mensagem.usage;
      if (!uso || registro.type !== 'assistant') continue;

      // as ações (ferramentas) vêm em linhas separadas da mesma resposta: conta todas
      if (Array.isArray(mensagem.content)) acoes += mensagem.content.filter(b => b && b.type === 'tool_use').length;

      const chave = mensagem.id || registro.uuid;
      if (vistas.has(chave)) continue;
      vistas.add(chave);

      const quando = registro.timestamp ? new Date(registro.timestamp) : null;
      const entrada = uso.input_tokens || 0;
      const saida = uso.output_tokens || 0;
      const cacheGravado = uso.cache_creation_input_tokens || 0;
      const cacheLido = uso.cache_read_input_tokens || 0;
      total.entrada += entrada; total.saida += saida; total.cacheGravado += cacheGravado; total.cacheLido += cacheLido;
      respostas++;
      if (mensagem.model && !mensagem.model.startsWith('<')) modelos.set(mensagem.model, (modelos.get(mensagem.model) || 0) + saida);
      if (quando && !Number.isNaN(quando.getTime())) {
        if (!primeira || quando < primeira) primeira = quando;
        if (!ultima || quando > ultima) ultima = quando;
        const d = dia(quando);
        const atual = porDia.get(d) || { saida: 0, lidos: 0, respostas: 0 };
        porDia.set(d, { saida: atual.saida + saida, lidos: atual.lidos + entrada + cacheGravado + cacheLido, respostas: atual.respostas + 1 });
      }
    }
  }
}

// os últimos 14 dias, inclusive os sem trabalho (para o gráfico não pular dias)
const hoje = new Date();
const dias = [];
for (let i = DIAS - 1; i >= 0; i--) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
  const chave = dia(d);
  dias.push({ dia: chave, ...(porDia.get(chave) || { saida: 0, lidos: 0, respostas: 0 }) });
}

const resultado = {
  geradoEm: new Date().toISOString(),
  encontrado: pastas.length > 0 && respostas > 0,
  sessoes: sessoes.size,
  respostas,
  acoes,
  primeiraResposta: primeira ? primeira.toISOString() : null,
  ultimaResposta: ultima ? ultima.toISOString() : null,
  tokens: total,
  modelos: [...modelos.entries()].sort((a, b) => b[1] - a[1]).map(([modelo, saida]) => ({ modelo, saida })),
  ultimosDias: dias,
};

// no servidor de build não há conversas: mantém o retrato que já veio com o código
if (!resultado.encontrado && fs.existsSync(destino)) {
  console.log('uso do assistente: sem registros nesta máquina; o retrato existente foi mantido');
} else {
  fs.writeFileSync(destino, JSON.stringify(resultado, null, 2) + '\n');
  console.log(`uso do assistente: ${respostas} respostas em ${sessoes.size} sessões, ${(total.saida / 1e6).toFixed(2)} mi de tokens gerados`);
}
