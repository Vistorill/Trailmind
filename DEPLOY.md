# TrailMind — Deploy em Produção

## Pré-requisitos

- Node.js 20+
- MySQL 8
- Conta OpenRouter (para IA)
- Conta Stripe (para billing, opcional)

## Variáveis de ambiente

```bash
DATABASE_URL=mysql://user:pass@host:3306/db_trailmix
JWT_SECRET=string_aleatoria_minimo_32_caracteres
PORT=3001
NODE_ENV=production
OPENAI_API_KEY=sk-or-...
OPENAI_MODEL=openai/gpt-4o-mini
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
```

## Build e start

```bash
npm install
npm run db:push
npm run build
npm start
```

O servidor Express serve o client estático em produção na mesma porta.

## CI (GitHub Actions)

O workflow em `.github/workflows/ci.yml` executa testes e build em cada push.

## Banco de dados

```bash
# Criar database
mysql -u root -p -e "CREATE DATABASE db_trailmix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Aplicar schema
npm run db:push
```

## Stripe Webhook

Configure o endpoint: `https://seu-dominio.com/api/stripe/webhook`

Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
