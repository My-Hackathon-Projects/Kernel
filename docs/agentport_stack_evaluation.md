# AgentPort Stack Evaluation

This compares the libraries we are considering for AgentPort and recommends a
stack. Versions and capability claims were checked against current docs via
Context7 on 2026-06-27. Each component is judged on five criteria: fit,
maintenance risk, integration cost, testing support, and deployment constraints.

The architecture this serves is in `agentport_product_plan.md`: a Next.js
control plane and dashboard, a separate Node runner that owns Playwright, a
shared core package, and an MCP endpoint that agents call.

## Recommendation at a glance

| Concern | Choice | Version verified | Why |
|---|---|---|---|
| Language | TypeScript | 5.x | One language across dashboard, runner, and core. |
| Monorepo | pnpm workspaces (+ Turborepo) | pnpm 9, turbo 2 | Cheap, standard, good caching. |
| Dashboard + control plane + MCP HTTP | Next.js | 16.x | App Router route handlers host REST and the MCP endpoint. |
| MCP server | @modelcontextprotocol/sdk | 1.29 (v2 alpha exists) | Official SDK. Streamable HTTP transport. |
| Runner service | Fastify | 5.x | Small, fast, typed Node service for Playwright. |
| Browser automation | Playwright | 1.61 | Deterministic driver, codegen recorder, accessibility tree, trace viewer. |
| ORM + database | Prisma 6.19 -> Postgres, SQLite local | 6.19 (7.x released) | Type-safe client, migrations, Studio for inspecting runs. |
| Validation | zod | 4.x | Boundary validation. MCP SDK already targets zod v4. |
| Self-healing LLM | Vercel AI SDK + @ai-sdk/anthropic | AI SDK 5 (v6 beta) | Unified provider API, structured output with a zod schema. |
| Unit tests | Vitest | 3.x | Fast, ESM-native, Vite-aligned. |
| End-to-end tests | Playwright Test | 1.61 | Same engine as the runtime; one tool for e2e and automation. |
| UI components | Tailwind CSS + shadcn/ui | Tailwind 4, shadcn current | Fast, owned components, no heavy UI dependency. |
| Dashboard hosting | Vercel | n/a | First-party Next.js host. |
| Runner hosting | Render / Fly.io / Railway container | n/a | Playwright needs a long-lived container, not serverless. |

## Component analysis

### Next.js 16 (dashboard, control-plane REST, MCP endpoint)

- **Fit:** App Router route handlers serve both the REST control plane and the
  MCP HTTP endpoint. Server Components render the dashboard. One app covers the
  human UI and the agent-facing surface.
- **Maintenance risk:** Low. First-party Vercel project, very active, large
  ecosystem. Major versions move fast, so pin the minor and read upgrade notes.
- **Integration cost:** Low for the UI and REST. The MCP endpoint needs the
  Web-standard Streamable HTTP transport so the SDK can read the route handler's
  `Request` and return a `Response`.
- **Testing support:** Vitest for units, Playwright for e2e against a running
  dev server.
- **Deployment:** Native on Vercel. Note that anything needing Playwright must
  not live here. The dashboard stays browser-free.

### MCP TypeScript SDK 1.29 (agent interface)

- **Fit:** Exactly the protocol AgentPort exposes. `server.registerTool(name,
  { description, inputSchema }, handler)` maps a compiled tool to an MCP tool,
  and `tools/list` plus `tools/call` are generated automatically.
- **Maintenance risk:** Low to moderate. Official SDK, actively developed. A v2
  is in alpha and renames packages (`@modelcontextprotocol/server`,
  `@modelcontextprotocol/node`). Stay on stable v1.x (`@modelcontextprotocol/sdk`)
  and treat v2 as a later migration.
- **Integration cost:** Low. Streamable HTTP is the supported transport. SSE is
  deprecated and will not be served in v2, so do not build on SSE. The
  Web-standard transport fits a Next.js route handler; a Node transport fits a
  raw http server if we ever move the endpoint to the runner.
- **Testing support:** Tools are plain handlers, unit-testable directly. The SDK
  ships a client for integration tests.
- **Deployment:** Runs wherever the dashboard runs. No native binaries.

### Fastify 5 (runner service)

- **Fit:** A focused HTTP service that owns the Playwright browser and exposes
  `/execute`, `/resume`, `/health`. Schema-based validation matches our zod-at-
  the-boundary rule.
- **Maintenance risk:** Low. Mature, stable v5, strong plugin ecosystem.
- **Integration cost:** Low. Minimal server, typed routes, easy to stand up.
  Hono or Express would also work; Fastify gives built-in schema validation and
  good performance with little ceremony.
- **Testing support:** First-class `app.inject()` for handler tests without a
  socket.
- **Deployment:** Plain Node process in a container. This is the service that
  carries the deployment constraint below.

### Playwright 1.61 (automation, recorder, e2e)

- **Fit:** The core execution engine. Deterministic actions, `codegen` for the
  recorder, accessibility snapshot for self-healing, screenshots and DOM
  snapshots for the audit trail, and trace viewer for debugging.
- **Maintenance risk:** Low. Microsoft-maintained, frequent releases, very
  widely used.
- **Integration cost:** Moderate. Browser binaries must be installed in the
  runner image. Timing and waits need care, but auto-wait reduces flakiness.
- **Testing support:** Doubles as our e2e framework (Playwright Test), so the
  same tool covers product automation and tests.
- **Deployment:** The constraint. Needs a long-lived container with browser
  binaries and enough memory. Does not run on Vercel serverless functions.

### Prisma 6.19 (ORM), Postgres and SQLite

- **Fit:** Strong. Relational data (workflows, tools, runs, steps, approvals,
  audit), type-safe queries, migrations, and Studio for inspecting runs and the
  audit log during the demo.
- **Maintenance risk:** Moderate, and version choice matters. Prisma 7 has
  shipped with breaking changes: the new `prisma-client` generator with an
  explicit output path, a move from `env()` URLs in `schema.prisma` to
  `prisma.config.ts`, driver adapters, and a client-side query engine. Adopting
  a brand-new major mid-build is the risk. **Pin to the stable 6.19 line** and
  treat 7.x as a planned upgrade once the dust settles.
- **Integration cost:** Low on 6.19 (well-trodden). The 7.x config migration is
  the cost we are deferring.
- **Testing support:** Good. Run against a local SQLite or a disposable Postgres
  in CI. Driver adapters make swapping the test database straightforward.
- **Deployment:** Postgres in production (Neon, Supabase, or RDS), SQLite for the
  laptop demo. Prisma 6 carries a query engine binary; if serverless cold starts
  on the dashboard become a problem, driver adapters or Prisma 7's client engine
  address it.

### Vercel AI SDK 5 + @ai-sdk/anthropic (self-healing)

- **Fit:** Only used in one place: proposing a replacement selector. Structured
  output with a zod schema gives us a typed, validated `{ selector, confidence }`
  response instead of free text.
- **Maintenance risk:** Low to moderate. Very active, first-party Vercel. AI SDK
  5 is stable; v6 is in beta. The API is shifting from `generateObject` toward
  `generateText` with `Output.object({ schema })`. Use the `Output.object`
  pattern for forward compatibility; `generateObject` still works on v5.
- **Integration cost:** Low. One provider package, one call site. Provider can be
  swapped (Anthropic or OpenAI) without touching the call shape.
- **Testing support:** The healing function takes a DOM or accessibility tree and
  returns a typed object, so it mocks cleanly in unit tests.
- **Deployment:** No special constraint. Needs the provider API key in env.

### zod 4, Vitest 3, Tailwind 4, shadcn/ui

- **zod 4:** Validation at every boundary and the input schema source for both
  MCP tools and compiled tool definitions. The MCP SDK already imports `zod/v4`,
  so this is consistent. Low risk, low cost.
- **Vitest 3:** Unit tests for the compiler and validators. ESM-native, fast,
  aligns with the Vite and TypeScript toolchain. Low risk.
- **Tailwind 4 + shadcn/ui:** Dashboard UI. shadcn components are copied into the
  repo, so there is no runtime UI dependency to track. Low risk, low cost.

## Alternatives considered

| Decision | Picked | Alternative | Why not the alternative |
|---|---|---|---|
| ORM | Prisma 6.19 | Drizzle | Drizzle is lighter and serverless-friendly, but Prisma Studio and migrations help during a demo where we inspect runs and audit rows. Revisit Drizzle if dashboard cold starts hurt. |
| Runner framework | Fastify | Express / Hono | Fastify gives schema validation and performance with little code. Hono is a fine alternative and is also what the MCP Web-standard transport examples use. |
| LLM integration | Vercel AI SDK | LangChain / raw provider SDK | We need one structured-output call, not an orchestration framework. The AI SDK is the smallest thing that gives typed output and provider choice. |
| Browser automation | Playwright | Puppeteer / Selenium | Playwright has better auto-wait, codegen, accessibility snapshots, and trace tooling, and it doubles as our e2e framework. |
| Transport | MCP Streamable HTTP | MCP SSE | SSE is deprecated and unsupported server-side in SDK v2. Building on it would be a dead end. |

## The one deployment constraint that shapes everything

Playwright cannot run on Vercel serverless functions. It needs a long-lived
container with browser binaries and real memory. This is why AgentPort is two
deployables, not one:

- **Dashboard** (Next.js, REST, MCP endpoint): Vercel. Browser-free.
- **Runner** (Fastify + Playwright): a container on Render, Fly.io, or Railway,
  or run locally for the hackathon demo.

Every other choice is reversible. This split is the load-bearing decision, so
the architecture keeps all browser work behind the runner's HTTP contract.

## Net recommendation

Build on TypeScript with a pnpm monorepo. Next.js 16 hosts the dashboard, the
REST control plane, and the MCP endpoint over Streamable HTTP using
`@modelcontextprotocol/sdk` 1.29. A Fastify 5 runner owns Playwright 1.61.
Persist with Prisma 6.19 to Postgres, SQLite locally. Validate with zod 4. Use
the Vercel AI SDK with `@ai-sdk/anthropic` for the single self-healing call.
Test with Vitest and Playwright Test. Deploy the dashboard on Vercel and the
runner as a container.

Pin minor versions. The two highest-churn dependencies are the MCP SDK (v2 in
alpha) and Prisma (7.x just released); stay on their stable lines and schedule
upgrades deliberately.