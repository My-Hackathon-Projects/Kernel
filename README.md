# AgentPort

AgentPort records a human web workflow once and turns it into a typed, audited
MCP tool that agents can call safely.

This repository is now scaffolded for the M0 milestone. It includes the
workspace, app shells, shared contracts, database schema, API validation stubs,
tests, and CI. The deterministic Playwright runner and mock vendor portal flow
land in later milestones.

## Repository Layout

```text
apps/
  dashboard/    Next.js control-plane UI and API routes
  runner/       Fastify service shell for browser execution
  mock-portal/  Next.js target app shell for the demo portal
packages/
  core/         Workflow contracts, zod schemas, validation helpers
  db/           Prisma client export
prisma/
  schema.prisma MVP data model for local SQLite
```

## Prerequisites

- Node.js 24
- pnpm 9.15.9

If pnpm is not installed, install it with:

```bash
npm install --global pnpm@9.15.9
```

## Setup

```bash
pnpm install
cp .env.example .env
pnpm db:generate
```

The local database defaults to SQLite through `DATABASE_URL="file:./dev.db"`.

## Commands

```bash
pnpm dev          # run dashboard, runner, and mock portal in parallel
pnpm lint         # eslint across the workspace
pnpm typecheck    # TypeScript checks for all apps and packages
pnpm test         # Vitest tests
pnpm db:validate  # validate prisma/schema.prisma
pnpm build        # production builds for apps and package build checks
pnpm check        # format, lint, typecheck, test, Prisma validation, and build
```

App-specific dev commands:

```bash
pnpm --filter @agentport/dashboard dev
pnpm --filter @agentport/runner dev
pnpm --filter @agentport/mock-portal dev
```

Default local ports:

- Dashboard: <http://localhost:3000>
- Runner: <http://127.0.0.1:4000>
- Mock portal: <http://localhost:3001>

## Current API Surface

M0 includes two validated boundaries that later milestones build on.

### Dashboard Workflow Validation

`POST /api/workflows/validate`

Validates a workflow JSON payload against the shared semantic workflow schema.
The dashboard home page calls this endpoint from the browser.

Successful response:

```json
{
  "valid": true,
  "workflow": {
    "name": "create_vendor",
    "version": 1,
    "stepCount": 5
  }
}
```

Validation failures use a typed error shape:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Request validation failed",
    "details": [
      { "path": "steps", "message": "Too small: expected array to have >=1 items" }
    ]
  }
}
```

### Runner Health and Execute Stub

`GET /health`

Returns service health for the runner.

`POST /execute`

Validates the internal runner request shape:

```json
{
  "runId": "run_123",
  "workflow": {},
  "input": {}
}
```

For valid requests, M0 returns `202 accepted` with a scaffold message. Browser
execution is intentionally deferred to M2.

## Milestone Scope

Implemented in M0:

- pnpm workspace with Turbo task orchestration.
- Strict TypeScript across all apps and packages.
- ESLint, Prettier, Vitest, Prisma schema validation, and GitHub Actions CI.
- Next.js dashboard shell with a connected workflow validation form.
- Fastify runner shell with validated health and execute endpoints.
- Next.js mock portal shell.
- Shared workflow, input, and runner request schemas in `packages/core`.
- Prisma schema for the MVP entities.

Not implemented in M0:

- Mock vendor creation flow.
- Playwright execution and screenshot artifacts.
- MCP endpoint and tool compiler.
- Approval gate, validation run result, trace viewer, self-healing, and recorder.
