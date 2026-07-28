# AGENTS.md

## Scope

These instructions apply to the entire `server-dressing` repository. This repository is the backend API for the dressing application. The mobile client lives in the sibling `mobile_dressing` repository and must not be changed unless the task explicitly asks for a coordinated client change.

## Project overview

- Runtime: Node.js 22+
- Language: TypeScript with strict mode enabled
- HTTP framework: Fastify 5
- API documentation: `@fastify/swagger` and `@fastify/swagger-ui`
- Database: PostgreSQL hosted by Supabase
- ORM: Prisma 7 with the `@prisma/adapter-pg` driver adapter
- Authentication: JWT tokens and passwords hashed with `bcryptjs`
- Package manager: npm; `package-lock.json` is the source of truth
- Local API collection: Bruno files under `bruno/`

## Important paths

- `src/index.ts`: Fastify application setup, global plugins, route registration, startup, and graceful shutdown
- `src/routes/`: route modules and their request/response schemas
- `src/lib/prisma.ts`: the single shared Prisma client used at runtime
- `src/lib/db-url.ts`: safe construction of pooled and direct Supabase connection URLs
- `prisma/schema.prisma`: database models and mappings
- `prisma/migrations/`: committed, append-only migration history
- `src/generated/prisma/`: generated Prisma client; never edit it manually and never commit it
- `bruno/`: executable examples for manually checking the API
- `.env.example`: documented environment variables without real secrets

## Setup and commands

Use npm commands from the repository root.

```bash
npm ci
cp .env.example .env
npm run prisma:generate
npm run dev
```

Useful verification and database commands:

```bash
npm run build
npm run prisma:migrate -- --name <descriptive_migration_name>
npm run prisma:migrate:deploy
npm run prisma:studio
docker compose up -d --build
docker compose run --rm migrate
```

The current `npm test` script is only a failing placeholder; do not report it as a successful test suite. Until a real test runner is added, `npm run build` is the minimum required automated check, followed by focused endpoint checks with Bruno or HTTP requests when the environment is available.

## Implementation conventions

- Preserve strict TypeScript typing. Avoid `any`, unchecked casts, and non-null assertions unless there is no safer alternative and the reason is documented.
- Follow the existing style: two-space indentation, semicolons, double quotes, trailing commas in multiline constructs, and small named helpers for repeated logic.
- Keep one shared Prisma client from `src/lib/prisma.ts`; do not create a new client per route or request.
- Organize endpoints as Fastify route modules under `src/routes/`, then register them with an explicit prefix in `src/index.ts`.
- Add complete Fastify JSON schemas for request bodies, parameters, query strings, successful responses, and expected error responses. These schemas are also the OpenAPI contract exposed at `/docs`.
- Return explicit HTTP status codes and stable JSON shapes. Keep end-user API messages in French unless the feature requirements specify another language.
- Keep route handlers concise. Extract reusable authentication, validation, serialization, or domain logic when it is shared or makes a handler difficult to read.
- Log through Fastify's logger. Never use logs to expose passwords, JWTs, database credentials, authorization headers, or other secrets.

## API and data rules

- Database identifiers are Prisma `BigInt` values. JSON cannot serialize `bigint`; convert every identifier exposed by the API to a string, as `serializeUser` currently does.
- Normalize and validate external input at the API boundary. Do not rely on TypeScript interfaces alone: runtime validation must be represented by Fastify schemas.
- Do not expose internal fields such as `passwordHash` in a response, log, or error.
- Avoid leaking whether sensitive resources exist when that would weaken authentication. Login failures should keep the same response for an unknown email and an invalid password.
- Use transactions for multi-write operations that must succeed or fail together.
- Preserve ownership boundaries: queries for clothing items, outfits, and notifications must be scoped to the authenticated user, not only to a resource ID supplied by the client.
- Maintain graceful shutdown behavior so Fastify closes before Prisma disconnects.

## Authentication and security

- `JWT_SECRET` is mandatory. Never add a hard-coded secret or an insecure fallback.
- Passwords must only be stored as bcrypt hashes. Never persist or return plaintext passwords.
- Read the user ID from the verified JWT subject for protected routes; never trust a client-provided `userId` as proof of ownership.
- Validate JWT algorithms and expiration when adding token verification middleware.
- Do not commit `.env`, Supabase credentials, JWT secrets, tokens, or real user data. Add only safe placeholders to `.env.example` when introducing a new variable.
- Keep error responses useful to clients without returning stack traces, SQL details, connection strings, or secret-bearing upstream errors.

## Prisma and migrations

- Make model changes in `prisma/schema.prisma`, generate a named migration, inspect the resulting SQL, and commit the schema and migration together.
- Never rewrite or delete an already-applied migration to adjust a new change; add a new migration instead.
- Preserve the existing database naming convention: Prisma fields use camelCase, while table and column names use snake_case through `@@map` and `@map`.
- Add indexes for ownership keys and frequently queried relation/filter fields. Make uniqueness constraints explicit in the Prisma schema.
- Runtime queries use the pooled Supabase URL from `getDatabaseUrl("pooled")`. Prisma migrations use the direct connection configured in `prisma.config.ts`. Do not swap these modes.
- Keep URL encoding of database usernames and passwords in `getDatabaseUrl`; credentials may contain reserved URL characters.
- Migrations are intentionally not run automatically when the API container starts. Production-style migrations must remain an explicit `prisma migrate deploy` operation or the one-off Docker `migrate` service.

## Environment and Docker

- Keep `.env.example`, `README.md`, `Dockerfile`, and `docker-compose.yml` aligned whenever startup requirements or environment variables change.
- The API must continue to bind to `0.0.0.0` by default so it is reachable from Docker and local devices; respect `HOST` and `PORT` overrides.
- Keep `/health` lightweight and independent of authenticated routes. If its semantics change to include dependency readiness, document that distinction.
- Preserve the multi-stage Docker build and do not copy `.env` into an image.

## Verification before finishing

1. Run `npm run build` after every TypeScript or Prisma-related change.
2. Run `npm run prisma:generate` before the build when `prisma/schema.prisma` changes.
3. Inspect generated migration SQL whenever the schema changes; do not apply destructive database changes silently.
4. Exercise each changed endpoint, including a successful request, validation failure, authentication/authorization failure, and relevant conflict/not-found cases.
5. Update or add Bruno requests when an endpoint or its contract changes.
6. Check `git diff` and ensure generated files, `.env`, credentials, logs, and unrelated changes are not included.

## Change discipline

- Make the smallest coherent change that satisfies the task and preserve unrelated user work.
- Do not add dependencies when the current stack can solve the problem cleanly. If a dependency is necessary, use `npm install` so both `package.json` and `package-lock.json` stay synchronized.
- Update the README and API documentation when behavior, setup, commands, or environment requirements change.
- Do not claim a database migration, Docker check, or endpoint test was completed unless it was actually run against an available environment.
