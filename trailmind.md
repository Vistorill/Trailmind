# TrailMind — Prompt de Sprints (do zero ao produto completo)

> **Como usar este arquivo:** copie o prompt da sprint atual e cole no Cursor/Claude/outro agente de IA.  
> Cada sprint é **autocontida** e só deve implementar o escopo daquela sprint — nada além.  
> Só avance para a próxima sprint quando todos os **Critérios de aceite** estiverem verdes.

---

## Visão do produto

**TrailMind** é um SaaS de estudo Salesforce Trailhead com IA, em português brasileiro.  
Funciona como um "professor particular": o aluno importa conteúdo, a IA analisa, gera quiz/flashcards, detecta lacunas e acompanha progresso até certificação.

**Método de estudo 5C:** Capturar → Compreender → Consolidar → Corrigir → Certificar.

---

## Stack fixa (não mudar entre sprints)

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 + Wouter |
| Backend | Node.js + Express 5 + tRPC v11 |
| Banco | MySQL 8 + Drizzle ORM |
| Auth | JWT em cookie httpOnly (`app_session_id`) |
| IA (sprints futuras) | OpenRouter (API compatível OpenAI) |
| Pagamentos (sprint futura) | Stripe |
| Testes | Vitest |

**Estrutura de pastas alvo:**

```
trailmind/
├── client/           # React SPA
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── lib/
│       └── _core/hooks/
├── server/           # Express + tRPC
│   ├── index.ts
│   ├── _core/        # db, env, trpc, context, auth
│   ├── routers/
│   └── services/
├── drizzle/          # schema.ts
├── shared/           # const, types, plans
├── .env.example
├── package.json
└── vite.config.ts
```

**Identidade visual (desde a Sprint 0):**
- Tema escuro: fundo `slate-950`, cards `slate-900`, bordas `slate-800`
- Cor de marca (brand): teal/cyan (`#2dd4bf` ou similar)
- Tipografia limpa, cantos arredondados (`rounded-2xl`), sombras suaves
- Mobile-first com sidebar colapsável

---

# SPRINT 0 — Fundação mínima (Login + Register + Dashboard + Configurações)

> **Escopo EXATO desta sprint:** autenticação, shell da aplicação, dashboard vazio com boas-vindas, e página de configurações com um único item editável (nome).  
> **NÃO implementar ainda:** onboarding, análise de trilha, quiz, flashcards, billing, IA, gamificação, comunidade, landing elaborada.

---

## Prompt — Sprint 0 (copie e cole)

```
Você vai criar o projeto TrailMind do ZERO — um SaaS de estudo Salesforce com IA.

## REGRA DE OURO
Implemente APENAS o escopo desta sprint. Não adicione features futuras, nem stubs vazios de módulos que virão depois. Código mínimo, funcional e testável.

## Stack obrigatória
- Monorepo: client/ (React 19 + Vite + Tailwind v4 + Wouter) + server/ (Express 5 + tRPC v11)
- MySQL 8 + Drizzle ORM
- Auth: JWT em cookie httpOnly chamado `app_session_id`
- Comunicação: tRPC com superjson, credentials include
- TypeScript strict em todo o projeto

## 1. Bootstrap do projeto

Crie package.json com scripts:
- `dev` — tsx watch server/index.ts (porta 3001)
- `dev:client` — vite (porta 5173, proxy /api → localhost:3001)
- `dev:full` — concurrently API + client
- `build`, `build:server`, `build:client`, `start`
- `db:push`, `db:generate`, `db:studio`
- `test` — vitest run

Instale dependências: express, cors, cookie-parser, @trpc/server, @trpc/client, @trpc/react-query, @tanstack/react-query, superjson, zod, drizzle-orm, mysql2, jsonwebtoken, dotenv, react, react-dom, wouter, sonner, lucide-react, clsx, tailwind-merge, class-variance-authority, @radix-ui/react-slot, @radix-ui/react-label.

Dev: typescript, tsx, vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, drizzle-kit, vitest, concurrently, wait-on, esbuild.

## 2. Banco de dados — schema mínimo

Arquivo `drizzle/schema.ts` com UMA tabela:

### users
- id: int, PK, autoincrement
- openId: varchar(255), unique, not null  (identificador externo; em dev usar `dev_{timestamp}`)
- email: varchar(320), unique
- name: varchar(255), nullable
- passwordHash: varchar(255), nullable  (bcrypt ou argon2 — OBRIGATÓRIO para register real)
- role: enum ['user', 'admin'], default 'user'
- createdAt: timestamp, default now
- updatedAt: timestamp, on update now

NÃO criar ainda: trails, quizzes, flashcards, subscriptions, etc.

## 3. Backend

### 3.1 server/_core/env.ts
Carregar dotenv. Variáveis:
- DATABASE_URL (obrigatório)
- JWT_SECRET (obrigatório, min 32 chars)
- PORT (default 3001)
- NODE_ENV

### 3.2 server/_core/db.ts
Pool mysql2 + drizzle. Exportar getDb().

### 3.3 server/_core/trpc.ts
- initTRPC com superjson
- publicProcedure
- protectedProcedure (exige ctx.user, senão UNAUTHORIZED)
- router helper

### 3.4 server/_core/context.ts
Ler cookie `app_session_id`, verificar JWT, buscar user no banco.
Retornar { req, res, user } onde user é null se não autenticado.

Tipo User exposto ao tRPC: { id, openId, name, email, role }

### 3.5 Auth — rotas REST (server/_core/auth.ts ou authRoutes.ts)

POST /api/auth/register
Body: { email, password, name? }
- Validar email único
- Hash da senha (bcrypt, cost 10)
- Criar user com openId = `local_{uuid}`
- Gerar JWT { userId }, setar cookie httpOnly
- Retornar { ok: true, user: { id, name, email } }

POST /api/auth/login
Body: { email, password }
- Buscar user por email
- Comparar senha com hash
- Se inválido: 401 { error: "E-mail ou senha inválidos" }
- Setar cookie, retornar user

POST /api/auth/logout
- clearCookie

GET /api/auth/me
- Retornar { user } ou { user: null }

Cookie options:
- httpOnly: true
- sameSite: 'lax'
- secure: true em production
- maxAge: 30 dias

### 3.6 tRPC routers (mínimo)

server/routers/auth.ts:
- me: protectedProcedure → retorna ctx.user

server/routers/profile.ts:
- get: protectedProcedure → retorna { id, name, email }
- update: protectedProcedure
  input: z.object({ name: z.string().min(1).max(255) })
  → atualiza users.name

server/routers/index.ts → appRouter com auth + profile

### 3.7 server/index.ts
- cors({ origin: true, credentials: true })
- cookieParser()
- express.json()
- GET /api/health → { ok: true, ts: Date.now() }
- Montar rotas REST de auth
- tRPC em /api/trpc
- Em production: servir client/dist estático

## 4. Frontend

### 4.1 Setup
- vite.config.ts: alias @ → client/src, proxy /api → :3001
- tailwind v4 com tema escuro
- CSS variables: --brand, --brand-foreground
- trpc client + QueryClientProvider em App.tsx

### 4.2 Hook useAuth (client/src/_core/hooks/useAuth.ts)
- GET /api/auth/me no mount
- login(email, password) → POST /api/auth/login
- register(email, password, name?) → POST /api/auth/register
- logout() → POST /api/auth/logout
- Expor: { user, loading, login, register, logout }

### 4.3 Rotas (client/src/App.tsx)

| Rota | Componente | Proteção |
|------|------------|----------|
| / | Landing (mínima) | pública |
| /auth | Auth | pública, redirect se logado |
| /auth?mode=signup | Auth (cadastro) | pública |
| /dashboard | Dashboard | protegida |
| /settings | Settings | protegida |

ProtectedRoute: se !user → redirect /auth

Após login/register → redirect /dashboard

### 4.4 Página Landing (/)
Mínima: logo TrailMind, tagline "Estude Salesforce Trailhead com IA", botões "Entrar" e "Criar conta".

### 4.5 Página Auth (/auth)
- Modo signin vs signup via query ?mode=signup
- Campos: email, senha (min 6 chars)
- Signup: campo nome opcional
- Submit chama login ou register do useAuth
- Link alternar entre entrar/criar conta
- Toast de sucesso/erro (sonner)
- Visual: card centralizado, fundo escuro, logo no topo

### 4.6 AppShell + Sidebar

Componentes:
- AppShell: layout flex, sidebar + main
- AppSidebar: logo, nav, user info, logout

**IMPORTANTE — Sidebar com APENAS 2 itens de navegação:**
1. Dashboard → /dashboard (ícone Home ou LayoutDashboard)
2. Configurações → /settings (ícone Settings)

Rodapé da sidebar: avatar/inicial do usuário, nome, botão Sair.

Mobile: hamburger menu, sidebar overlay.

NÃO adicionar outros itens de menu nesta sprint.

### 4.7 Página Dashboard (/dashboard)
Dentro do AppShell:
- Saudação: "Olá, {nome} 👋"
- Subtítulo: "Bem-vindo ao TrailMind. Configure seu perfil para começar."
- Card simples com CTA link para /settings: "Complete suas configurações"
- Estado vazio elegante — sem widgets de progresso, quiz, trilhas, etc.

### 4.8 Página Settings (/settings)
Dentro do AppShell:
- Título: "Configurações"
- **Um único campo editável:** Nome (input text)
- E-mail exibido como readonly (não editável)
- Botão "Salvar" → trpc.profile.update
- Toast sucesso/erro
- Loading state enquanto carrega profile.get

NÃO incluir ainda: nível de aprendizado, meta de certificação, minutos de estudo, idioma, billing, badges.

## 5. shared/const.ts
export const SESSION_COOKIE_NAME = "app_session_id";

## 6. .env.example
```
DATABASE_URL=mysql://root:senha@localhost:3306/trailmind
JWT_SECRET=trocar_por_string_aleatoria_min_32_caracteres
PORT=3001
NODE_ENV=development
```

## 7. Testes mínimos (vitest)
- Teste unitário: validação zod do profile.update (name obrigatório)
- Teste de integração opcional: register + login flow (se possível com mock db)

## 8. Critérios de aceite — Sprint 0

- [ ] `npm install && npm run db:push && npm run dev:full` sobe sem erro
- [ ] Landing abre em localhost:5173
- [ ] Criar conta com email/senha/nome funciona
- [ ] Login com credenciais corretas funciona
- [ ] Login com senha errada retorna erro amigável
- [ ] Logout limpa sessão e redireciona
- [ ] /dashboard inacessível sem login
- [ ] Dashboard mostra saudação com nome do usuário
- [ ] Sidebar tem SOMENTE Dashboard + Configurações (+ logout)
- [ ] Settings salva e persiste o nome após reload
- [ ] E-mail aparece readonly em Settings
- [ ] Layout responsivo (mobile + desktop)
- [ ] GET /api/health retorna 200

## 9. O que NÃO fazer nesta sprint
- OpenAI / OpenRouter / qualquer IA
- Tabela trails, quizzes, flashcards
- Onboarding wizard
- Stripe / billing
- OAuth Salesforce
- Mais de 2 itens no menu lateral
- Landing page elaborada com features/pricing
- Gamificação, comunidade, certificados
```

---

# SPRINT 1 — Onboarding + Perfil completo

> **Pré-requisito:** Sprint 0 100% verde.

## Prompt — Sprint 1

```
Continuar o projeto TrailMind. Sprint 0 já está pronta (auth + dashboard + settings básico).

## Escopo desta sprint APENAS
1. Onboarding pós-cadastro
2. Expandir Settings com campos de perfil de estudo
3. Expandir schema users

## NÃO implementar ainda
Análise de trilha, quiz, flashcards, IA, billing.

## Schema — alterar users
Adicionar colunas:
- learningLevel: enum ['beginner','intermediate','advanced'], default 'beginner'
- studyGoalCertification: varchar(100), nullable  (ex: "Administrator", "Platform Developer")
- dailyStudyMinutes: int, default 30
- preferredLanguage: varchar(10), default 'pt-BR'
- onboardingCompleted: boolean, default false

Criar tabela user_progress (para uso futuro, mínima agora):
- id, userId (unique FK users), streakDays default 0, lastActivityAt, updatedAt

Ao registrar novo user, criar row em user_progress.

## Backend
profile.update — expandir input:
- learningLevel, studyGoalCertification, dailyStudyMinutes (5-480), preferredLanguage, onboardingCompleted

## Frontend

### Onboarding (/onboarding)
- Rota protegida
- Se user.onboardingCompleted === false e tentar acessar /dashboard → redirect /onboarding
- Wizard 3 passos:
  1. Nível: Iniciante / Intermediário / Avançado (cards selecionáveis)
  2. Meta: select ou input "Qual certificação Salesforce você busca?"
  3. Tempo: slider ou input "Minutos de estudo por dia" (5-120)
- Botão "Começar" → profile.update({ ...campos, onboardingCompleted: true }) → /dashboard

### Settings — expandir
Adicionar campos:
- Nível de aprendizado (radio/select)
- Meta de certificação (input)
- Minutos de estudo/dia (number)
- Idioma preferido (select: pt-BR, en-US)

Manter nome + email readonly.

### Dashboard
- Se onboardingCompleted false → banner "Complete seu onboarding" com link
- Se true → mensagem motivacional baseada em studyGoalCertification

### Sidebar
Continua com APENAS Dashboard + Configurações (não adicionar novos itens ainda).

## Critérios de aceite
- [ ] Novo usuário é redirecionado ao onboarding após register
- [ ] Onboarding salva todos os campos e marca onboardingCompleted
- [ ] Usuário existente com onboarding completo vai direto ao dashboard
- [ ] Settings edita e persiste todos os campos de perfil
- [ ] user_progress criado no register
```

---

# SPRINT 2 — Análise de trilha (core IA #1)

> **Pré-requisito:** Sprint 1 verde. Requer `OPENAI_API_KEY` (OpenRouter).

## Prompt — Sprint 2

```
Continuar TrailMind. Sprints 0-1 prontas.

## Escopo APENAS
Importar e analisar conteúdo Trailhead com IA. Primeiro módulo de estudo.

## Schema — novas tabelas

### trails
- id, userId (FK), title, url nullable, contentHash, content (text)
- summary, explanation, examples, tips (text — output da IA)
- importQuality: enum ['full','partial','failed']
- fetchedAt, createdAt

### study_history
- id, userId, trailId nullable, type enum ['trail_analyzed'], durationMinutes, createdAt

Atualizar user_progress:
- totalTrailsAnalyzed, lastActivityAt

## Backend

### server/_core/llm.ts
- Cliente OpenAI apontando para https://openrouter.ai/api/v1
- invokeLLM(messages, jsonMode?) → string
- Env: OPENAI_API_KEY, OPENAI_MODEL (default openai/gpt-4o-mini)

### server/services/fetchTrailhead.ts
- fetchTrailheadContent(url) → { title, content, quality }
- Usar fetch + cheerio para extrair texto da página Trailhead
- Timeout 15s, tratar falhas gracefully

### server/services/analyzeContent.ts
- analyzeStudyContent(content, title, level) → { summary, explanation, examples, tips }
- Prompt em PT-BR, adaptado ao learningLevel do user
- Retorno JSON

### server/routers/trails.ts
- analyzeUrl: input { url }, protectedProcedure
  → fetch → analyze → insert trail → update progress → history
- analyzeContent: input { title, content }, protectedProcedure (texto colado)
- list: retorna trilhas do user (id, title, createdAt, summary preview)
- getById: detalhe completo de uma trilha

## Frontend

### Sidebar — adicionar 1 item
- "Analisar Trilha" → /analyze

### Página /analyze
- Tabs: "URL do Trailhead" | "Colar conteúdo"
- Tab URL: input URL + botão "Analisar"
- Tab texto: input título + textarea conteúdo + botão
- Loading state com mensagem "A IA está analisando..."
- Resultado: cards com Resumo, Explicação, Exemplos, Dicas (markdown simples)
- Lista lateral ou abaixo: "Suas trilhas analisadas" (trails.list)

### Dashboard
- Card "Suas trilhas" com contagem (totalTrailsAnalyzed)
- Se zero trilhas: empty state com CTA → /analyze

## Critérios de aceite
- [ ] Analisar URL Trailhead real gera resumo coerente
- [ ] Colar texto manual funciona
- [ ] Trilhas persistem no banco e aparecem na listagem
- [ ] Progresso totalTrailsAnalyzed incrementa
- [ ] Erro de URL inválida mostra mensagem amigável
- [ ] Sidebar: Dashboard + Analisar Trilha + Configurações
```

---

# SPRINT 3 — Quiz + Lacunas (weak topics)

## Prompt — Sprint 3

```
Continuar TrailMind. Sprints 0-2 prontas.

## Escopo APENAS
Quiz gerado por IA a partir de trilhas + registro de erros + tópicos fracos.

## Schema

### quizzes
- id, userId, trailId, question (text), options (json array), correctAnswer, explanation, difficulty, createdAt

### quiz_responses
- id, userId, quizId, selectedAnswer, isCorrect, answeredAt

### weak_topics
- id, userId, trailId nullable, topicId, topicName, errorCount, correctCount, masteryLevel, lastErrorAt, isResolved

Atualizar user_progress: totalQuizzesTaken, totalCorrectAnswers, averageQuizScore

## Backend

### trails.generateQuiz
- Input: trailId, count (default 5)
- LLM gera N questões múltipla escolha (A-D) em JSON
- Salva em quizzes

### quiz router
- getForTrail(trailId) → questões sem gabarito exposto separadamente
- submitBatch: [{ quizId, selectedAnswer }] → corrige, salva responses, atualiza weak_topics nos erros, retorna score

### weakTopics router
- list → tópicos não resolvidos ordenados por errorCount

## Frontend

### Sidebar +1 item
- "Quiz" → /quiz

### /quiz
- Select trilha analisada
- Botão "Gerar quiz" (5 questões)
- UI questão por questão ou lista com submit final
- Resultado: score %, revisão de erros com explicação
- Link "Ver lacunas" → painel weak topics

### Dashboard
- Card "Lacunas de conhecimento" (top 3 weak topics ou empty state)
- Card score médio de quiz

## Critérios de aceite
- [ ] Quiz gerado coerente com conteúdo da trilha
- [ ] Submit calcula score corretamente
- [ ] Erros incrementam weak_topics
- [ ] Acertos incrementam correctCount e podem resolver tópico
```

---

# SPRINT 4 — Flashcards + Repetição espaçada (SM-2)

## Prompt — Sprint 4

```
Continuar TrailMind. Sprints 0-3 prontas.

## Escopo APENAS
Flashcards com algoritmo SM-2.

## Schema — flashcards
- id, userId, trailId nullable, front, back, difficulty
- reviewCount, nextReview, interval, easeFactor (decimal 2.50), lastReviewed, createdAt

## Backend

### server/lib/spacedRepetition.ts
Implementar SM-2 puro:
- calculateNextReview(quality 0-5, interval, easeFactor, reviewCount) → { interval, easeFactor, nextReview }

### trails.generateFlashcards
- Input trailId, count (default 10)
- LLM gera pares front/back

### flashcards router
- listDue → cards onde nextReview <= now
- review: input { id, quality 0-5 } → atualiza SM-2 fields

## Frontend

### Sidebar +1
- "Flashcards" → /flashcards

### /flashcards
- Gerar de trilha existente
- Modo revisão: mostra front → flip → avaliar (Errei / Difícil / Bom / Fácil)
- Contador "X cards para revisar hoje"

## Critérios de aceite
- [ ] Cards gerados e persistidos
- [ ] SM-2 agenda nextReview corretamente (teste unitário)
- [ ] listDue retorna só cards vencidos
```

---

# SPRINT 5 — Chat Mentor + Histórico

## Prompt — Sprint 5

```
Continuar TrailMind. Sprints 0-4 prontas.

## Schema

### chat_messages
- id, userId, role enum ['user','assistant'], content, trailId nullable, createdAt

Expandir study_history.type: 'chat_message', 'quiz_completed', 'flashcard_review'

## Backend

### chat router
- history(limit 50) → mensagens recentes
- send: input { message, trailId? }
  → monta contexto com perfil user + optional trail summary
  → invokeLLM → salva user msg + assistant msg
  → study_history

### history router
- list: paginação por tipo/data

## Frontend

### Sidebar +2
- "Chat Mentor" → /chat
- "Histórico" → /history

### /chat
- Interface estilo chat (bolhas user/assistant)
- Input + enviar
- Opcional: select trilha como contexto

### /history
- Timeline de atividades (trail_analyzed, quiz, flashcard, chat)

## Critérios de aceite
- [ ] Chat responde em PT-BR sobre Salesforce
- [ ] Histórico registra todas as ações
```

---

# SPRINT 6 — Quotas + Billing (Stripe)

## Prompt — Sprint 6

```
Continuar TrailMind. Sprints 0-5 prontas.

## Schema

### subscriptions
- id, userId, stripeCustomerId, stripeSubscriptionId, planName enum ['pro','enterprise'], status, currentPeriodEnd

### usage_quotas
- id, userId, feature, usedCount, monthYear (YYYY-MM)

## shared/plans.ts
PlanTier: free | pro | enterprise
PLAN_LIMITS por feature: trail_analyze, quiz_answer, chat_message, flashcard_review, visual_analysis
(-1 = ilimitado, 0 = bloqueado)

## Backend

### server/services/usageQuota.ts
- getUserPlanTier(user)
- assertQuota(user, feature) → throw FORBIDDEN se excedeu
- incrementQuota(user, feature)

Integrar assertQuota em: trails.analyze*, quiz.submit*, chat.send, flashcards.review

### server/_core/stripe.ts + stripeWebhook.ts
- Checkout session
- Portal session
- Webhook: subscription created/updated/deleted

### billing router
- getSummary: plano atual + uso do mês
- createCheckout(plan, interval)
- createPortal

## Frontend

### Sidebar +1
- "Billing" → /billing (ou link dentro de Settings)

### UpgradeModal
- Quando API retorna QUOTA_EXCEEDED → modal com CTA upgrade

### /billing
- Cards dos 3 planos
- Uso atual vs limite
- Botão assinar / gerenciar assinatura

## Critérios de aceite
- [ ] Plano free bloqueia após limite mensal
- [ ] Stripe checkout funciona (test mode)
- [ ] Webhook ativa plano pro
```

---

# SPRINT 7 — Cursos + Certificados PDF

## Prompt — Sprint 7

```
Continuar TrailMind. Sprints 0-6 prontas.

## Schema
- courses (slug, title, description, modules json)
- course_enrollments (userId, courseId, progress, completedAt)
- certificates (userId, courseId, studentName, courseTitle, verifyCode unique, issuedAt)

## Backend
- courses.list, getBySlug, enroll, markModuleComplete
- Ao 100% progress → gera certificate + verifyCode UUID curto
- GET /api/certificates/verify/:code (público)
- GET /api/certificates/:code/pdf (pdf-lib + QR code)

## Frontend
- Sidebar: "Cursos" → /courses, /courses/:slug
- /certificates (meus certificados)
- /certificates/verify/:code (público)

## Critérios de aceite
- [ ] Fluxo enroll → módulos → certificado
- [ ] PDF baixável com QR verificação
```

---

# SPRINT 8 — Gamificação

## Prompt — Sprint 8

```
## Schema
- user_points, badges, user_badges, point_events

## Backend
- awardPoints(userId, event, metadata)
- Eventos: trail_completed, quiz_perfect, streak_day
- gamification.getSummary, leaderboard top 20

## Frontend
- Sidebar: Leaderboard, badges no dashboard/settings
- Streak display no dashboard

## Critérios de aceite
- [ ] Pontos ao completar ações
- [ ] Badges desbloqueados automaticamente
```

---

# SPRINT 9 — Comunidade (Fórum + Grupos)

## Prompt — Sprint 9

```
## Schema
- forum_topics, forum_posts
- study_groups, study_group_members

## Backend + Frontend
- /community — lista fórum + grupos
- /community/topic/:id
- /community/groups/:id
- Moderação básica anti-spam

## Critérios de aceite
- [ ] Criar tópico, responder, criar grupo, entrar no grupo
```

---

# SPRINT 10 — Analytics + Plano IA + Integrações

## Prompt — Sprint 10

```
## Escopo
- Dashboard analytics (recharts): progresso semanal, score quiz, tempo estudo
- /study-plan — roadmap IA personalizado ("Quero ser Admin em 3 meses")
- /integrations — Salesforce OAuth callback, API keys (/api/v1/trails)
- /visual — análise de imagem com LLM vision
- Export PDF/CSV do progresso

## Critérios de aceite
- [ ] Gráficos renderizam dados reais
- [ ] Plano IA gera milestones
- [ ] API key autentica requests externos
```

---

# SPRINT 11 — Landing + Polish + Deploy

## Prompt — Sprint 11

```
## Escopo
- Landing page completa: hero, features, pricing, FAQ, CTA
- SEO meta tags
- Error boundaries, skeleton loaders
- CI GitHub Actions (test + build)
- DEPLOY.md com instruções produção
- Testes E2E críticos

## Critérios de aceite
- [ ] npm test passa
- [ ] npm run build passa
- [ ] Deploy documentado
```

---

## Ordem de sprints (resumo)

| Sprint | Entrega | Itens no menu após concluir |
|--------|---------|----------------------------|
| **0** | Login, Register, Dashboard, Settings (nome) | Dashboard, Configurações |
| **1** | Onboarding + perfil completo | (mesmos 2) |
| **2** | Análise de trilha IA | + Analisar Trilha |
| **3** | Quiz + lacunas | + Quiz |
| **4** | Flashcards SM-2 | + Flashcards |
| **5** | Chat + Histórico | + Chat Mentor, Histórico |
| **6** | Billing Stripe | + Billing |
| **7** | Cursos + certificados | + Cursos |
| **8** | Gamificação | + Leaderboard |
| **9** | Comunidade | + Comunidade |
| **10** | Analytics, Plano IA, Integrações, Visual | + Analytics, Plano IA, Integrações, Análise Visual |
| **11** | Landing, polish, deploy | Produto completo |

---

## Dicas para usar com IA

1. **Uma sprint por conversa** — evita escopo creep.
2. **Cole o prompt inteiro** da sprint, não resuma.
3. **Peça para rodar** `npm run dev:full` e testar os critérios de aceite antes de fechar.
4. **Se a IA adicionar features extras**, peça para remover — só o escopo da sprint.
5. **Commits sugeridos:** `feat(sprint-0): auth and minimal dashboard`, `feat(sprint-2): trail analysis with AI`, etc.
6. **Após Sprint 0**, sempre diga: *"O projeto TrailMind já existe. Implemente APENAS a Sprint N abaixo, sem refatorar o que já funciona."*

---

## Comando rápido para iniciar Sprint 0

```bash
mkdir trailmind && cd trailmind
# Cole o prompt da Sprint 0 no Cursor Agent
# Depois:
cp .env.example .env
# Edite DATABASE_URL e JWT_SECRET
npm install
npm run db:push
npm run dev:full
```
