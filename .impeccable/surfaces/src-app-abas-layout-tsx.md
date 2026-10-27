---
version: 1
slug: "src-app-abas-layout-tsx"
primary_target: "src/app/(abas)/_layout.tsx"
related_targets: ["src/app/(abas)/index.tsx"]
---

# App CMPort Técnico (shell, Início, Instalar, Câmeras, Conta)

Mode: Operate. Técnico no poste, de dia, uma mão, sinal fraco (PRODUCT.md).
Escopo: o app inteiro troca de mundo visual (redesenho pedido em 26/10/2026); funções, textos de produto e rotas de dados ficam.
Build path: code-led (sem geração de imagem nesta sessão).

## Direction contract

THESIS: o estado de cada poste se lê de relance, como um painel de portas de rede: cada câmera é uma porta numerada, acesa quando transmite. Recusa o painel de cartões de vidro com número grande e degradê.

OWN-WORLD (trocado em 27/10/2026 para a direção "A preta", escolhida pelo usuário no artefato S8WiE5pPSyLsZVRLYDivvt): fundo quase preto (#0C0E12), folhas opacas em dois degraus (#171B21, #1F242C) com fio discreto, sem vidro, sem degradê, sem sombra colorida. Texto quase branco. Azul do leão clareado (#6E9BFF) só para ação e seleção; verde = transmitindo, âmbar = aguardando vídeo, vermelho = fora do ar, cinza = sem informação, sempre com forma e texto além da cor. Letra Atkinson Hyperlegible Next; Atkinson Hyperlegible Mono só em endereços, números de porta e contagens. Cantos com uma regra só: folhas 20, caixas internas 14, portas, botões, chips e abas em pílula; barra de abas em pílula flutuante no celular.

STORY: o técnico abre e vê o que fazer agora; vai em Instalar, escolhe condomínio, poste, câmeras; copia endereços; as portas acendem quando o vídeo chega; sai do poste com tudo aceso.

FIRST VIEWPORT: Início. Topo: leão em placa clara + CM PORT espaçado, título "Agora". Logo abaixo, linha de estado em mono ("47/52 no ar") e a lista de pendências (fora do ar, esperando vídeo, vídeo ruim), cada uma tocável. Depois, condomínios recentes com o painel de portas de cada poste. Barra de abas padrão embaixo: Início, Instalar, Câmeras, Conta.

FORM: painel de portas de rede (switch) como linguagem de estado; posição 1 da lista; direção fixada pelo usuário ("painel escuro técnico"), concept-seed não rodou: seed key: none (pinned).

SIGNATURE: no passo 4 da instalação, as portas do poste acendem uma a uma enquanto o app confere a transmissão a cada 5 s (pulso âmbar enquanto espera; sem pulso com "reduzir movimento").

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
