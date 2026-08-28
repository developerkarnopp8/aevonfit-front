# Verificação visual — Responsivo do Painel do Coach (Task 6)

Data: 2026-08-28
Branch: `feat/responsivo-painel-coach`
Método: Chrome headless (CDP) logado como coach `luan@aevonfit.com`, cada rota a
375×812 e 1280×800. Métricas: `document.documentElement.scrollWidth`, lista de
elementos com `getBoundingClientRect().right > innerWidth`, `console.error`,
respostas HTTP >= 400.

Aluno usado no plan-builder: Gustavo Karnopp (`03303bca-88a5-48c8-9c2f-8a91e10249bc`),
plano "Mesociclo 6 — Mês completo".

## Resultado por tela

| Tela | 375px | 1280px | Observação |
|------|-------|--------|------------|
| /coach/dashboard | PASS | PASS | Card "Progresso do Mês" no topo. scrollWidth 375. |
| /coach/students | PASS | PASS | Stats bar 3 col ok a 375 (dígitos únicos). |
| /coach/plans | PASS | PASS | — |
| /coach/library | PASS | PASS | — |
| /coach/messages | PASS | PASS | Mobile alterna lista↔chat; "←" volta (composer oculto→visível→oculto). Desktop lado a lado. |
| /coach/financial | PASS (após fix P4) | PASS | Com dados: antes cortava colunas status/ações; agora rola. Desktop idêntico (tabela full width, cantos arredondados). |
| /coach/plan-builder/:id | PASS (após fix P1/P2) | PASS | Header 2 linhas de botões no mobile; faixa de semanas só ícone PDF. Desktop: botões em 1 linha, "Exportar Semana" com texto. |

Nenhuma rota apresentou scroll horizontal na página (scrollWidth == 375 / == 1280
em todas). Zero `console.error`. Zero respostas 4xx/5xx (fora do fluxo de auth).

## Fixes aplicados

### P1 + P2 — plan-builder (`plan-builder.component.html`) — commit 57a1e26

**P1 — header, linha 22:** grupo de botões comprimia e cortava "Publicar Plano".
- Antes: `<div class="flex items-center gap-2">`
- Depois: `<div class="flex items-center gap-2 flex-wrap md:flex-nowrap">`
- Print antes: 3 botões espremidos em 347px, "PUBLICAR PLANO" com texto quebrado
  em 2 linhas dentro do botão (98px de largura), header ~120px de altura.
- Print depois: "EXPORTAR MÊS" + "SALVAR RASCUNHO" na 1ª linha, "PUBLICAR PLANO"
  (texto inteiro) na 2ª linha. Sem corte. Desktop: 3 botões em 1 linha (nowrap).

**P2 — faixa de semanas, linha ~278:** botão "Exportar Semana" comia largura.
- Antes: texto `Exportar Semana` solto no botão.
- Depois: `<span class="hidden md:inline">Exportar Semana</span>` (mobile mostra
  só o ícone `picture_as_pdf`).
- Print antes: "EXPORTAR SEMANA" + "SEMANA 1" + "SEMANA 2" disputando a faixa.
- Print depois: ícone PDF + "SEMANA 1" + "SEMANA 2", faixa folgada. Desktop
  inalterado (texto aparece).

**P3 — header alto:** resolvido como consequência do P1. Altura do header no
mobile agora são 2 linhas de botão de 40px — aceitável, sem tweak extra de
`text-[11px]`.

### P4 — financial (`financial.component.html`) — commit a3adb5d

Lista de cobranças (`grid grid-cols-[1fr_auto_auto_auto_auto]`) dentro de wrapper
com `overflow-hidden` cortava as colunas Status e Ações a 375px.
- Wrapper (linha ~80): `overflow-hidden` → `overflow-x-auto md:overflow-hidden`
- Linha header (linha ~82) e linhas de dados (linha ~91): + `min-w-[560px] md:min-w-0`
- Print antes (com 2 cobranças de teste): nome "Gustavo Karnopp" quebrado em 2
  linhas, descrição em 4 linhas, botões de ação e metade do badge de status
  cortados na borda direita (wrapper scrollWidth 419 vs clientWidth 347).
- Print depois: linha mantém 560px e rola horizontal dentro do card (scrollbar
  fina no rodapé do card); nome em 1 linha; scroll revela Valor/Vencimento/
  Status/Ações completos. Página continua em 375. Desktop: `md:min-w-0` +
  `md:overflow-hidden` → tabela idêntica ao baseline, sem scrollbar.

Verificado criando 2 cobranças reais via API (removidas ao fim da verificação).

### P5 — students stats bar

Não aplicado. A 375px os 3 cards (`text-3xl`, valores de 1 dígito) têm folga
sobrando; o aperto só aconteceria abaixo de ~320px, fora do alvo. Sem regressão
a evitar, deixado como está.

## Builds

- `npx ng build --configuration development` — OK (só warning pré-existente de
  `@import` do Sass/Tailwind).
- `npx ng build --configuration production` — OK ("Application bundle generation
  complete", só warnings CommonJS pré-existentes de canvg/jspdf/html2canvas).

## Commits

| SHA | Mensagem |
|-----|----------|
| 57a1e26 | fix(coach-plan-builder): header e faixa de semanas no mobile |
| a3adb5d | fix(coach-financial): lista de cobranças rola no mobile em vez de cortar |

Sem `git push`, sem merge.
