# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Um só visual próprio nos dois sistemas (Android e iPhone), feito em Expo / React Native. O que muda por
sistema são só os comportamentos nativos: voltar (gesto ou botão), áreas seguras, folha de
compartilhar, teclado e retorno tátil. A versão web serve só para prévia no computador.

## Users

Técnicos e administradores da CM Port (níveis Técnico, Administrador, Administrador master e DEV) que
instalam e configuram câmeras em condomínios. Usam o app **na rua, no poste**: em pé, muitas vezes de
dia no sol, com o celular numa mão e a outra ocupada, e com sinal de internet às vezes fraco.
Moradores e síndicos não usam este app (eles têm o app dos moradores).

## Product Purpose

Levar a instalação de câmeras do começo ao fim no próprio local: escolher o condomínio, criar o poste
e as câmeras (uma ou até 16 de uma vez), passar o endereço de transmissão para cada equipamento e
confirmar que o vídeo chegou. Depois, acompanhar o que está fora do ar ou com vídeo ruim. Sucesso é
o técnico sair do poste sabendo que todas as câmeras estão transmitindo e gravando.

## Positioning

É a ferramenta de campo do sistema da CM Port: as ordens de serviço do técnico e as câmeras, num
app só, com a conta de técnico da OS. Fala com `tec.cmport.com.br`, em dois serviços separados (OS;
postes, câmeras, ao vivo e gravações), e confere a transmissão direto no servidor de vídeo da CM
Port, sem passar pela dash.

## Operating Context

- Fluxo: Gestão/condomínio → poste → câmeras → endereço (copiar ou enviar) → configurar o
  equipamento → conferir ao vivo e diagnóstico.
- O endereço de transmissão (`rtmp://…/chave`) é longo e é uma credencial: quem tem consegue mandar
  vídeo no lugar da câmera.
- Câmeras do tipo gravador (RTSP/NVR) ainda não transmitem ao vivo pelo app.
- Login com os usuários da dash; nome e senha só se mudam na dash.

## Capabilities and Constraints

- Postes e câmeras: criar, editar, mover de condomínio, desativar (nunca apagar), gerar chave nova.
- Ao vivo (WebRTC), gravações por linha do tempo, baixar trecho com marca d'água, diagnóstico de
  saúde do vídeo.
- Conferência automática da transmissão durante a instalação (a cada 5 s).
- Fora de propósito: usuários, moradores, financeiro, uso da nuvem, painel de monitoramento.
- Em aberto: build para iPhone (hoje só há configuração de Android no EAS).

## Brand Commitments

- Logo do leão, sempre em placa clara.
- Nome **CM PORT**, escrito em letras espaçadas.
- Textos em português simples.
- Fora isso, o visual pode mudar inteiro (decisão do Gabriel em 26/10/2026).

## Evidence on Hand

- Logo: `assets/` (arquivo recebido em 150×150 px; não existe versão em vetor).
- Não há fotos, depoimentos nem números de uso para mostrar no app; não inventar.

## Product Principles

1. O técnico no poste vem primeiro: leitura no sol, uma mão, toques grandes, pouco texto.
2. Cada tela responde a uma pergunta: o que fazer agora, o que está instalado, o vídeo chegou?
3. Estado de verdade sempre à vista: transmitindo, sem vídeo, sem informação; nunca só pela cor.
4. Sinal fraco é normal: nada trava esperando a rede, e falha de rede não vira tela de erro.
5. Nada destrutivo sem confirmação; nada se apaga, só se desativa.

## Accessibility & Inclusion

Legível em luz do sol forte e com uma mão: contraste alto, alvos de toque grandes, texto que aumenta
com a configuração do celular, respeitar "reduzir movimento".
