# Responsivo do painel do coach

**Data:** 2026-08-28
**Repo:** `aevonfit-front` (frontend-only)
**Path:** arquitetural (shell + 7 telas, muda navegação, mexe em componente de layout compartilhado por todas as rotas de coach)
**Roadmap:** item 0 ("retomar aqui") do roadmap de gaps — brainstorming iniciado e pausado em 2026-08-27 (parte 17), retomado e finalizado aqui.

## Problema

`CoachShellComponent` (`src/app/layout/coach-shell/coach-shell.component.html`) foi construído desktop-only:

```html
<aside class="hidden md:flex w-64 ...">  <!-- sidebar: nav + "Novo Treino" + sino + usuário/logout -->
```

Abaixo de 768px a barra lateral inteira **desaparece sem nenhuma alternativa** — o coach fica sem navegação, sem logout, sem "Novo Treino", sem o sino de notificações. E cada tela de coach tem layout fixo de desktop (`px-8`, `flex-row` com `aside` de largura fixa, tipografia `text-5xl`, colunas `w-40`/`w-72`) que não reflui. Resultado: painel inteiro inutilizável no celular.

O `AthleteShellComponent` tem bottom-nav própria e o `AdminShellComponent` (criado na parte 18) **já implementa** o padrão de drawer mobile — este trabalho traz o mesmo padrão pro coach.

## Decisões (confirmadas com o usuário)

| Tema | Decisão |
|---|---|
| Abordagem | Tailwind mobile-first por tela + drawer no shell. **Sem** mudança de API de componente, **sem** componente novo, **sem** extrair shell compartilhado (não refatorar o AdminShell recém-mergeado). |
| Nav mobile | **Menu gaveta (drawer)** via ícone de hambúrguer num header fixo — espelhando `AdminShellComponent`. Não bottom-nav (6+ seções, demais pra uma barra). |
| Breakpoint | `md:` (768px), igual AdminShell e AthleteShell. |
| Escopo | CoachShell + as 7 telas (Dashboard, Alunos, Planos, Biblioteca, Mensagens, Financeiro, Plan-Builder) numa spec/plano só, 1 task por tela. |
| Mensagens | Signal `mobileView: 'list' \| 'chat'`. Mobile mostra lista OU chat (com "← voltar" no header do chat). Desktop inalterado (lado a lado). |
| Plan-Builder | Coluna `w-40` de abas de semana → faixa `overflow-x-auto` horizontal no topo no mobile; `md:` volta pra coluna vertical. |
| Dashboard | Card "Progresso do Mês" (hoje `aside.w-60` à direita) → primeiro card da coluna única no mobile; `md:` volta pra direita. |

## Arquitetura

### 1. `CoachShellComponent` — o drawer (fix central)

Espelhar `AdminShellComponent` (`src/app/layout/admin-shell/admin-shell.component.{ts,html}`), preservando tudo que o CoachShell tem a mais.

**TS** ganha:
```ts
mobileMenuOpen = signal(false);
toggleMobileMenu(): void { this.mobileMenuOpen.update(v => !v); }
closeMobileMenu(): void { this.mobileMenuOpen.set(false); }
```
E fecha o drawer ao navegar: assinar `Router` events (`NavigationEnd`) → `closeMobileMenu()`, OU `(click)="closeMobileMenu()"` em cada `<a>` do drawer (o AdminShell usa a segunda; seguir a mesma).

**HTML** — três blocos:
1. `<aside class="hidden md:flex w-64 ...">` — a sidebar atual, **sem mudança** (nav, "Novo Treino", `<app-notifications-bell>`, bloco usuário/logout).
2. `<header class="md:hidden fixed top-0 left-0 right-0 z-40 ...">` novo — hambúrguer (`menu`) à esquerda, marca "Coach PulseRx" ao centro, `<app-notifications-bell>` à direita.
3. `@if (mobileMenuOpen()) { ... }` — overlay `bg-black/80` (clique fecha) + painel `w-64` deslizante contendo **a mesma nav + "Novo Treino" + usuário/logout** da sidebar (cada `<a>`/ação chama `closeMobileMenu()`). `animate-slide-up`/`animate-fade-in` como o AdminShell.
4. `<main>` ganha `pt-16 md:pt-0` (espaço do header fixo no mobile). Mantém o `<app-notification-permission-banner>` e o `<router-outlet>`.
5. O `mx-auto max-w-[1440px]` do wrapper externo permanece.

O modal "Novo Treino" (`@if (showNewPlanModal())`) já usa `w-full max-w-md ... mx-4` — ok no mobile, sem mudança.

### 2. Telas de grade — Alunos, Planos, Biblioteca, Financeiro

Estas já têm grids parcialmente responsivos (`students` já é `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`). O que quebra é padding e linhas de KPI/busca fixas. Por tela:

- **Padding**: `px-8` → `px-4 md:px-8` em headers, linhas de KPI, busca e conteúdo.
- **Linhas de KPI** (`flex gap-3` com itens `flex-1`, ou `grid-cols-4`): → `grid grid-cols-2 md:grid-cols-4 gap-3` (2 por linha no mobile).
- **Cabeçalho** (`flex items-center justify-between` com título grande + ação): permitir quebra (`flex-wrap gap-2`) ou reduzir o título (`text-2xl md:text-3xl`).
- **Grids de card já responsivos**: confirmar o base `grid-cols-1`; ajustar só se o breakpoint pular direto pra 2 num ponto ruim.
- Cada tela: **verificar a 375px e corrigir o que de fato transborda** — não reescrever o que já funciona.

### 3. Dashboard

`dashboard.component.html`:
- Wrapper de conteúdo `<div class="flex flex-1 overflow-hidden min-h-0">` → `flex-col md:flex-row`.
- `<aside class="w-60 ...">` (card "Progresso do Mês") → `w-full md:w-60` e, via ordem no DOM/`order`, aparece **antes** da `<section>` no mobile e depois (à direita) no `md:`. Solução mais simples: mover o `<aside>` pra antes da `<section>` no HTML e dar `order-2 md:order-none` / `md:order-2` — ou duplicação condicional evitada usando `flex-col-reverse` não (quebra outras ordens). **Decisão**: `<aside>` primeiro no DOM com `md:order-2`, `<section>` com `md:order-1`; no mobile a ordem do DOM manda (aside em cima).
- Header `px-8` → `px-4 md:px-8`; input de busca (morto hoje) → `hidden sm:flex`.
- Hero `text-5xl` → `text-3xl sm:text-4xl md:text-5xl`. "PERFORMANCE HUB" `text-3xl` → `text-2xl md:text-3xl`.
- `<section>` `px-8` → `px-4 md:px-8`.

### 4. Mensagens

`messages.component.ts`: adicionar `mobileView = signal<'list' | 'chat'>('list')`. `openConversation()` → também `this.mobileView.set('chat')`. Novo método `backToList(): void { this.mobileView.set('list'); }`.

`messages.component.html`:
- Container externo `flex h-full` — ok.
- Lista `<div class="w-72 flex-shrink-0 flex flex-col ...">` → `class="w-full md:w-72 flex-shrink-0 flex flex-col md:!flex ..." [class.hidden]="mobileView() === 'chat'"`. (`md:!flex` com `!important` vence o `[class.hidden]` no `md:` — `hidden` é `display:none !important` no Tailwind, então o override precisa do `!`.)
- Bloco do chat `@if (selectedId())` — no wrapper `<div class="flex-1 flex flex-col ...">`: → `class="flex-1 flex flex-col md:!flex ..." [class.hidden]="mobileView() === 'list'"`. No `md:` os dois sempre visíveis; no mobile exatamente um (`mobileView` nunca deixa os dois `hidden` porque começa em `'list'` e só alterna).
- Header do chat: botão `md:hidden` "← " (`arrow_back`) chamando `backToList()`, antes do avatar.
- Empty state (nenhuma conversa selecionada) só relevante no desktop — no mobile `mobileView` começa em `'list'`.

### 5. Plan-Builder

`plan-builder.component.html`:
- `<div class="flex-1 flex overflow-hidden min-h-0">` → `flex-col md:flex-row`.
- `<aside class="w-40 border-r ... flex-shrink-0 py-4 px-2 overflow-y-auto">` (abas de semana + "Exportar Semana"/"Exportar Mês"):
  → `class="w-full md:w-40 flex md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r ... px-3 md:px-2 py-3 md:py-4 flex-shrink-0"`.
  Os botões de semana (`Semana N`) ganham `flex-shrink-0 whitespace-nowrap` pra não espremer na faixa horizontal. Os botões "Exportar" ficam ao lado das abas no mobile (também na faixa) ou movidos pra um menu — **decisão**: deixar na faixa, `flex-shrink-0`.
- Timeline `<div class="flex-1 overflow-y-auto px-6 py-4">` → `px-4 md:px-6`.
- O drawer de adicionar/editar exercício e os modais já usam `max-w` + responsivo — confirmar `mx-4` / `w-full max-w-*`, ajustar se algum não tiver.
- As seções recolhíveis (Hidratação, Recordes de Força, **Tempo de Execução** — recém-mergeada) já são blocos verticais simples, refluem sozinhas.

### 6. Header fixo vs. telas com header próprio

O header mobile do shell (`fixed`, `h-16` via `pt-16`) fica **acima** do conteúdo. As telas que já têm `<header>` próprio (`Dashboard`, `Alunos`, etc.) passam a ter dois "headers" empilhados no mobile (o do shell + o da tela). Aceitável — o do shell é fino (só hambúrguer/marca/sino), o da tela traz título e ações. Não fundir nesta rodada (fora de escopo, cada tela é dona do seu header).

## Não faz parte

- Extrair `ResponsiveShell` compartilhado entre Coach/Admin/Athlete (refator maior, risco ao AdminShell mergeado).
- Bottom-nav pro coach.
- Fundir o header do shell com o header de cada tela.
- Responsivo do `AthleteShell`/telas de atleta (já são `max-w-md` mobile-first).
- Qualquer mudança funcional (busca/filtro que não existem, KPIs que são mock) — só layout.
- Tela de treino ativo do atleta (`fixed inset-0`, já é mobile).

## Testing

- `npx ng build --configuration development` limpo após cada tela.
- Specs escopados onde já existem (`ng test --watch=false --include=...`); a maioria destas telas não tem spec — não criar scaffolding pesado só pra isso.
- **Verificação visual obrigatória** via Chrome headless/CDP em **375px** (mobile) e **1280px** (desktop), logado como coach (`luan@aevonfit.com` / `coach123`):
  - Shell: hambúrguer abre o drawer, overlay fecha, clicar num item navega e fecha, logout funciona, `<md>` não mostra a sidebar e `≥md` não mostra o header/hambúrguer.
  - Cada uma das 7 telas a 375px: sem scroll horizontal na página, nada cortado nas bordas, texto legível, ações alcançáveis.
  - Mensagens: 375px mostra lista → tocar abre chat full → "voltar" retorna; 1280px mostra os dois.
  - Plan-Builder: 375px abas de semana rolam horizontalmente, timeline ocupa a largura; 1280px abas em coluna à esquerda.
  - Regressão desktop: as 7 telas a 1280px iguais a antes.
- `console.error` zero (com `Console.enable` no CDP).

## Arquivos-chave

- `src/app/layout/coach-shell/coach-shell.component.{ts,html,scss}` — o drawer
- `src/app/layout/admin-shell/admin-shell.component.{ts,html}` — referência (não editar)
- `src/app/features/coach/dashboard/dashboard.component.html`
- `src/app/features/coach/students/students.component.html`
- `src/app/features/coach/plans/plans.component.html`
- `src/app/features/coach/library/library.component.html`
- `src/app/features/coach/messages/messages.component.{ts,html}`
- `src/app/features/coach/financial/financial.component.html`
- `src/app/features/coach/plan-builder/plan-builder.component.html`
- `src/styles.scss` — `@theme` tokens + animações `animate-slide-up`/`animate-fade-in` (já existem, usadas pelo AdminShell)
