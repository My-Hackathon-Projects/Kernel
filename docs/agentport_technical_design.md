# AgentPort Technical Design

Engineering design for AgentPort. Read alongside `agentport_prd.md` (product
intent), `agentport_product_plan.md` (build order and first slice), and
`agentport_stack_evaluation.md` (library choices and verified versions).

Library versions referenced here were checked via Context7 on 2026-06-27:
Next.js 16, MCP TypeScript SDK 1.29, Fastify 5, Playwright 1.61, Prisma 6.19,
zod 4, Vercel AI SDK 5, Vitest 3.

## Design principles

1. The LLM is confined to two places: mapping user intent to typed tool inputs
   (agent side, before the call) and proposing a replacement selector on failure
   (returning a strict, tested JSON patch). Everything else is deterministic.
2. Workflow JSON is the contract between recorder, compiler, and runner.
3. Pure domain logic (compiler, validators) lives in a package with no I/O so it
   stays unit-testable.
4. The runner owns the browser and holds no product logic beyond execution.
5. Validate at every boundary with zod: REST bodies, MCP inputs, runner
   messages, and LLM responses.
6. Write actions are special: they require approval, never auto-retry, and never
   auto-heal without human sign-off.
7. The audit log is append-only and treated as evidence.

## Architecture

Two deployables plus shared packages, all TypeScript in a pnpm monorepo.

```
apps/
  dashboard/    Next.js 16: UI + control-plane REST API + MCP HTTP endpoint
  runner/       Fastify 5: owns Playwright, executes workflows
  mock-portal/  Next.js: the demo procurement portal (the target app)
packages/
  core/         Workflow types, tool compiler, validators, zod schemas (no I/O)
  db/           Prisma schema + generated client
```

Request path for a tool call:

```
Agent (MCP client)
  -> dashboard /mcp (Streamable HTTP)        registers tools, receives tools/call
  -> control logic creates a Run             status: pending
  -> POST runner /execute                     deterministic Playwright replay
       -> on write step: create ApprovalRequest, pause, status awaiting_approval
       -> human decides in dashboard -> POST runner /resume
       -> on selector miss: self-heal, test patch, continue or fail
  -> validator confirms end state
  -> Run succeeded/failed, artifacts stored
  -> structured result returned to the agent; dashboard streams updates via SSE
```

Why two deployables: Playwright needs a long-lived container with browser
binaries and real memory, which does not fit Vercel serverless functions. All
browser work sits behind the runner's HTTP contract so the dashboard stays
browser-free and deployable on Vercel.

## Modules

### packages/core

Pure, no I/O, fully unit-tested.

- **Workflow schema and types.** zod schemas for the Workflow JSON described
  below. Parsing and validation helpers.
- **Tool compiler.** `compileTool(workflow) -> ToolDefinition`. Maps
  `workflow.inputs` to a JSON Schema, validates that every step `field`
  reference exists in `inputs`, produces a stable tool name and a content hash of
  the workflow version.
- **Input resolver.** Binds tool-call inputs to workflow steps, producing the
  concrete values each step will use.
- **Validators.** Given a validation spec and a page probe result, decide pass or
  fail and produce the expected-versus-actual record.

### packages/db

- Prisma schema and the generated client. The single source of database access.
  No business logic.

### apps/dashboard

- **Control-plane REST API** (route handlers): workflows, tools, runs,
  approvals, artifacts, patches.
- **MCP endpoint** (`/mcp`): an MCP server built with
  `@modelcontextprotocol/sdk` over the Web-standard Streamable HTTP transport,
  registering one MCP tool per enabled `Tool` row. SSE is not used (deprecated).
- **Dashboard UI**: the screens listed under Frontend flows.
- **Run orchestration**: creates Runs, calls the runner, records results, and
  emits SSE updates.

### apps/runner

- **Executor**: drives Playwright step by step from a Workflow and resolved
  inputs. Captures a screenshot and DOM snapshot per step. Emits step events.
- **Approval pause/resume**: on a write step, requests approval and suspends the
  browser context until `/resume` arrives.
- **Self-healing**: on a zero-match selector, captures the accessibility tree and
  calls the LLM for a replacement, tests it, and either continues or fails.
- **Artifact writer**: persists screenshots, DOM snapshots, and traces.

### apps/mock-portal

- A small Next.js app with a vendor form and a success state. The controllable
  target for development and the demo, including the scripted label change used
  to show self-healing.

## Workflow JSON

The contract at the center of the system. An ordered list of browser actions;
input-bound fields carry a `field` reference instead of a literal.

```json
{
  "name": "create_vendor",
  "version": 3,
  "target": "mock-procurement",
  "startUrl": "/vendors/new",
  "inputs": {
    "company_name": { "type": "string", "required": true },
    "country": { "type": "string", "required": true },
    "tax_id": { "type": "string", "required": true },
    "risk_level": { "type": "enum", "values": ["low", "medium", "high"] }
  },
  "steps": [
    { "id": "s1", "action": "click", "selector": "button:has-text('Create Vendor')" },
    { "id": "s2", "action": "fill", "selector": "input[name='companyName']", "field": "company_name" },
    { "id": "s3", "action": "fill", "selector": "input[name='taxId']", "field": "tax_id" },
    { "id": "s4", "action": "select", "selector": "select[name='country']", "field": "country" },
    { "id": "s5", "action": "click", "selector": "button:has-text('Submit')", "risk": "write" }
  ],
  "validation": { "type": "element_visible", "selector": "text=Vendor created", "expects": "company_name" }
}
```

Actions for the MVP: `goto`, `click`, `fill`, `select`, `waitFor`. Risk: unset
(read or navigation) or `write` (approval gate). Retries are allowed on read and
navigation steps only.

## Data model

Postgres via Prisma 6.19; SQLite for local. Full field lists are in
`agentport_product_plan.md`. Core entities and relationships:

- **Workspace** — tenant boundary. One row for the MVP.
- **Target** — a web app: `baseUrl`, `authMode`.
- **Workflow** — versioned recording: `definition` (the JSON above),
  `contentHash`, `version`. Belongs to a Target.
- **Tool** — compiled artifact: `name`, `inputSchema` (JSON Schema), `enabled`.
  One per Workflow.
- **Run** — an execution: `toolId`, `workflowVersion`, `input`, `status`
  (`pending` | `running` | `awaiting_approval` | `succeeded` | `failed`),
  timing, `error`, `callerId`.
- **RunStep** — per step: `stepId`, `action`, `selector`, `resolvedValue`,
  `status`, `durationMs`, `screenshotId`, `domSnapshotId`, `healedFrom`.
- **ApprovalRequest** — `runId`, `stepId`, `prompt`, `payload`, `status`
  (`pending` | `approved` | `rejected`), `decidedBy`, `decidedAt`.
- **Validation** — `runId`, `type`, `expected`, `actual`, `passed`.
- **SelectorPatch** — `workflowId`, `stepId`, `oldSelector`, `newSelector`,
  `confidence`, `accepted`.
- **Artifact** — `runId`, `kind` (`screenshot` | `dom` | `trace`), `uri`.
- **AuditEvent** — append-only: `workspaceId`, `runId`, `type`, `data`. Never
  updated or deleted.

Relationships: Target 1..* Workflow 1..1 Tool 1..* Run 1..* RunStep. Run 1..*
ApprovalRequest, 1..* Validation, 1..* Artifact.

## API contract

### Control-plane REST (dashboard)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/workflows` | Create a workflow from a recording or hand-authored JSON |
| GET | `/api/workflows/:id` | Workflow and its versions |
| POST | `/api/workflows/:id/compile` | Compile into a Tool |
| GET | `/api/tools` | List tools |
| GET | `/api/tools/:id` | Tool detail, schema, MCP connection snippet |
| POST | `/api/tools/:id/runs` | Invoke a tool (same path the MCP call uses internally) |
| GET | `/api/runs` | List runs with status filters |
| GET | `/api/runs/:id` | Run detail: steps, approvals, validation |
| GET | `/api/runs/:id/stream` | Server-sent events for live run updates |
| GET | `/api/approvals` | Pending approval requests |
| POST | `/api/approvals/:id/decision` | `{ "decision": "approve" \| "reject" }` |
| GET | `/api/runs/:id/artifacts` | Screenshots, DOM snapshots, trace |
| GET | `/api/patches` | Proposed selector patches |
| POST | `/api/patches/:id/accept` | Accept a patch into the workflow |

All bodies validated with zod. Errors return `{ error: { code, message } }`.

### MCP endpoint (dashboard)

Built with `@modelcontextprotocol/sdk` over Streamable HTTP. One MCP tool per
enabled `Tool`, registered via `server.registerTool(name, { description,
inputSchema }, handler)` where `inputSchema` is a zod object. A tool call:

1. Validates input against the tool's schema.
2. Creates a Run.
3. Calls the runner and waits.
4. If the run hits an approval gate, it stays `awaiting_approval`; the dashboard
   surfaces it. For the demo the MCP call blocks until the human decides, with a
   timeout. Async fallback: return `run_id` immediately plus a `get_run_status`
   tool.
5. Returns a structured result:

```json
{ "run_id": "run_123", "status": "succeeded", "validation": { "passed": true }, "evidence_url": "https://.../runs/run_123" }
```

### Runner contract (internal, dashboard -> runner)

| Method | Path | Purpose |
|---|---|---|
| POST | `/execute` | `{ runId, workflow, input }`. Streams step events back |
| POST | `/resume` | `{ runId, approvalId, decision }`. Continues a paused run |
| GET | `/health` | Liveness |

The runner authenticates requests with a shared secret. It holds no product
logic beyond execution.

## Frontend flows

Next.js 16 App Router, Tailwind 4, shadcn/ui. Screens ordered by demo value.

1. **Approval inbox** — live pending approvals over SSE. Each card shows the
   action and resolved inputs with Approve / Reject. The demo centerpiece.
2. **Run detail / trace viewer** — step timeline with screenshots, inputs,
   approval record, validation, healing events, and failure reason.
3. **Runs list** — recent runs with status and duration.
4. **Tools registry** — tools, schemas, an MCP connection snippet, and a
   built-in "Test invoke" button that calls the tool through the same path an
   agent would.
5. **Workflow review** — recorded steps, field-to-input mapping, risk tags.
6. **Selector patches** — proposed heals awaiting acceptance.
7. **Settings** — MCP endpoint URL and workspace token.

Data flow: Server Components read through `packages/db`. Mutations go through
REST route handlers. Live run state arrives over SSE from
`/api/runs/:id/stream`.

## Background jobs and execution model

The MVP keeps execution synchronous behind the runner's HTTP contract, then adds
durability for production.

- **MVP:** the dashboard calls `/execute` and holds the request open, streaming
  step events and persisting them. Approval pauses the run; the browser context
  is held by the runner until `/resume`. Runs are serialized per tool.
- **Production:** introduce a durable queue (a jobs table or a managed queue) so
  runs survive process restarts, with bounded concurrency, per-tool rate limits,
  retry policy for read and navigation steps only, and an approval timeout
  sweeper that closes stale `awaiting_approval` runs. Artifact cleanup and trace
  retention run as scheduled jobs.

The approval gate is the one long-lived state. Model it explicitly: a run in
`awaiting_approval` has an open ApprovalRequest and a suspended browser context;
both must be cleaned up on timeout or rejection.

## External services

- **MCP clients** (Claude, Cursor, Codex, or the built-in test invoker): connect
  to the dashboard `/mcp` endpoint over Streamable HTTP.
- **LLM provider** (Anthropic via `@ai-sdk/anthropic`, OpenAI swappable): one
  call site, the self-healing selector proposal. Uses the AI SDK with
  `generateText` and `Output.object({ schema })` for typed output; the older
  `generateObject` still works on v5 but the `Output.object` form is the
  forward-compatible pattern.
- **Database** (Postgres in production: Neon, Supabase, or RDS; SQLite local).
- **Artifact storage**: local filesystem in dev; object storage (S3 or Vercel
  Blob) in production for screenshots, DOM snapshots, and traces.
- **Target web app**: the mock portal for the MVP; real internal apps later.

## Security

This product acts inside business systems, so security is a first-class concern.

- **Least privilege.** A tool exposes one workflow, not general browser access.
  Agents can only call compiled, enabled tools.
- **Approval for write actions.** Every `write` step pauses for human approval.
  No write executes without a recorded decision.
- **Untrusted page content.** Page text and DOM are data, never instructions.
  The self-healing model receives the accessibility tree as data and must answer
  in a fixed `{ selector, confidence }` schema; its output is tested against the
  live page before use. This is the primary mitigation for prompt injection from
  target pages.
- **Boundary validation.** zod validates every external input: REST bodies, MCP
  tool inputs, runner messages, and LLM responses. Invalid tool input is
  rejected before any browser session starts.
- **Secrets.** Real values only in env, which is gitignored. Commit
  `.env.example`. Validate required env at startup with zod and fail fast. Never
  log secret values. Target credentials, when added in production, live in a
  vault, not in workflow definitions.
- **Service auth.** The dashboard-to-runner calls use a shared secret. The MCP
  endpoint requires a workspace token. Production adds per-workspace auth, RBAC,
  and SSO.
- **Audit integrity.** AuditEvent is append-only. Runs record the exact workflow
  version and inputs so actions are attributable and replayable.
- **No detection evasion.** AgentPort is for authorized automation of a
  company's own tools. It does not bypass anti-automation controls or solve
  captchas.

## Testing

- **Unit (Vitest 3):** the compiler and validators in `packages/core`. Pure and
  must be covered, including field-mapping validation and expected-versus-actual
  logic.
- **Boundary (Vitest):** zod schema parsing for REST, MCP input, runner
  messages, and the LLM response shape, including rejection of bad input.
- **Runner handler tests (Fastify `app.inject`):** `/execute` and `/resume`
  behavior with a stubbed Playwright layer, including the approval pause and the
  heal path.
- **End-to-end (Playwright Test 1.61):** the vertical slice against the mock
  portal: invoke `create_vendor`, fill and submit the form, reach success,
  assert the Run is `succeeded` with a screenshot per step. A second e2e covers
  the scripted selector change and successful heal.
- **CI:** type-check, lint, unit, and e2e on every PR. Do not merge on red. Run
  the narrowest relevant check first (a single package), then broaden.

## Observability

- **Structured logging** keyed by `runId` across the dashboard and the runner,
  so a run is traceable end to end.
- **Run timeline** in the dashboard is the primary operational view: per-step
  status, duration, screenshots, approval, validation, and healing events.
- **Metrics** (production): run success rate per tool, self-heal frequency and
  success rate, median run latency excluding approval wait, approval response
  time, and tool-call volume. These mirror the PRD success metrics.
- **Tracing** (production): OpenTelemetry spans across MCP call, run
  orchestration, runner execution, and the LLM heal call. Agent execution is
  non-deterministic, so structured traces are how failures get debugged.
- **Alerting** (production): on rising failure rates and rising heal frequency,
  which signals target UI drift.

## Deployment

- **Dashboard:** Vercel. Next.js 16, browser-free, hosts REST and the MCP
  endpoint. Environment variables managed in Vercel; pull locally with the CLI.
- **Runner:** a container on Render, Fly.io, or Railway with Playwright browser
  binaries installed, sized for browser memory. Run locally for the hackathon
  demo. This is the only component with a hard hosting constraint.
- **Database:** managed Postgres in production; SQLite file locally.
- **Artifacts:** object storage in production; local filesystem in dev.
- **Config:** all services validate required env at startup. Pin minor versions;
  the MCP SDK (v2 alpha) and Prisma (7.x released) are the highest-churn
  dependencies, so upgrade them deliberately off the stable lines.

## Risks

| Risk | Impact | Mitigation / fallback |
|---|---|---|
| Self-healing unreliable on demo day | Headline feature fails live | Scope the heal to the known "Submit" to "Send for Approval" change; keep a manual patch-accept path |
| Playwright on serverless | Runner will not run on Vercel | Runner is a separate container; never put browser work in the dashboard |
| Prisma 7 churn | Breaking config migration mid-build | Pin Prisma 6.19; treat 7.x as a planned upgrade |
| MCP SDK v2 alpha | API shift, package rename | Stay on stable v1.x; build on Streamable HTTP, not SSE |
| AI SDK API drift | generateObject deprecation path | Use `generateText` + `Output.object`; isolate the call in one module |
| Approval blocking hangs the agent | MCP call times out | Async path: return `run_id` plus a `get_run_status` tool |
| Playwright timing flakiness | Intermittent run failures | Explicit waits, seeded mock portal, retries on read and navigation steps only |
| Prompt injection from page content | Model manipulated by target page | Page content is data; heal model answers in a fixed schema, output tested before use |
| LLM cost and latency | Slow or expensive runs | Call the model only on selector failure; cache accepted patches |
| Scope creep into many targets | Nothing ships | One target, one workflow; production scope is explicitly deferred |
| MCP client integration friction | Cannot demo a live agent call | Built-in test invoker calls the tool through the same path |

## Open questions

- Final hosting target for the runner (Render vs Fly vs Railway) once we measure
  cold start and browser memory.
- Whether to adopt a managed queue at the production stage or start with a jobs
  table.
- Approval routing model for production (thresholds, roles, escalation).
- When to revisit Drizzle versus Prisma if dashboard cold starts become a
  concern.