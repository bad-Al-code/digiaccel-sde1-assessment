# To-Do List App

Weekly to-do list built for the DigiAccel SDE-1 (MERN Stack) assignment.

Create, edit, delete and search tasks, grouped Monday to Sunday with per-week
open and completed counters. Mobile-first UI built against the supplied Figma.

## Stack

| Concern      | Choice                                        |
| ------------ | --------------------------------------------- |
| Framework    | Next.js 16 (App Router), TypeScript strict    |
| Database     | MongoDB Atlas via Mongoose                    |
| API          | REST route handlers under `app/api/**`        |
| Validation   | Zod at every boundary                         |
| Client cache | TanStack Query v5                             |
| Styling      | Tailwind CSS 4, no component library          |
| Animation    | Motion for gestures and sheets, CSS elsewhere |
| Auth         | bcrypt and JWT in httpOnly cookies            |
| Tests        | `tsx` scripts over live HTTP, no test runner  |

## Getting started

```bash
npm ci
cp .env.example .env.local     # fill in the values
npm run db:sync-indexes        # create indexes on a fresh database
npm run dev
```

Open http://localhost:3000.

### Environment

| Variable             | Notes                                                                       |
| -------------------- | --------------------------------------------------------------------------- |
| `MONGODB_URI`        | Atlas connection string. Percent-encode special characters in the password. |
| `MONGODB_DB_NAME`    | Database name, for example `todo_app`.                                      |
| `JWT_ACCESS_SECRET`  | 32 characters or more.                                                      |
| `JWT_REFRESH_SECRET` | 32 characters or more, and different from the access secret.                |
| `ACCESS_TOKEN_TTL`   | Defaults to `15m`.                                                          |
| `REFRESH_TOKEN_TTL`  | Defaults to `30d`.                                                          |
| `APP_BASE_URL`       | Defaults to `http://localhost:3000`.                                        |

The app refuses to boot if any of these are missing or malformed, naming the
offending variable.

## Scripts

| Command                   | What it does                               |
| ------------------------- | ------------------------------------------ |
| `npm run dev`             | Development server                         |
| `npm run build`           | Production build                           |
| `npm run typecheck`       | `tsc --noEmit`                             |
| `npm run lint`            | ESLint, including the layer boundary rules |
| `npm run format`          | Prettier                                   |
| `npm test`                | All eight integration suites               |
| `npm run db:sync-indexes` | Reconcile indexes with the schemas         |

## Testing

Tests are plain `tsx` scripts using `node:assert/strict`, run against a booted
server over real HTTP. There is no test runner.

```bash
cp .env.local .env.test        # point MONGODB_DB_NAME at a *test* database
npm test
```

A guard refuses to run unless the database name contains `test`. Every suite
seeds its own fixtures and cleans up on success, failure and interrupt.

| Suite           | Covers                                                                      |
| --------------- | --------------------------------------------------------------------------- |
| `test:db`       | Connection caching, unreachable hosts, bad credentials, env validation      |
| `test:auth`     | Registration, login, sessions, token rotation, reuse detection, rate limits |
| `test:guest`    | Guest sessions, the one task limit, account claiming, abuse paths           |
| `test:tasks`    | CRUD, ownership isolation, unicode, pagination, concurrency                 |
| `test:weeks`    | Week boundaries, offsets, aggregation, cross-week moves                     |
| `test:search`   | Substring matching and regex injection safety                               |
| `test:timezone` | Offset normalisation, local day filtering, DST transitions                  |
| `test:health`   | Liveness and readiness, including with the database down                    |

Next refuses to start a second dev server, so stop yours before running the
suites.

## Deployment

Pushing to `main` runs CI. If it passes, the deploy workflow builds and
publishes to Vercel, then polls `/api/health/ready` and fails the run if the
deployment is live but not ready.

Required repository secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`.

Set every environment variable in the Vercel dashboard per environment, and
point Preview at a separate database from Production.
