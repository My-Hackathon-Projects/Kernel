# AgentPort Product Plan

This is the build plan for AgentPort. It turns the product research in
`agentport_hackathon_research.md` into a concrete architecture, data model, API
contract, frontend flows, quality gates, risk list, and a first vertical slice.

No application code yet. This document is the design we build against.

## One-sentence product

AgentPort records a human web workflow once and turns it into a typed, audited
MCP tool that agents can call safely, with approval gates and replayable
evidence.

## Demo flow

This is the path every milestone protects. If a change breaks this flow, the
change is wrong.

1. Operator records a "create vendor" workflow against a mock procurement portal.
2. AgentPort compiles it into an MCP tool `create_vendor` with a typed schema.
3. An agent (Claude or Cursor, or the built-in test invoker) calls
   `create_vendor` with structured input.
4. The runner replays the workflow deterministically in a real browser.
5. Before the final submit, the run pauses. The approval inbox shows the exact
   action and inputs. A human approves.
6. The runner submits, then validates that the vendor now exists.
7. The run detail page shows the full trace: inputs, screenshots, DOM
   snapshots, the approval record, and the validation result.
8. We change a button label in the mock portal from "Submit" to "Send for
   Approval." We run again. The selector breaks, the self-healing step proposes
   a replacement, the run recovers, and the patch is saved.

## MVP scope

- One target: a mock procurement portal we control.
- One workflow: create a vendor and submit for approval.
- Deterministic Playwright executor. The LLM never drives clicks.
- MCP server exposing the compiled tool over HTTP.
- Approval gate for write actions, with a live approval inbox.
- Post-run validation that confirms the end state.
- Audit trail: run records, per-step screenshots, DOM snapshots, timing.
- Run detail / trace viewer.
- Self-healing selector fallback (the headline feature).
- Recorder: start with Playwright codegen output, hand-edited into a workflow.
  A polished record UI is a stretch goal, not a dependency.

## Out of scope

Cut these to protect the demo. They are real product work, just not now.

- Multiple target sites or generic any-website support.
- Real SAP, Ariba, or any real third-party system.
- Full RBAC, SSO, multi-tenant isolation, billing.
- A polished browser-extension recorder.
- Parallel or scheduled runs, queues, autoscaling.
- A public tool marketplace or cross-company registry.

## Architecture

Two deployables plus a shared domain package. One language (TypeScript) across
all of it.

```
apps/
  dashboard/      Next.js app: UI + control-plane REST API + MCP HTTP endpoint
  runner/         Fastify service: owns Playwright, executes workflows
  mock-portal/    Next.js app: the demo procurement portal (the target)
packages/
  core/           Domain types, workflow schema, compiler, validators, zod schemas
  db/             Prisma schema + client
```

Why this split:

- Playwright wants a long-lived process with a real browser. That does not fit
  Next.js serverless functions, so the runner is its own service.
- The dashboard owns the control plane and the MCP endpoint. Agents connect to
  one place.
- `packages/core` holds the logic that must be unit-tested in isolation: the
  compiler (workflow to tool schema) and the validators. No I/O in there.

Request path for a tool call:

```
Agent (MCP client)
  -> dashboard /mcp endpoint            (registers + receives tool calls)
  -> control API creates a Run          (status: pending)
  -> runner executes the Workflow       (Playwright, step by step)
       -> on risky step: create ApprovalRequest, pause, wait for decision
       -> on selector miss: self-heal, test patch, continue or fail
  -> validator confirms end state
  -> Run marked succeeded/failed, artifacts stored
  -> result returned to the agent; dashboard streams live updates via SSE
```

Determinism rule: the LLM is allowed in exactly two places.

1. Mapping the user's natural-language intent into typed tool inputs. That
   happens on the agent side, before the tool call.
2. Proposing a replacement selector when one fails, returning a strict JSON
   patch that we test before accepting.

Everywhere else, execution is plain Playwright following recorded steps. This is
the core technical bet from the research: the model handles intent, the runtime
handles action.

### Workflow JSON

This is the heart of the system. A workflow is an ordered list of steps. Each
step is one browser action. Fields that come from tool input are marked with a
`field` reference instead of a literal value.

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
  "validation": {
    "type": "element_visible",
    "selector": "text=Vendor created",
    "expects": "company_name"
  }
}
```

Supported actions for the MVP: `goto`, `click`, `fill`, `select`, `waitFor`.
Risk levels: unset (read/navigation) or `write` (triggers an approval gate).
Retries are allowed on read and navigation steps only. Write steps never retry
automatically.

### Tool compiler

`compileTool(workflow) -> McpToolDefinition`. Pure function, fully unit-tested.

- Maps `workflow.inputs` to a JSON Schema for the MCP tool.
- Validates that every `field` referenced in a step exists in `inputs`.
- Produces a stable tool name and a content-hash of the workflow version so a
  run always records which exact version executed.

### Self-healing fallback

Triggered only when a selector resolves to zero elements.

1. Capture the accessibility tree of the current page (data, not instructions).
2. Call the LLM with the failed selector, the step intent, and the tree. Demand
   a strict JSON response: `{ "selector": "...", "confidence": 0-1 }`.
3. Test the proposed selector in the live page. If it resolves to exactly one
   element, apply it for this run and write a `SelectorPatch` for review.
4. If it fails or confidence is low, fail the run with a clear reason. Never
   auto-heal a `write` step without a human approving the patch.

Treat all page content as untrusted. Page text is never fed to a planning model
as instructions. The healing model receives the accessibility tree as data and
must answer in the fixed schema.

## Data model

Postgres via Prisma. SQLite is the local fallback for a laptop demo. Core
entities and their key fields:

- **Workspace** — `id`, `name`. The tenant boundary. One row is fine for the demo.
- **Target** — `id`, `workspaceId`, `name`, `baseUrl`, `authMode`. The web app a
  workflow runs against.
- **Workflow** — `id`, `targetId`, `name`, `version`, `definition` (the JSON
  above), `contentHash`, `createdAt`. Versioned; a new recording bumps `version`.
- **Tool** — `id`, `workflowId`, `name`, `inputSchema` (JSON Schema), `enabled`.
  The compiled, agent-facing artifact.
- **Run** — `id`, `toolId`, `workflowVersion`, `input` (JSON), `status`
  (`pending` | `running` | `awaiting_approval` | `succeeded` | `failed`),
  `startedAt`, `finishedAt`, `error`, `callerId`.
- **RunStep** — `id`, `runId`, `stepId`, `action`, `selector`, `resolvedValue`,
  `status`, `durationMs`, `screenshotId`, `domSnapshotId`, `healedFrom`.
- **ApprovalRequest** — `id`, `runId`, `stepId`, `prompt`, `payload` (the action
  and inputs shown to the human), `status` (`pending` | `approved` | `rejected`),
  `decidedBy`, `decidedAt`.
- **Validation** — `id`, `runId`, `type`, `expected`, `actual`, `passed`.
- **SelectorPatch** — `id`, `workflowId`, `stepId`, `oldSelector`, `newSelector`,
  `confidence`, `accepted`, `createdAt`.
- **Artifact** — `id`, `runId`, `kind` (`screenshot` | `dom` | `trace`), `uri`,
  `createdAt`. Files go to blob storage or the local filesystem in dev.
- **AuditEvent** — `id`, `workspaceId`, `runId`, `type`, `data`, `createdAt`.
  Append-only. Never updated or deleted.

Relationships: Target 1..* Workflow 1..1 Tool. Tool 1..* Run 1..* RunStep. Run
1..* ApprovalRequest, 1..* Validation, 1..* Artifact.

## API routes and service contracts

### Control-plane REST (dashboard)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/workflows` | Create a workflow from a recording or hand-authored JSON |
| GET | `/api/workflows/:id` | Fetch a workflow and its versions |
| POST | `/api/workflows/:id/compile` | Compile the workflow into a Tool |
| GET | `/api/tools` | List compiled tools |
| GET | `/api/tools/:id` | Tool detail, schema, MCP connection snippet |
| POST | `/api/tools/:id/runs` | Invoke a tool (same path the MCP call uses internally) |
| GET | `/api/runs` | List runs with status filters |
| GET | `/api/runs/:id` | Run detail with steps, approvals, validation |
| GET | `/api/runs/:id/stream` | Server-sent events for live run updates |
| GET | `/api/approvals` | List pending approval requests |
| POST | `/api/approvals/:id/decision` | Approve or reject `{ "decision": "approve" \| "reject" }` |
| GET | `/api/runs/:id/artifacts` | List screenshots, DOM snapshots, trace |
| GET | `/api/patches` | List proposed selector patches |
| POST | `/api/patches/:id/accept` | Accept a selector patch into the workflow |

All request and response bodies validated with zod. Errors return a typed
`{ error: { code, message } }` shape, never a bare 500 with a stack.

### MCP endpoint (dashboard)

The dashboard exposes an MCP server over HTTP. It registers one MCP tool per
enabled `Tool` row. A tool call:

1. Validates input against the tool's JSON Schema.
2. Creates a `Run`.
3. Calls the runner and waits.
4. If the run hits an approval gate, the call keeps the run in
   `awaiting_approval` and the dashboard surfaces it. For the demo the MCP call
   blocks until the human decides, with a timeout. An async path
   (`get_run_status` tool + immediate `run_id` return) is the fallback if
   blocking is awkward with a given client.
5. Returns a structured result:

```json
{
  "run_id": "run_123",
  "status": "succeeded",
  "validation": { "passed": true },
  "evidence_url": "https://.../runs/run_123"
}
```

### Runner contract (internal)

| Method | Path | Purpose |
|---|---|---|
| POST | `/execute` | Body: `{ runId, workflow, input }`. Streams step events back to the control API |
| POST | `/resume` | Body: `{ runId, approvalId, decision }`. Continues a paused run |
| GET | `/health` | Liveness for the dashboard |

The runner owns the browser. It reports each step result, requests approval when
it hits a `write` step, and emits artifacts. It holds no product logic beyond
execution; compiler and validator logic live in `packages/core`.

## Frontend screens

Built with Next.js, Tailwind, shadcn/ui. Seven screens, ordered by demo value.

1. **Approval inbox** — live list of pending approvals. Each card shows the
   action, the resolved inputs, and Approve / Reject. This is the demo
   centerpiece. Updates over SSE.
2. **Run detail / trace viewer** — timeline of steps with screenshots, inputs,
   the approval record, validation result, healing events, and failure reason.
3. **Runs list** — recent runs with status and duration.
4. **Tools registry** — compiled tools, their schemas, and a copy-paste MCP
   connection snippet plus a built-in "Test invoke" button that calls the tool
   exactly like an agent would.
5. **Workflow review** — the recorded steps, field-to-input mapping, and risk
   tags. Edit and recompile.
6. **Selector patches** — proposed self-healing patches awaiting acceptance.
7. **Settings** — MCP endpoint URL and workspace token.

## Build milestones

Ordered so each milestone ends in something demoable. Keep the codebase clean
from the first commit.

- **M0 — Scaffold.** pnpm workspace, the three apps and two packages, Prisma
  schema, TypeScript strict, ESLint, Prettier, Vitest, CI on PR, `.env.example`.
- **M1 — Mock portal.** The vendor form and a "Vendor created" success state.
  This is the target the executor needs, so it comes first.
- **M2 — Deterministic executor.** Runner replays a hand-authored
  `create_vendor` workflow against the portal and captures a screenshot per
  step. Persists a Run and RunSteps. This is the first vertical slice.
- **M3 — Compiler + MCP.** Compile the workflow into a Tool, expose it over the
  MCP endpoint, invoke it from the built-in test invoker.
- **M4 — Approval gate + inbox.** Pause on the write step, surface it in the
  approval inbox, resume on decision, stream updates over SSE.
- **M5 — Validation.** Post-run check that the vendor exists; record pass/fail.
- **M6 — Trace viewer.** The full run detail page with screenshots and records.
- **M7 — Self-healing.** Break the submit selector, propose and test a patch,
  recover, save the patch. The headline moment.
- **M8 (stretch) — Recorder UI.** Replace hand-authored JSON with a record mode.

## Quality gates

These hold from the first commit. They are cheap now and expensive to retrofit.

- TypeScript strict mode across all packages. No `any` at module boundaries.
- zod validation at every external boundary: REST bodies, MCP tool inputs,
  runner messages, and LLM responses (especially the healing patch).
- Unit tests (Vitest) for the compiler and validators. These are pure and must
  be covered.
- One Playwright end-to-end test that exercises the vertical slice against the
  mock portal in CI.
- ESLint + Prettier enforced in CI. Type-check and tests run on every PR.
- Structured logging keyed by `runId` so a run can be traced across the
  dashboard and the runner.
- Idempotency: a Run is the unit of execution and is never silently retried as a
  whole. Only read and navigation steps retry, never write steps.
- Secrets only in env, never committed. Edit `.env.example`, not real env files.
- The append-only AuditEvent table is never updated or deleted.

## Risk list

| Risk | Impact | Fallback |
|---|---|---|
| Self-healing is unreliable on demo day | The wow feature fails live | Scope the demo to the known "Submit" to "Send for Approval" change, which the heal handles deterministically. Keep a manual patch-accept path as a backstop. |
| Recorder is fragile | No way to capture workflows | Ship Playwright codegen output hand-edited into workflow JSON. The recorder UI is a stretch goal, not a dependency. |
| MCP client integration friction | Agent cannot call the tool live | The built-in "Test invoke" button calls the tool through the exact same path. Demo does not depend on an external client. |
| Approval blocking hangs the agent | MCP call times out | Async path: return `run_id` immediately plus a `get_run_status` tool. Demo blocking, fall back to polling if a client misbehaves. |
| Playwright timing flakiness | Runs fail intermittently | Explicit waits, seeded mock portal state, retries on read steps only. |
| Prompt injection from page content | Model manipulated by target page | Page content is data, never instructions. Healing model answers in a fixed schema and its output is tested before use. |
| LLM cost and latency for healing | Slow or expensive runs | Call the model only on selector failure. Cache accepted patches so a healed selector is reused. |
| Scope creep into many sites | Nothing finishes | One target, one workflow. Everything else is out of scope above. |

## First vertical slice

The thinnest end-to-end path that proves the core idea and is demoable. This is
milestone M2, and it depends only on M0 and M1.

**Goal:** invoke `create_vendor` and watch a real browser complete the vendor
form on the mock portal, with the run and its evidence persisted and viewable.

**In the slice:**

- Mock portal with a working vendor form and a "Vendor created" success page.
- A hand-authored `create_vendor` workflow JSON (the shape shown above).
- The runner executes the workflow deterministically with Playwright.
- A Run plus RunSteps are persisted, with one screenshot per step stored as
  artifacts.
- A minimal run detail page renders the steps and screenshots in order.
- Trigger the run from a single control-plane endpoint (`POST /api/tools/:id/runs`)
  or a small script. Full MCP wiring comes in M3.

**Explicitly not in the slice:** approval gate, validation, self-healing, the
MCP endpoint, and the recorder. Each is its own next increment (M3 through M7).

**Acceptance criteria:**

- Calling the run endpoint with valid input fills and submits the form on the
  mock portal and reaches the success page.
- The Run row ends in `succeeded`, with one RunStep per workflow step and a
  stored screenshot for each.
- The run detail page shows the steps and screenshots in execution order.
- The compiler unit tests and one Playwright e2e test for this path pass in CI.
- Invalid input (missing `company_name`) is rejected at the boundary with a
  typed error, and no browser session starts.

This slice is small, fully testable, and exercises the real architecture:
typed input, deterministic execution, persisted evidence. Everything after it is
an increment on this spine, not a rewrite.
