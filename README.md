# server-dressing

Backend Node.js + TypeScript avec Fastify et Prisma (PostgreSQL via Supabase).

## Prérequis

- Node.js 22+
- Un projet Supabase (Project Settings > Database > Connection string)

## Installation

```bash
npm install
cp .env.example .env
```

Renseigner dans `.env` les infos de connexion Supabase (bouton **Connect** sur le dashboard du projet, ou Project Settings > Database) : `SUPABASE_DB_HOST`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_NAME`.

## Développement

```bash
npm run dev
```

## Migrations Prisma

```bash
npm run prisma:migrate         # crée et applique une migration en dev
npm run prisma:migrate:deploy  # applique les migrations (prod/CI)
npm run prisma:generate        # régénère le client Prisma
npm run prisma:studio          # explorer la base de données
```

## Build & production

```bash
npm run build
npm start
```
