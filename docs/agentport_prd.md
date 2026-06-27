# AgentPort Product Requirements Document

Status: draft for build. Companion documents: `agentport_product_plan.md`
(architecture and first slice), `agentport_technical_design.md` (engineering
detail), `agentport_stack_evaluation.md` (library choices).

## Summary

AgentPort records a human web-app workflow once and turns it into a typed,
audited tool that AI agents can call over MCP. The agent supplies intent and
parameters. AgentPort executes the workflow deterministically in a real browser,
pauses for human approval on risky actions, validates the result, and stores
replayable evidence. When a target UI changes and a selector breaks, AgentPort
proposes and tests a replacement so the tool keeps working.

## Problem statement

Companies want agents to do real work, but most business software is built for
humans clicking through screens. Internal tools, procurement portals, CRMs, and
admin dashboards often have no clean API. Teams either wait on platform teams to
build integrations or let a browser agent click around, which is brittle, unsafe
to run against write actions, and impossible to audit.

The result is a gap. MCP gives agents a standard way to call tools, but a
company's actual workflows are not MCP-ready. Closing that gap by hand is custom
work per workflow, and the output is fragile the moment the UI shifts.

AgentPort closes the gap with a repeatable path: record a workflow, compile it
into a typed MCP tool, and run it with approvals, validation, audit, and
self-healing built in.

## Target users

### Primary: AI engineers at startups building agents for enterprises

They need their agent to act inside a customer's tool quickly and safely. They
do not want to maintain bespoke Playwright scripts per customer. They care about
a typed tool contract, approvals for write actions, and an audit trail they can
show the customer.

### Secondary: enterprise platform and automation teams

They own dozens or hundreds of internal tools with no API. They want to expose a
few high-value workflows to approved agents without building and babysitting
custom integrations, and they need governance: who ran what, with what inputs,
and who approved it.

### Tertiary: RPA-heavy operations teams

They already automate UI workflows but want agent-native tools with reasoning at
the input boundary, human approval gates, and auditability, rather than opaque
record-and-replay scripts.

### Who we are not building for yet

Individual consumers, no-code hobbyists, and teams that only need read-only
scraping. AgentPort's value is in safe, audited write workflows inside business
tools.

## Primary workflow

The end-to-end path the product is built around, using vendor onboarding as the
reference case:

1. An operator opens a target web app and records the "create vendor" workflow
   once. The recording captures each action and which fields are inputs.
2. AgentPort compiles the recording into an MCP tool, `create_vendor`, with a
   typed input schema (`company_name`, `country`, `tax_id`, `risk_level`).
3. An agent connects to AgentPort over MCP and calls `create_vendor` with
   structured input derived from a user request.
4. The runner replays the workflow deterministically in a real browser. The LLM
   does not drive clicks; it only produced the inputs.
5. Before the final submit, the run pauses. The approval inbox shows the exact
   action and the resolved inputs. A human approves or rejects.
6. On approval, the runner submits and then validates that the vendor exists.
7. The run detail page shows the full trace: inputs, per-step screenshots, DOM
   snapshots, the approval record, and the validation result.
8. If a selector breaks because the UI changed, AgentPort proposes a replacement
   from the page's accessibility tree, tests it, recovers the run, and saves the
   patch for review.

## Non-goals

- Generic any-website support. AgentPort targets specific, recorded workflows,
  not open-ended browsing.
- Letting the model click freely. Execution is deterministic by design.
- Real third-party enterprise systems in the MVP (SAP, Ariba). The demo uses a
  controlled mock portal.
- A general agent-observability product. Observability here is scoped to runs of
  AgentPort tools, not arbitrary agent traces.
- Replacing official APIs. Where a clean API exists, use it. AgentPort is for the
  workflows that have none.
- Multi-step autonomous chains across many tools. One tool wraps one workflow.

## MVP scope

The smallest version that proves the idea and demos end to end.

- One target: a mock procurement portal we control.
- One workflow compiled to one MCP tool: `create_vendor`.
- Deterministic Playwright execution with per-step screenshots.
- MCP endpoint exposing the tool over Streamable HTTP, callable by a real client
  and by a built-in test invoker in the dashboard.
- Approval gate on the write step, with a live approval inbox.
- Post-run validation that the vendor exists.
- Audit trail and a run detail / trace viewer.
- Self-healing selector fallback for one demonstrable UI change.
- Recorder: start from Playwright codegen output hand-edited into a workflow.
  A polished record UI is a stretch goal, not a gate.

The build order and first vertical slice are defined in
`agentport_product_plan.md`.

## Production scope

What turns the MVP into something a team would pay for and run. Not required for
the demo.

- Multiple targets and multiple workflows per workspace, with a tool registry.
- A real recorder (browser extension or hosted record mode) usable by non-
  engineers.
- Authentication and secrets management for target apps, including session reuse
  and credential vaulting.
- Multi-tenant workspaces with RBAC and SSO.
- Durable run queue with retries, concurrency limits, and scheduling.
- Approval routing (who can approve which actions, thresholds, escalation).
- Versioned tools with safe rollout, diffing, and rollback when a workflow
  changes.
- Selector-patch review and promotion workflow, with confidence thresholds and
  human sign-off for write steps.
- Exportable compliance evidence (run records, approvals, screenshots) for audit.
- Observability: structured traces, metrics, and alerting on failure rates and
  healing frequency.
- Billing and usage metering.

## Success metrics

### MVP / demo

- The reference workflow runs end to end with a human approval and a passing
  validation, on demand, without manual fixes.
- The self-healing demo recovers from the scripted UI change in a single run.
- Every run produces a complete trace: inputs, a screenshot per step, the
  approval record, and the validation result.
- Time to add a new simple workflow (record, compile, first successful run) is
  under 30 minutes for an engineer.

### Production (leading indicators)

- Run success rate per tool (target: above 95 percent on stable targets).
- Self-heal success rate when a selector breaks, and how often healing is needed.
- Median run latency, excluding approval wait time.
- Approval response time and approval-to-rejection ratio.
- Workflows in production per workspace, and weekly tool-call volume.
- Engineering time saved versus hand-built integrations (self-reported, then
  measured by workflows shipped per engineer-week).

### Business

- Activation: a workspace records and successfully runs its first tool.
- Retention: workspaces with at least one tool called every week.
- Expansion: tools per workspace over time.

## Edge cases

These must be handled or explicitly deferred, not ignored.

- **Selector resolves to multiple elements.** Treat as ambiguous. Do not act;
  fail with a clear reason or require a more specific selector.
- **Selector resolves to zero elements.** Trigger self-healing. If healing is
  low-confidence or the step is a write action, do not auto-apply; require human
  review.
- **Target page slow or partially loaded.** Use explicit waits. Retry read and
  navigation steps only, never write steps.
- **Approval times out or is rejected.** End the run cleanly with a recorded
  outcome. Never submit a write action without approval.
- **Duplicate submission risk.** A run is the unit of execution and is not
  silently retried as a whole. Guard write steps against double submission.
- **Validation fails after a successful-looking submit.** Mark the run failed,
  keep all evidence, and surface the mismatch (expected versus actual).
- **Invalid or missing tool input.** Reject at the MCP boundary before any
  browser session starts. No partial execution.
- **Target requires login or hits a captcha.** Out of scope for the MVP mock
  portal. In production, handled by session reuse and credential vaulting; never
  by asking the model to solve a captcha.
- **Malicious page content (prompt injection).** Page text is data, never
  instructions. The self-healing model receives the accessibility tree as data
  and must answer in a fixed schema; its output is tested before use.
- **Workflow changed since recording (version drift).** Runs record the exact
  workflow version executed. A changed UI surfaces as healing events or a clear
  failure, not a silent wrong action.
- **Concurrent runs of the same tool.** Serialize in the MVP. In production,
  bound concurrency in the runner.

## Demo plan

A tight sequence that lands the value in a few minutes.

1. **Frame the problem.** Agents use software like interns clicking screens.
   That is brittle, unsafe for write actions, and impossible to audit.
2. **Show the failure mode.** A raw browser agent tries to create a vendor and
   hesitates or clicks the wrong control.
3. **Record once.** Capture the create-vendor workflow against the mock portal.
4. **Compile.** AgentPort generates the `create_vendor` MCP tool with a typed
   schema. Show the schema and the MCP connection snippet.
5. **Call it.** Ask an agent to "create vendor Acme GmbH and submit for
   approval." The agent calls the tool with structured input.
6. **Approve.** The run pauses on the submit step. The approval inbox shows the
   action and inputs. Approve it live.
7. **Verify.** The run submits, validation confirms the vendor exists, and the
   run reports success to the agent.
8. **Show the trace.** Open the run detail page: inputs, per-step screenshots,
   the approval record, and the validation result.
9. **Break and heal.** Change the submit button label in the mock portal from
   "Submit" to "Send for Approval." Run again. The selector breaks, AgentPort
   proposes and tests a replacement, the run recovers, and the patch is saved.
10. **Close.** Humans were the first users of software. Agents are the next.
    AgentPort makes existing software usable by agents, safely and with evidence.

Fallbacks for demo day are listed in `agentport_product_plan.md`: scope the heal
to the known label change, use the built-in test invoker if an external client
is flaky, and run the runner locally if hosting is unstable.