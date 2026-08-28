# Responsivo do Painel do Coach — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o painel do coach (shell + 7 telas) funcionar no mobile: navegação via menu gaveta abaixo de 768px e reflow de cada tela pra não transbordar nem esconder conteúdo.

**Architecture:** Tailwind mobile-first, sem componente novo e sem mudança de API. O `CoachShellComponent` ganha o padrão de drawer do `AdminShellComponent` (sidebar `hidden md:flex` + header fixo `md:hidden` com hambúrguer + drawer condicional + overlay). Cada tela recebe um ajuste pontual (padding responsivo, linhas de largura fixa viram scroll/wrap, tipografia gigante com escala). Mensagens ganha um signal `mobileView` pra alternar lista/chat. Plan-Builder troca a coluna de semanas por faixa horizontal rolável no mobile.

**Tech Stack:** Angular 21 standalone + signals, TailwindCSS v4 (`@theme` em `src/styles.scss`, sem `tailwind.config.js`), esbuild (`@angular/build`).

**Spec:** `docs/superpowers/specs/2026-08-28-responsivo-painel-coach-design.md`

## Global Constraints

- **Breakpoint único: `md:` (768px)** — igual `AdminShellComponent` e `AthleteShell`. Nada de `sm:`/`lg:` novos pra decidir mobile vs desktop (grids já existentes que usam `lg:`/`xl:` pra número de colunas ficam como estão).
- **Zero mudança funcional** — só layout/CSS/markup. Não mexer em lógica de service, chamadas de API, validação, nem em texto de botão que não seja de layout.
- **Zero componente novo, zero mudança de API de componente.** Não extrair shell compartilhado. Não editar `admin-shell.component.*` (é só referência).
- **Regressão desktop = zero** — a ≥768px cada tela tem de renderizar idêntica ao que era antes. Toda classe nova é `md:`-prefixada ou só afeta `<md`.
- **Animações**: usar as que já existem em `src/styles.scss` — `animate-fade-in`, `animate-slide-up` (o AdminShell usa essas no drawer).
- **Ícones**: `material-symbols-outlined` (já carregado). Hambúrguer = `menu`, voltar = `arrow_back`.
- **Commits**: português, com trailer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Não `git push`, não merge. Branch: `feat/responsivo-painel-coach` (já criada, já tem o commit da spec).
- **Build gate por task**: `export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"; npx ng build --configuration development` — tem de passar (o warning pré-existente de Sass `@import` é ok).
- **Node**: `nvm use` não funciona em shell não-interativo — usar `export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"`.
- **Testes**: a maioria destas telas não tem `.spec.ts`. NÃO criar scaffolding de TestBed só pra isso. Onde um spec já existir, rodar escopado: `npx ng test --watch=false --include='**/<arquivo>.spec.ts'` (vitest 4, `vi` não `jest`). O gate real é `ng build` + a verificação visual da Task 6.

---

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `src/app/layout/coach-shell/coach-shell.component.ts` | + `mobileMenuOpen` signal + toggle/close; fechar drawer no `NavigationEnd` | 1 |
| `src/app/layout/coach-shell/coach-shell.component.html` | header fixo mobile + drawer + `<main>` com `pt-16 md:pt-0` | 1 |
| `src/app/features/coach/dashboard/dashboard.component.html` | `flex-col md:flex-row`, aside reordenada, escala de tipo, padding | 2 |
| `src/app/features/coach/students/students.component.html` | padding responsivo, stats bar → grid 3col mobile | 3 |
| `src/app/features/coach/plans/plans.component.html` | padding responsivo | 3 |
| `src/app/features/coach/library/library.component.html` | padding responsivo | 3 |
| `src/app/features/coach/financial/financial.component.html` | padding responsivo, filtros → scroll horizontal | 3 |
| `src/app/features/coach/messages/messages.component.ts` | + `mobileView` signal + `backToList()` | 4 |
| `src/app/features/coach/messages/messages.component.html` | lista/chat alternam no mobile, botão voltar | 4 |
| `src/app/features/coach/plan-builder/plan-builder.component.html` | `flex-col md:flex-row`, faixa de semanas horizontal no mobile, padding | 5 |

Referência (NÃO editar): `src/app/layout/admin-shell/admin-shell.component.{ts,html}`.

---

## Task 1: CoachShell — drawer mobile

**Files:**
- Modify: `src/app/layout/coach-shell/coach-shell.component.ts`
- Modify: `src/app/layout/coach-shell/coach-shell.component.html`

**Interfaces:**
- Consumes: nada novo (usa `navItems`, `isNavActive`, `openModal`, `logout`, `auth`, `NotificationsBellComponent` que já existem).
- Produces: `mobileMenuOpen: WritableSignal<boolean>`, `toggleMobileMenu()`, `closeMobileMenu()` no componente. Nada que outra task consuma.

- [ ] **Step 1: TS — adicionar os signals e o fechamento no NavigationEnd**

Em `coach-shell.component.ts`:

1. A linha `sidebarOpen = signal(false);` (linha ~25) está morta (não usada em nenhum lugar do HTML). Trocar por:
```ts
  mobileMenuOpen = signal(false);
```

2. Adicionar os métodos (perto de `logout()`, no fim da classe):
```ts
  toggleMobileMenu(): void { this.mobileMenuOpen.update(v => !v); }
  closeMobileMenu(): void { this.mobileMenuOpen.set(false); }
```

3. No `ngOnInit`, a subscription de `NavigationEnd` já existe (linha ~116). Adicionar o fechamento do drawer dentro dela:
```ts
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      this.currentUrl.set((e as NavigationEnd).urlAfterRedirects);
      this.mobileMenuOpen.set(false);
    });
```

- [ ] **Step 2: HTML — header fixo mobile**

Em `coach-shell.component.html`, logo DEPOIS do bloco de toast (`@if (toast()) { ... }`, termina ~linha 9) e ANTES do `<div class="flex mx-auto max-w-[1440px] h-screen ...">`, inserir:

```html
<!-- Header fixo (mobile, <768px) -->
<header class="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-background border-b border-outline-variant/10">
  <button type="button" (click)="toggleMobileMenu()" aria-label="Abrir menu"
    class="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors">
    <span class="material-symbols-outlined text-[24px]">menu</span>
  </button>
  <h1 class="text-base font-bold text-on-surface font-headline">Coach <span class="text-primary-fixed">PulseRx</span></h1>
  <app-notifications-bell />
</header>
```

- [ ] **Step 3: HTML — drawer mobile**

Logo depois do `<header>` do Step 2 (ainda antes do `<div class="flex mx-auto ...">`), inserir o drawer. Ele replica o conteúdo da `<aside>` desktop (marca, nav com `@for (item of navItems ...)`, CTA "Novo Treino", bloco usuário/logout), mas cada `<a>` e o botão "Novo Treino" chamam `closeMobileMenu()` além da ação, e a nav usa `routerLink`:

```html
<!-- Drawer (mobile, <768px) -->
@if (mobileMenuOpen()) {
  <div class="md:hidden fixed inset-0 z-50 flex animate-fade-in">
    <div class="absolute inset-0 bg-black/80" (click)="closeMobileMenu()"></div>
    <div class="relative w-64 h-full bg-background border-r border-outline-variant/10 flex flex-col py-8 animate-slide-up overflow-y-auto">

      <!-- Brand -->
      <div class="px-6 mb-8">
        <h1 class="text-xl font-bold text-on-surface font-headline">Coach Premium</h1>
        <p class="text-[10px] text-primary-fixed tracking-widest uppercase font-headline mt-0.5">Nível Elite</p>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-4 space-y-1">
        @for (item of navItems; track item.label) {
          @if (item.soon) {
            <span class="flex items-center gap-3 px-4 py-3 font-headline text-outline/40 cursor-not-allowed select-none">
              <span class="material-symbols-outlined text-[22px]">{{ item.icon }}</span>
              <span class="flex-1">{{ item.label }}</span>
              <span class="text-[9px] font-headline uppercase tracking-widest bg-surface-container px-1.5 py-0.5 rounded-sm">em breve</span>
            </span>
          } @else {
            <a [routerLink]="item.route" (click)="closeMobileMenu()"
               class="flex items-center gap-3 px-4 py-3 transition-all duration-200 font-headline hover:bg-surface-container/50 hover:text-on-surface"
               [class.bg-surface-container-high]="isNavActive(item.route)"
               [class.text-primary-fixed]="isNavActive(item.route)"
               [class.font-bold]="isNavActive(item.route)"
               [class.rounded-r-full]="isNavActive(item.route)"
               [class.text-outline]="!isNavActive(item.route)">
              <span class="material-symbols-outlined text-[22px]">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        }
      </nav>

      <!-- Novo Treino CTA -->
      <div class="px-6 pt-6">
        <button type="button" (click)="closeMobileMenu(); openModal()"
                class="w-full bg-primary-fixed hover:bg-primary-dim text-on-primary-fixed font-headline font-black py-4 rounded-md uppercase tracking-tighter transition-all flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[20px]">add</span>
          Novo Treino
        </button>
      </div>

      <!-- User + Logout -->
      <div class="px-6 pt-4 pb-2 border-t border-outline-variant/10 mt-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 rounded-sm bg-primary-fixed/20 text-primary-fixed flex items-center justify-center text-xs font-headline font-black flex-shrink-0">
            {{ auth.currentUser()?.name?.charAt(0)?.toUpperCase() ?? 'C' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-on-surface text-xs font-headline font-bold truncate">{{ auth.currentUser()?.name ?? 'Coach' }}</p>
            <p class="text-outline text-[10px] truncate">{{ auth.currentUser()?.email }}</p>
          </div>
        </div>
        <button type="button" (click)="logout()"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-outline hover:text-error hover:bg-error/10 font-headline text-xs uppercase tracking-wider transition-all">
          <span class="material-symbols-outlined text-[18px]">logout</span>
          Sair
        </button>
      </div>
    </div>
  </div>
}
```

- [ ] **Step 4: HTML — dar espaço pro header fixo no `<main>`**

Localizar o `<main class="flex-1 flex flex-col overflow-hidden">` (linha ~77) e trocar por:
```html
  <main class="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0">
```
A `<aside class="hidden md:flex w-64 ...">` desktop fica **exatamente como está** — nenhuma mudança.

- [ ] **Step 5: Build**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
npx ng build --configuration development
```
Expected: sucesso. Se `sidebarOpen` era referenciado em algum lugar que o grep não pegou, o build acusa — nesse caso manter `sidebarOpen` e adicionar `mobileMenuOpen` separado.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout/coach-shell
git commit -m "$(cat <<'EOF'
feat(coach-shell): menu gaveta mobile (drawer + hambúrguer)

Abaixo de 768px o painel do coach não tinha navegação nenhuma.
Espelha o padrão do AdminShellComponent.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Dashboard — reflow

**Files:**
- Modify: `src/app/features/coach/dashboard/dashboard.component.html`

**Interfaces:** nenhuma (só markup).

- [ ] **Step 1: Header — padding e busca**

Linha 4: `<header class="px-8 py-6 flex items-center justify-between flex-shrink-0">` → `class="px-4 md:px-8 py-4 md:py-6 flex items-center justify-between flex-shrink-0 gap-3"`.
Linha 7: `<h2 class="font-headline font-black text-3xl ...">` → `text-2xl md:text-3xl`.
Linha 9: a `<div class="flex items-center gap-3">` que envolve a busca → adicionar `hidden sm:flex` (a busca é um input morto; some no mobile pra não competir com o título).

- [ ] **Step 2: Wrapper de conteúdo → coluna no mobile**

Linha 21: `<div class="flex flex-1 overflow-hidden min-h-0">` → `<div class="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden min-h-0">`.

- [ ] **Step 3: Mover a `<aside>` pra ANTES da `<section>` e reordenar no `md:`**

Hoje a ordem no DOM é `<section>` (linhas 24-97) depois `<aside>` (linhas 100-109). Trocar a ordem: `<aside>` primeiro, `<section>` depois. E:
- `<aside class="w-60 px-5 py-0 pb-8 flex-shrink-0 overflow-y-auto">` → `class="w-full md:w-60 px-4 md:px-5 pt-4 md:pt-0 pb-4 md:pb-8 flex-shrink-0 md:overflow-y-auto md:order-2"`.
- `<section class="flex-1 px-8 pb-8 overflow-y-auto">` → `class="flex-1 px-4 md:px-8 pb-8 md:overflow-y-auto md:order-1"`.

Resultado: no mobile o card "Progresso do Mês" aparece primeiro (topo), depois o conteúdo; no `md:` volta pra direita via `order`.

- [ ] **Step 4: Hero**

Linhas 28-29: os dois `<h3 class="... text-5xl ...">` → `text-4xl md:text-5xl`.

- [ ] **Step 5: Build + commit**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
npx ng build --configuration development
git add src/app/features/coach/dashboard
git commit -m "feat(coach-dashboard): reflow mobile (coluna única, stat no topo)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Telas de grade — Alunos, Planos, Biblioteca, Financeiro (batch)

**Files:**
- Modify: `src/app/features/coach/students/students.component.html`
- Modify: `src/app/features/coach/plans/plans.component.html`
- Modify: `src/app/features/coach/library/library.component.html`
- Modify: `src/app/features/coach/financial/financial.component.html`

**Interfaces:** nenhuma. Quatro edições do mesmo tipo — padding `px-8` → `px-4 md:px-8` e algumas linhas de largura fixa. Os grids de card já são responsivos (`grid-cols-1 md:grid-cols-2 ...`) e os modais já usam `w-full max-w-* mx-4` — NÃO tocar neles.

- [ ] **Step 1: `students.component.html`**

- Linha 4: `<header class="px-8 py-6 flex items-center justify-between flex-shrink-0">` → `class="px-4 md:px-8 py-4 md:py-6 flex items-center justify-between flex-shrink-0 gap-3 flex-wrap"`.
- Linha 7: `<h2 class="... text-3xl ...">` → `text-2xl md:text-3xl`.
- Linha 18: `<div class="px-8 pb-4 flex gap-3 flex-shrink-0">` → `class="px-4 md:px-8 pb-4 grid grid-cols-3 gap-2 md:flex md:gap-3 flex-shrink-0"`. Os 3 filhos `<div class="... flex-1 ...">` mantêm `flex-1` (no grid o `flex-1` é inócuo, no `md:flex` funciona).
- Linha 34: `<div class="px-8 pb-4 flex-shrink-0">` → `px-4 md:px-8`.
- Linha 46: `<div class="flex-1 px-8 pb-8 overflow-y-auto">` → `px-4 md:px-8`.
- NÃO tocar no grid (linha 47) nem nos modais (128+).

- [ ] **Step 2: `plans.component.html`**

- Linha 4: `<header class="px-8 py-6 flex-shrink-0">` → `px-4 md:px-8 py-4 md:py-6`.
- Linha 6: `<h2 class="... text-3xl ...">` → `text-2xl md:text-3xl`.
- Linha 11: `<div class="flex-1 px-8 pb-8 overflow-y-auto">` → `px-4 md:px-8`.
- NÃO tocar nos grids (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).

- [ ] **Step 3: `library.component.html`**

- Linha 4: `<header class="px-8 py-6 flex items-center justify-between flex-shrink-0">` → `class="px-4 md:px-8 py-4 md:py-6 flex items-center justify-between flex-shrink-0 gap-3 flex-wrap"`.
- Linha 7: `<h2 class="... text-3xl ...">` → `text-2xl md:text-3xl`.
- Linha 16: `<div class="px-8 mb-4 flex-shrink-0">` (busca) → `px-4 md:px-8`.
- Linha 30 (aprox., `<div class="flex-1 px-8 pb-8 overflow-y-auto">`) → `px-4 md:px-8`.
- Grid já é `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` e o modal já é `items-end sm:items-center` + `rounded-t-md sm:rounded-md w-full sm:max-w-lg` — NÃO tocar.

- [ ] **Step 4: `financial.component.html`**

- Linha 4: `<header class="px-8 py-6 flex items-center justify-between flex-shrink-0">` → `class="px-4 md:px-8 py-4 md:py-6 flex items-center justify-between flex-shrink-0 gap-3 flex-wrap"`.
- Linha 7: `<h2 class="... text-3xl ...">` → `text-2xl md:text-3xl`.
- Linha ~19: `<div class="px-8 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">` → só `px-8` → `px-4 md:px-8` (o grid `grid-cols-2 lg:grid-cols-4` já é bom).
- Linha ~40: `<div class="px-8 mb-4 flex gap-2 flex-shrink-0">` (abas de filtro) → `class="px-4 md:px-8 mb-4 flex gap-2 flex-shrink-0 overflow-x-auto"` e cada botão de filtro dentro dele ganha `flex-shrink-0 whitespace-nowrap`.
- Procurar o container da lista/tabela de cobranças mais abaixo e trocar qualquer `px-8` remanescente por `px-4 md:px-8`. Se houver uma `<table>` de largura fixa, envolver num `<div class="overflow-x-auto">` (só se existir — inspecionar).

- [ ] **Step 5: Build**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
npx ng build --configuration development
```

- [ ] **Step 6: Commit**

```bash
git add src/app/features/coach/students src/app/features/coach/plans src/app/features/coach/library src/app/features/coach/financial
git commit -m "feat(coach): reflow mobile das telas de grade (Alunos, Planos, Biblioteca, Financeiro)

Padding responsivo + linhas de KPI/filtro que não transbordam.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Mensagens — lista OU chat no mobile

**Files:**
- Modify: `src/app/features/coach/messages/messages.component.ts`
- Modify: `src/app/features/coach/messages/messages.component.html`

**Interfaces:**
- Produces: `mobileView: WritableSignal<'list' | 'chat'>`, `backToList()` no componente.

- [ ] **Step 1: TS**

Em `messages.component.ts`:

1. Adicionar o signal (perto dos outros, linha ~30):
```ts
  mobileView = signal<'list' | 'chat'>('list');
```
`signal` já está importado.

2. No `openConversation()` (linha ~102), adicionar no fim do corpo:
```ts
    this.mobileView.set('chat');
```

3. Adicionar o método (perto de `onEnter`):
```ts
  backToList(): void { this.mobileView.set('list'); }
```

- [ ] **Step 2: HTML — lista alterna**

Em `messages.component.html`:

Linha 1: `<div class="flex h-full animate-fade-in overflow-hidden">` — sem mudança.

Linha 4: `<div class="w-72 flex-shrink-0 border-r border-outline-variant/10 flex flex-col">` →
```html
  <div class="w-full md:w-72 flex-shrink-0 border-r border-outline-variant/10 flex flex-col md:!flex"
       [class.hidden]="mobileView() === 'chat'">
```

- [ ] **Step 3: HTML — chat alterna + botão voltar**

O bloco do chat abre em `@if (selectedId()) {` (linha ~46) com `<div class="flex-1 flex flex-col overflow-hidden">`. Trocar por:
```html
  @if (selectedId()) {
    <div class="flex-1 flex flex-col overflow-hidden md:!flex" [class.hidden]="mobileView() === 'list'">
```

No header do chat (o `<div class="w-full max-w-2xl flex items-center gap-3">`, linha ~53), inserir como PRIMEIRO filho, antes do avatar:
```html
          <button type="button" (click)="backToList()" aria-label="Voltar para conversas"
            class="md:hidden w-8 h-8 -ml-1 flex items-center justify-center text-on-surface-variant hover:text-on-surface flex-shrink-0">
            <span class="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
```

- [ ] **Step 4: HTML — empty state (nenhuma conversa selecionada)**

Se existe um `@else` ou bloco pra quando `!selectedId()` (chat vazio), envolver com `class="hidden md:flex ..."` — no mobile, quando não há seleção, `mobileView` é `'list'` e a lista ocupa tudo, então o placeholder de "selecione uma conversa" não deve aparecer. Inspecionar o HTML; se o placeholder está dentro do `@if (selectedId())`/`@else`, adicionar `md:flex` + `hidden` no bloco do `@else`.

- [ ] **Step 5: Build + spec (se existir) + commit**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
npx ng build --configuration development
# se houver messages.component.spec.ts:
npx ng test --watch=false --include='**/coach/messages/messages.component.spec.ts' || echo "sem spec — ok"
git add src/app/features/coach/messages
git commit -m "feat(coach-messages): mobile alterna lista/chat com botão voltar

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Plan-Builder — faixa de semanas horizontal no mobile

**Files:**
- Modify: `src/app/features/coach/plan-builder/plan-builder.component.html`

**Interfaces:** nenhuma.

- [ ] **Step 1: Wrapper editor → coluna no mobile**

Localizar `<div class="flex-1 flex overflow-hidden min-h-0">` (linha ~273) → `<div class="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">`.

- [ ] **Step 2: `<aside>` das semanas → faixa horizontal**

Linha ~276: `<aside class="w-40 border-r border-outline-variant/10 flex-shrink-0 py-4 px-2 overflow-y-auto">` →
```html
    <aside class="w-full md:w-40 flex md:flex-col gap-2 md:gap-1 border-b md:border-b-0 md:border-r border-outline-variant/10 flex-shrink-0 py-3 md:py-4 px-3 md:px-2 overflow-x-auto md:overflow-y-auto">
```

Os botões dentro da `<aside>`:
- Os dois botões "Exportar Semana" / "Exportar Mês" (linhas ~278-282): adicionar `flex-shrink-0 whitespace-nowrap` à classe de cada.
- O `@for` dos botões de semana (`Semana {{ week.weekNumber }}`, linha ~283-292): o `<button>` ganha `flex-shrink-0 whitespace-nowrap` na lista de classes estáticas.
- Se os botões de semana estão dentro de um wrapper `<div>` com `space-y-*` ou `flex-col`, esse wrapper vira `<div class="flex md:flex-col gap-2 md:gap-1 flex-shrink-0">` — inspecionar a estrutura real e ajustar pra que no mobile todos os itens fiquem numa linha rolável.

- [ ] **Step 3: Timeline — padding**

Linha ~297: `<div class="flex-1 overflow-y-auto px-6 py-4">` → `px-4 md:px-6`.

- [ ] **Step 4: Cabeçalho do plan-builder + seções recolhíveis**

Inspecionar o topo do componente (linhas 1-40): o header com título do plano / seletor de semana atual / botões. Trocar qualquer `px-8`/`px-6` de container por `px-4 md:px-6`. As seções recolhíveis (Hidratação, Recordes de Força, Tempo de Execução) já são blocos verticais — checar que os `px-*` delas também escalam; se usam `px-8`, → `px-4 md:px-8` ou `px-5`.

- [ ] **Step 5: Drawer de exercício + modais**

Localizar o drawer de adicionar/editar exercício e o modal de cadastrar movimento. Confirmar que usam `w-full max-w-*` + `mx-4` (ou `items-end sm:items-center` + `rounded-t`). Se algum tiver largura fixa sem `w-full`/`max-w`, adicionar `w-full max-w-md mx-4`. Não redesenhar — só garantir que cabem a 375px.

- [ ] **Step 6: Build + commit**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
npx ng build --configuration development
git add src/app/features/coach/plan-builder
git commit -m "feat(coach-plan-builder): reflow mobile (semanas em faixa horizontal, padding)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Verificação visual (Chrome headless) + fechamento

**Files:** nenhum de produção (só verificação + fixes pontuais se algo transbordar).

- [ ] **Step 1: Subir o ambiente**

Backend e frontend já rodam localmente a partir da `main`/deste worktree (`:3000` / `:4200`), containers db/redis de pé. Confirmar:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4200/   # 200
```
Se o `ng serve` estiver servindo outra branch, reiniciar apontando pra este worktree.

- [ ] **Step 2: Chrome headless + CDP**

```bash
google-chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/rc-chrome-$$ about:blank &
```
Habilitar `Runtime`/`Console`/`Log`. Login como coach (`luan@aevonfit.com` / `coach123`) — **uma vez**, reusar a sessão (rate limit de 5/15min).

- [ ] **Step 3: Checklist — shell a 375px**

Setar viewport 375×812. Para cada rota (`/coach/dashboard`, `/coach/students`, `/coach/plans`, `/coach/library`, `/coach/messages`, `/coach/financial`, `/coach/plan-builder/<studentId>`):
- Header fixo com hambúrguer visível; sidebar desktop NÃO visível.
- Clicar no hambúrguer → drawer abre (nav + Novo Treino + Sair visíveis).
- Clicar num item de nav → navega E o drawer fecha.
- Clicar no overlay → fecha sem navegar.
- `document.documentElement.scrollWidth <= 375` (sem scroll horizontal na página) em TODAS as 7 telas.
- Nenhum texto/botão cortado nas bordas.

- [ ] **Step 4: Checklist — telas específicas a 375px**

- **Dashboard**: card "Progresso do Mês" aparece no topo, antes do gráfico. Hero não estoura.
- **Mensagens**: só a lista visível; tocar numa conversa → chat ocupa a tela, botão "←" visível; "←" volta pra lista.
- **Plan-Builder**: abas "Semana 1..N" numa faixa que rola na horizontal; timeline ocupa a largura toda; abrir o drawer de exercício → cabe na tela.
- **Financeiro**: abas de filtro rolam horizontalmente se não couberem; KPIs em 2 colunas.

- [ ] **Step 5: Checklist — regressão desktop a 1280px**

Viewport 1280×800. As 7 telas + shell: sidebar à esquerda como antes, sem header/hambúrguer, layout idêntico ao de antes da branch. Mensagens mostra lista + chat lado a lado. Plan-Builder com as semanas em coluna à esquerda.

- [ ] **Step 6: Console limpo**

Confirmar zero `console.error` e zero requisição 4xx/5xx (fora as de auth esperadas) durante toda a navegação.

- [ ] **Step 7: Fixes pontuais**

Se algum item falhar (transbordo, corte, drawer que não fecha), corrigir no arquivo da tela correspondente — mudança mínima, `md:`-safe — e re-verificar só aquele ponto. Commit separado por fix: `fix(coach-<tela>): <o que>`.

- [ ] **Step 8: Build de produção final**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
npx ng build --configuration production
```
Expected: OK (warnings pré-existentes de jspdf/html2canvas/Sass são aceitáveis).

- [ ] **Step 9: Registrar evidência**

Escrever um resumo da verificação (o que passou, screenshots/medidas) em
`docs/superpowers/plans/2026-08-28-responsivo-painel-coach-verificacao.md` e commitar.

---

## Self-Review

**1. Spec coverage:**

| Requisito da spec | Task |
|---|---|
| CoachShell drawer (header + drawer + overlay + pt-16) | 1 |
| Fechar drawer ao navegar | 1 (Step 1.3) |
| Drawer mantém Novo Treino + sino + usuário/logout | 1 (Step 3) |
| Sidebar desktop inalterada | 1 (Step 4 — "nenhuma mudança") |
| Dashboard: flex-col, aside no topo no mobile, escala de tipo, padding | 2 |
| Alunos/Planos/Biblioteca/Financeiro: padding + KPI/filtros | 3 |
| Mensagens: mobileView lista/chat + voltar | 4 |
| Plan-Builder: semanas horizontais + flex-col + padding | 5 |
| Header do shell + header da tela empilhados (aceito) | spec "Não faz parte" — nenhuma task funde |
| Breakpoint md: | Global Constraints |
| Zero mudança funcional / zero regressão desktop | Global Constraints + Task 6 Step 5 |
| Verificação 375 + 1280 nas 7 telas | 6 |

Sem lacunas.

**2. Placeholder scan:** As Tasks 3/4/5 têm passos "inspecionar a estrutura real e ajustar" para pontos onde o markup exato depende de linhas que variam (abas de filtro do financial, wrapper dos botões de semana do plan-builder, empty-state do messages). Isso é orientação de integração num arquivo grande, com a mudança concreta especificada (classe alvo → classe nova); não é placeholder de lógica. Todo o markup novo (header, drawer) está por extenso na Task 1.

**3. Type consistency:** `mobileMenuOpen` (Task 1) e `mobileView` (Task 4) são signals locais, não cruzam tasks. `closeMobileMenu`/`toggleMobileMenu`/`backToList` idem. Nenhuma task consome interface de outra — são 6 telas independentes + o shell. Ordem: Task 1 (shell) primeiro porque é o que destrava testar as outras; 2-5 em qualquer ordem; 6 por último.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-28-responsivo-painel-coach.md`.**

Duas opções:
1. **Subagent-Driven (recomendada)** — subagente por task, revisão entre tasks. Task 3 é batch (4 arquivos, 1 dispatch).
2. **Inline** — nesta sessão com checkpoints.

Worktree isolado via `superpowers:using-git-worktrees` antes de executar (a branch `feat/responsivo-painel-coach` já existe no checkout principal do frontend com o commit da spec — mover pra worktree ou executar no lugar).
