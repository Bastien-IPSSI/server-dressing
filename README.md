# server-dressing

Backend Node.js + TypeScript avec Fastify et Prisma (PostgreSQL).

## Prérequis

- Node.js 22+
- Une base PostgreSQL accessible

## Installation

```bash
npm install
cp .env.example .env
# renseigner DATABASE_URL dans .env
```

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
