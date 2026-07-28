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

Renseigner dans `.env` :

- les informations de connexion Supabase (bouton **Connect** sur le dashboard du projet, ou Project Settings > Database) : `SUPABASE_DB_HOST`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_NAME` ;
- `GEMINI_API_KEY`, créée dans [Google AI Studio](https://aistudio.google.com/apikey) ;
- éventuellement `GEMINI_MODEL` pour remplacer `gemini-3.1-flash-lite`.

## Développement

```bash
npm run dev
```

## Analyse d'un vêtement

`POST /clothing/analyze` accepte une image JPEG, PNG, WebP, HEIC ou HEIF dans le champ multipart `image` (8 Mo maximum). La réponse contient uniquement des valeurs canoniques issues des ENUM autorisés :

```json
{
  "category": "TOP",
  "color": "BLUE",
  "material": "COTTON",
  "season": "SUMMER",
  "style": "CASUAL"
}
```

La clé Gemini reste exclusivement dans le backend. La matière vaut `UNKNOWN` lorsqu'elle ne peut pas être déterminée de manière raisonnable depuis la photo.

## Build & production

```bash
npm run build
npm start
```

## Docker

Prérequis : Docker Desktop lancé, et un `.env` rempli (voir Installation) — il n'est jamais copié dans l'image, juste monté au runtime via `env_file`.

### Lancer le serveur

```bash
docker compose up -d --build
```

Le serveur écoute sur `http://localhost:3000` (ou le port défini par `PORT` dans `.env`). Vérifier avec `curl http://localhost:3000/health`.

```bash
docker compose logs -f api   # suivre les logs
docker compose down          # arrêter
```

### Migrations (optionnel)

Les migrations ne sont **pas** appliquées automatiquement au démarrage du conteneur `api` (pour éviter d'exécuter des migrations concurrentes contre la base Supabase partagée à chaque redémarrage). Pour les appliquer manuellement :

```bash
docker compose run --rm migrate
```

Ce service ponctuel exécute `prisma migrate deploy` contre la base configurée dans `.env`, sans lancer le serveur.
