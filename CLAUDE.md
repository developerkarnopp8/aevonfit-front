# CLAUDE.md — AEVONFIT Frontend

> Arquivo mantido pelo Claude Code. Atualizar sempre que houver mudanças relevantes na arquitetura, dependências, comandos ou decisões de projeto.

## Visão Geral

**AEVONFIT** é uma plataforma SaaS para gestão de academias. O frontend é construído em Angular 21 e consome a API REST do backend NestJS.

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Angular 21 |
| Linguagem | TypeScript |
| Estilos | SCSS |
| Componentes UI | Angular CDK + componentes próprios |
| Gráficos | Chart.js + ng2-charts |
| HTTP | HttpClient (Angular) |
| Roteamento | Angular Router |
| Formulários | Reactive Forms |
| Notificações | ngx-toastr |
| Gerenciador de pacotes | npm |

## Estrutura de Diretórios

```
frontend/
├── src/
│   ├── index.html
│   ├── main.ts
│   ├── styles.scss          # Estilos globais
│   ├── environments/        # environment.ts / environment.prod.ts
│   └── app/
│       ├── app.ts           # Componente raiz
│       ├── app-module.ts    # Módulo raiz
│       ├── app-routing-module.ts
│       ├── core/            # Serviços singleton, interceptors, guards
│       ├── features/        # Módulos de funcionalidades (lazy loaded)
│       ├── layout/          # Componentes de layout (sidebar, navbar, footer)
│       └── shared/          # Componentes, pipes e diretivas reutilizáveis
├── public/                  # Assets estáticos
├── angular.json
├── tsconfig.json
└── CLAUDE.md                # Este arquivo
```

## Comandos Principais

```bash
# Desenvolvimento
npm start                    # ng serve (http://localhost:4200)

# Build
npm run build                # Build de produção
npm run watch                # Build em modo watch (desenvolvimento)

# Testes
npm test                     # ng test (Karma + Jasmine)

# Lint
ng lint
```

## Configuração de Ambiente

Edite `src/environments/environment.ts` para desenvolvimento local:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

## Módulos de Funcionalidades (Features)

> Atualizar esta seção conforme novos módulos forem criados.

| Módulo | Rota | Descrição |
|--------|------|-----------|
| auth | `/auth` | Login, cadastro, recuperação de senha |

## Decisões Arquiteturais

- **Lazy loading**: todos os módulos de features são carregados sob demanda
- **Standalone components**: preferir componentes standalone (Angular 17+) em novos módulos
- **Auth guard**: rotas protegidas usam `AuthGuard` em `core/guards/`
- **HTTP Interceptors**: token JWT injetado automaticamente em todas as requisições autenticadas via interceptor em `core/interceptors/`
- **State local**: estado gerenciado localmente nos services (sem NgRx por enquanto); reavaliar se a complexidade crescer
- **Design responsivo**: mobile-first, breakpoints padrão (sm, md, lg, xl)

## Convenções de Código

- Um módulo Angular por domínio em `src/app/features/<nome>/`
- Componentes: `nome.component.ts` / `nome.component.html` / `nome.component.scss`
- Services singleton declarados em `core/services/`
- Interfaces e tipos em `shared/models/` ou dentro do módulo de domínio
- Imports absolutos via paths configurados em `tsconfig.json` (`@core/`, `@shared/`, etc.)

## Integração com Backend

- API base: `http://localhost:3000/api` (local) / `https://api.aevonfit.com/api` (produção)
- Autenticação: Bearer token JWT no header `Authorization`
- Refresh token: armazenado em cookie `HttpOnly` (a definir conforme implementação do backend)

---

_Última atualização: 2026-04-14 — Inicialização do projeto_
