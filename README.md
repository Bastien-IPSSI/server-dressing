# server-dressing

Backend Node.js + TypeScript avec Fastify, Prisma, PostgreSQL/Supabase et Better Auth.

## Installation

Prérequis : Node.js 22+ et un projet Supabase.

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

La configuration minimale de `.env` comprend :

- les variables `SUPABASE_DB_*` ;
- `BETTER_AUTH_SECRET`, secret aléatoire d'au moins 32 caractères ;
- `BETTER_AUTH_URL`, URL publique du serveur, par exemple `http://localhost:3000` ;
- `APP_SCHEME=mogora`, identique au scheme Expo ;
- `CORS_ORIGINS`, liste d'origines web séparées par des virgules ;
- `GEMINI_API_KEY` et éventuellement `GEMINI_MODEL`.

Google est activé uniquement lorsque `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont tous les deux définis. L'URI de redirection locale à enregistrer dans Google Cloud est :

```text
http://localhost:3000/api/auth/callback/google
```

En développement, Fastify accepte toutes les origines CORS si `CORS_ORIGINS` est absente. En production, aucune origine web n'est acceptée par défaut : il faut renseigner explicitement les domaines déployés. Les requêtes natives Expo utilisent le cookie de session conservé dans SecureStore par le plugin Better Auth.

## Authentification

Better Auth est monté sous `/api/auth/*`. Les principaux endpoints sont :

- `POST /api/auth/sign-up/email` ;
- `POST /api/auth/sign-in/email` ;
- `POST /api/auth/sign-in/social` ;
- `GET /api/auth/get-session` ;
- `POST /api/auth/sign-out`.

Les routes métier protégées valident le cookie avec `auth.api.getSession`. Il n'existe plus de token Bearer, de refresh token applicatif ni de secret JWT.

La migration `20260728170000_replace_jwt_with_better_auth` est volontairement destructive : elle supprime les anciens comptes et toutes les données qui leur appartiennent, convertit les clés utilisateur en chaînes, puis crée les tables Better Auth `sessions`, `accounts` et `verifications`. Examiner le SQL avant de lancer `prisma migrate deploy`.

La collection Bruno conserve automatiquement le cookie après `Register` ou `Login`; exécuter l'une de ces requêtes avant les endpoints protégés.

## Analyse d'un vêtement

`POST /clothing/analyze` accepte une image JPEG, PNG, WebP, HEIC ou HEIF dans le champ multipart `image` (8 Mo maximum). La réponse utilise exclusivement les ENUM Prisma canoniques pour `category`, `color`, `material`, `season` et `style`. La clé Gemini reste exclusivement dans le backend.

## Gestion des vêtements

`PATCH /clothing/:id` permet de modifier le nom, la couleur, la matière, la saison et le style d'un vêtement. La catégorie attribuée lors de la création est volontairement immuable.

`DELETE /clothing/:id` supprime aussi, par cascade, les références du vêtement dans les tenues enregistrées et dans la sélection actuellement portée.

## Build et production

```bash
npm run build
npm start
```

Le serveur expose `/health` et la documentation Fastify sous `/docs`.

## Docker

```bash
docker compose up -d --build
docker compose run --rm migrate
```

Les migrations ne sont pas appliquées automatiquement au démarrage du conteneur API. Le service ponctuel `migrate` exécute explicitement `prisma migrate deploy` avec le fichier `.env` local, qui n'est jamais copié dans l'image.
