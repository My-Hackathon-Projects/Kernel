# AgentPort

AgentPort records a human web workflow once and turns it into a typed, audited
MCP tool that agents can call safely.

The repository is implemented through M3. It includes the mock procurement
portal, shared workflow contracts, a deterministic Playwright runner, persisted
run evidence, the dashboard Test Invoke path, and an MCP Streamable HTTP endpoint
for the compiled `create_vendor` tool.

## Repository Layout

```text
apps/
  dashboard/                Next.js control plane
    app/                    pages, API handlers, MCP endpoint, run evidence pages
    components/             workflow validator and Test Invoke UI
    lib/                    dashboard config, tool invocation, validation, MCP setup
  runner/                   Fastify execution service
    src/routes/             health and execute route plugins
    src/execution/          Playwright browser, target resolver, artifacts, executor
  mock-portal/              Next.js demo target app
    app/                    vendor pages and validation API
    components/vendors/     vendor form and created summary
    hooks/                  client form state and submission
    lib/                    in-memory vendor store and form config
packages/
  core/                     shared zod contracts, workflow parser, compiler, fixtures
  db/                       Prisma client, demo seed helpers, run/tool repositories
prisma/
  schema.prisma             local SQLite control-plane data model
scripts/
  prepare-e2e.ts            isolated E2E database and artifact setup
  mcp-create-vendor.ts      external MCP smoke client
```

## Setup

Prerequisites: Node.js 24 and `pnpm@9.15.9`.

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:push
pnpm playwright:install
```

The local database defaults to SQLite through `DATABASE_URL="file:./dev.db"`.
Run screenshots are stored under `ARTIFACT_ROOT`, which defaults to
`.tmp/artifacts` in the E2E harness.

## Commands

```bash
pnpm dev                 # run dashboard, runner, and mock portal
pnpm db:generate         # generate Prisma client
pnpm db:push             # create or update the local SQLite schema
pnpm lint                # ESLint with zero warnings
pnpm typecheck           # strict TypeScript across all packages
pnpm test                # Vitest unit and route tests
pnpm test:e2e            # Playwright against dashboard, runner, and portal
pnpm mcp:create-vendor   # external MCP client smoke call
pnpm check               # full local quality gate
```

Default local ports:

- Dashboard: <http://localhost:3000>
- Runner: <http://127.0.0.1:4000>
- Mock portal: <http://localhost:3001>

## Current API Surface

### Dashboard

- `POST /api/workflows/validate` validates workflow JSON and returns metadata.
- `GET /api/tools` lists enabled compiled tools.
- `GET /api/tools/:toolId` returns one compiled tool.
- `POST /api/tools/:toolId/runs` validates input, creates a run, calls the
  runner, validates the end state, and returns:

```json
{
  "run_id": "cmq...",
  "status": "succeeded",
  "validation": { "passed": true },
  "evidence_url": "http://localhost:3000/runs/cmq..."
}
```

- `GET /api/runs/:runId` returns run details, ordered steps, validations, and
  artifacts.
- `GET /api/runs/:runId/artifacts/:artifactId` returns stored screenshots.
- `/mcp` exposes the MCP Streamable HTTP endpoint.

### Runner

`POST /execute` accepts `{ runId, workflow, input }`, validates the payload
against `packages/core`, drives the mock portal in Playwright, persists each
`RunStep`, captures a screenshot artifact for each step, and returns the typed
execution result.

### Mock Portal

- `/vendors` lists created vendors.
- `/vendors/new` creates a vendor through `POST /api/vendors`.
- `/vendors/new?variant=v2` reorders the form and renames the submit button.
- `GET /api/vendors?company_name=Acme` is the independent validation channel.

The vendor page includes inert injection bait. Submitted values come from the
validated workflow input, not page text.

## MCP Smoke Client

With the three services running, call the compiled tool from a separate process:

```bash
AGENTPORT_MCP_URL=http://localhost:3000/mcp pnpm mcp:create-vendor
```

The script discovers `create_vendor`, calls it with typed arguments, and prints
the MCP tool result as JSON.

## Milestone Status

Implemented:

- M0: monorepo foundation, strict TypeScript, quality gates, shared workflow
  schema, dashboard validator, runner shell, Prisma schema.
- M1: mock procurement portal, vendor API, selector-resilience variant, injection
  bait coverage.
- M2: deterministic Playwright runner, persisted run and step records, screenshot
  artifacts, runner API validation.
- M3: workflow compiler, persisted tool seed, dashboard Test Invoke path, MCP
  Streamable HTTP endpoint, external MCP client script.

Not implemented yet:

- Human approval pause and resume.
- Live trace streaming.
- Selector patch review and semantic fallback.
- Recorder UI.
