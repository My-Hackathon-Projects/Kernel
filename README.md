# AgentPort

AgentPort records a human web workflow once and turns it into a typed, audited
MCP tool that agents can call safely.

This repository is now scaffolded through the M1 milestone. It includes the
workspace, app shells, shared contracts, database schema, validated APIs, the
mock vendor portal flow, Vitest coverage, Playwright E2E coverage, and CI. The
deterministic Playwright runner lands in M2.

## Repository Layout

The repository uses one convention across apps: `app/` for routes and API route
handlers, `components/` and `hooks/` for front-end UI and client state, and `lib/`
for data access and configuration.

```text
apps/
  dashboard/                Next.js control plane
    app/                    routes, layouts, and the validate API handler
    components/             workflow validator UI
  runner/                   Fastify execution service
    src/app.ts              composition root
    src/routes/             health and execute route plugins
  mock-portal/              Next.js demo target app
    app/                    routes and the vendor API handler
    components/vendors/      vendor form, split into focused components
    hooks/                  client form state and submission
    lib/                    in-memory vendor store and form config
packages/
  core/                     shared contracts (single source of truth)
    src/primitives.ts       shared zod building blocks
    src/vendor.ts           vendor schemas
    src/api-error.ts        typed API error envelope and helpers
    src/workflow/           workflow schema, input parser, and fixture
  db/                       Prisma client export (wired in M2+)
prisma/
  schema.prisma             control-plane data model for local SQLite
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
pnpm playwright:install
```

The local database defaults to SQLite through `DATABASE_URL="file:./dev.db"`.
The M1 mock portal uses an in-memory vendor store for the current Node process.

## Commands

```bash
pnpm dev          # run dashboard, runner, and mock portal in parallel
pnpm lint         # eslint across the workspace
pnpm typecheck    # TypeScript checks for all apps and packages
pnpm test         # Vitest tests
pnpm playwright:install # install Chromium for Playwright
pnpm test:e2e     # Playwright tests against the mock portal
pnpm db:validate  # validate prisma/schema.prisma
pnpm build        # production builds for apps and package build checks
pnpm check        # format, lint, typecheck, tests, E2E, Prisma validation, and build
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

M0 and M1 include these validated boundaries.

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

### Mock Portal Vendor API

`POST /api/vendors`

Creates a vendor in the mock procurement portal. Request fields match the M0
workflow fixture:

```json
{
  "company_name": "Acme GmbH",
  "country": "Germany",
  "tax_id": "DE123456789",
  "risk_level": "medium"
}
```

Successful response:

```json
{
  "id": "generated-id",
  "company_name": "Acme GmbH",
  "country": "Germany",
  "tax_id": "DE123456789",
  "risk_level": "medium",
  "status": "Pending Approval",
  "createdAt": "2026-06-27T00:00:00.000Z"
}
```

`GET /api/vendors` returns `{ "vendors": [...] }`.

`GET /api/vendors?company_name=Acme` returns the matching vendor record, or a
typed `404` error when no vendor matches.

## Mock Portal Workflow

- `/vendors` lists created vendors.
- `/vendors/new` creates a vendor through the validated API and shows `Vendor created`.
- `/vendors/new?variant=v2` reorders the form and renames the submit button to `Send for Approval`.
- The new-vendor page includes an inert injection bait notice. Submitted values
  come only from form controls.

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

Implemented in M1:

- Mock procurement portal vendor list and create form.
- `GET` and `POST /api/vendors` with strict input validation.
- Shared vendor contracts in `packages/core`.
- `?variant=v2` selector-resilience surface for the vendor form.
- Inert injection bait coverage.
- Playwright E2E tests for the browser workflow and validation API.

Not implemented yet:

- Playwright execution and screenshot artifacts.
- MCP endpoint and tool compiler.
- Approval gate, validation run result, trace viewer, self-healing, and recorder.
