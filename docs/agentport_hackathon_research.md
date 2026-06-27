# Hackathon Research: Software for Agents and Next Big Decacorn Ideas

## Recommended Build: AgentPort

**One-line pitch:** Turn any web app workflow into an agent-ready MCP/API tool.

**Track:** Software for Agents  
**Decacorn story:** The Stripe or Zapier for agent actions, built for the MCP and agent era.

---

## Why AgentPort

Most companies want AI agents to complete real work, but most business software is still designed for humans clicking buttons. Agents can reason, but they still struggle with the actual systems where work happens: procurement portals, CRMs, HR tools, finance tools, internal admin dashboards, and customer support systems.

AgentPort records a human workflow once, turns it into a reliable agent tool, and adds the missing production layer: permissions, audit logs, retries, validation, and human approval gates.

The core insight is simple:

> Agents are becoming the next users of software. Existing software needs a compatibility layer for agents.

---

## Market Signal

Enterprise AI spend is moving toward real applications and workflows, not just model APIs. Menlo Ventures estimated that enterprise generative AI spend reached **$37B in 2025**, with **$19B** going to application-layer products. They also reported that **76% of AI use cases are purchased rather than built internally**.

McKinsey found that **62% of organizations are experimenting with AI agents**, but only **23% are scaling agentic systems somewhere in the enterprise**. This means companies are interested, but they still have trouble making agents reliable enough for production.

Gartner, reported by Reuters, expects **over 40% of agentic AI projects to be canceled by 2027** because of unclear value and rising costs.

YC’s current direction also lines up with this. YC has called out ideas around “Company Brain” and “Make Something Agents Want,” where agents need machine-readable interfaces like APIs, MCPs, and CLIs, not brittle human UIs.

That creates a strong opening for a product that makes existing software usable by agents.

---

## Product Concept

## AgentPort

A developer, operator, or business user opens a web app, records a workflow, and AgentPort generates:

1. A deterministic Playwright workflow.
2. An MCP tool with a clean input schema.
3. A validation step that confirms the task actually completed.
4. Approval rules for risky actions.
5. Full trace logs, screenshots, and replay.
6. A fallback agent that can self-heal selectors when the UI changes.

Example workflows:

- Create a vendor in procurement.
- Open a refund case and issue a refund under a threshold.
- Create a Salesforce opportunity from an email.
- Submit a security questionnaire portal form.
- Approve a purchase request if the budget is under a threshold.

The agent no longer blindly clicks through a UI. It calls a structured tool like this:

```json
{
  "tool": "create_vendor",
  "input": {
    "company_name": "Acme GmbH",
    "country": "Germany",
    "tax_id": "DE123456789",
    "risk_level": "low"
  }
}
```

AgentPort executes the workflow, validates the result, and logs evidence.

---

## Why People Would Pay

Companies want agents to work inside existing systems, but every integration is custom. MCP is becoming a common connection layer for agents, but most internal tools, legacy apps, and SaaS workflows are not agent-ready.

Anthropic describes MCP as an open standard that replaces fragmented custom integrations with a universal way to connect AI systems to tools and data. OpenAI’s Agents SDK also supports agents that call tools, use state, run in sandboxes, and orchestrate multi-step work.

But there is still a gap between “MCP exists” and “my company’s weird workflow is agent-ready.”

That gap is where AgentPort sits.

---

## Target Customers

### 1. AI startups building agents for enterprises

They need to connect their agents to customer tools quickly.

### 2. Enterprise platform teams

They have hundreds of internal tools with no clean API.

### 3. SaaS companies

They want their product to be usable by ChatGPT, Claude, Cursor, Codex, and future workspace agents.

### 4. RPA-heavy companies

They already use automation, but want agent-native workflows with reasoning, approvals, and auditability.

---

## Pricing

A possible pricing model:

| Plan | Price | Buyer |
|---|---:|---|
| Starter | $99 to $299/month | Solo builders and startups |
| Team | $1,000 to $5,000/month | Agent teams and platform teams |
| Enterprise | $30k to $150k/year | Private deployment, SSO, RBAC, audit logs, compliance evidence |

This is not a small convenience tool. If a company is spending engineering weeks writing brittle integrations, and AgentPort turns that into an afternoon, it can charge real money.

---

## 48-Hour MVP

Do not support every website. Pick one impressive workflow and make it feel magical.

### Recommended demo workflow

Use an enterprise-style procurement or vendor onboarding flow.

Example:

1. A user says: “Create a new vendor for Acme GmbH and submit it for approval.”
2. The agent calls AgentPort’s generated MCP tool.
3. AgentPort opens the mock procurement portal.
4. It fills the vendor form.
5. It pauses before final submission and asks for approval.
6. After approval, it submits.
7. It verifies that the vendor exists.
8. It shows an audit trail with screenshots, DOM state, inputs, output, and approval record.

Given an SAP background, an Ariba-style procurement workflow or S/4HANA-style vendor master workflow would make the demo feel enterprise-grade. Do not depend on real SAP systems. Build a realistic mock portal.

---

## What to Build

### 1. Workflow recorder

A small Chrome extension or record mode using Playwright.

It captures actions like this:

```json
[
  {
    "action": "click",
    "selector": "button:has-text('Create Vendor')"
  },
  {
    "action": "fill",
    "selector": "input[name='companyName']",
    "field": "company_name"
  },
  {
    "action": "fill",
    "selector": "input[name='taxId']",
    "field": "tax_id"
  },
  {
    "action": "click",
    "selector": "button:has-text('Submit')",
    "risk": "write_action"
  }
]
```

### 2. Tool compiler

Convert the recorded workflow into an MCP tool:

```ts
create_vendor({
  company_name: string,
  country: string,
  tax_id: string,
  risk_level: "low" | "medium" | "high"
})
```

### 3. Runtime executor

Runs the workflow using Playwright.

Keep this deterministic. The LLM should not control every click. The LLM should only map user intent into tool inputs.

### 4. Approval gate

Before risky steps, pause and ask:

> Agent wants to submit vendor Acme GmbH with tax ID DE123456789. Approve?

This makes the demo safer and more credible. Prompt injection and excessive agency are major risks for tool-using agents, especially when they can act in connected systems. Human approval for high-risk actions is a practical mitigation.

### 5. Audit dashboard

Show:

- Run status.
- Inputs.
- Screenshots.
- Tool calls.
- Approval record.
- Validation result.
- Failure reason if something breaks.

This matters because production agents need observability. Agent teams need to debug what happened, why it happened, and whether the final state is correct.

### 6. Self-healing selector fallback

When a selector fails, call an LLM with the current DOM or accessibility tree and ask it to find the closest replacement.

Example:

Old selector:

```css
button:has-text("Submit")
```

New UI:

```css
button:has-text("Send for Approval")
```

The system proposes a patch, runs a test, and stores the new selector.

This is the main wow feature.

---

## Hackathon Demo Script

### Scene 1

“Everyone is building agents, but agents still use software like interns clicking through screens. That is brittle, unsafe, and impossible to audit.”

### Scene 2

Show a raw browser agent trying to create a vendor. It hesitates or clicks the wrong thing.

### Scene 3

Record the workflow once with AgentPort.

### Scene 4

AgentPort generates an MCP tool called `create_vendor`.

### Scene 5

Ask the agent:

> Create vendor Acme GmbH and submit for approval.

### Scene 6

The agent calls the tool. The workflow runs. It pauses for human approval. It submits. It verifies success.

### Scene 7

Open the dashboard and show the trace.

### Scene 8

Change the button text in the mock app from “Submit” to “Send for Approval.” Run again. The workflow self-heals.

### Closing line

“Agents are becoming the next users of software. AgentPort makes existing software usable by agents.”

---

## Technical Stack

Use boring tech. The product idea is ambitious, so the implementation should be stable.

| Layer | Recommendation |
|---|---|
| Frontend | Next.js, Tailwind, shadcn/ui |
| Backend | Node.js or Python FastAPI |
| Browser automation | Playwright |
| Agent layer | OpenAI Agents SDK or Responses API |
| Tool protocol | MCP server |
| Storage | SQLite or Postgres |
| Auth for demo | Simple workspace token |
| Logs | JSON traces plus screenshots |
| Deployment | Vercel frontend, Render/Fly.io backend, or local demo |

Architecture:

```text
User prompt
   ↓
Agent
   ↓
MCP tool registry
   ↓
AgentPort runtime
   ↓
Playwright browser session
   ↓
Target web app
   ↓
Validator
   ↓
Audit log + replay
```

---

## Why This Is Technically Sound

The biggest mistake in agent products is letting the model do too much.

AgentPort works because it splits the system:

- The LLM handles intent and parameter extraction.
- The MCP tool provides a strict schema.
- Playwright handles execution.
- Validators check the result.
- Approvals control risk.
- Logs make it auditable.

This is far more production-like than “let GPT click around.”

OpenTelemetry has also highlighted that agent observability needs structured traces across reasoning, tools, logs, and evaluations because non-deterministic systems are hard to debug without visibility.

---

## Competitive Landscape

There are already browser-control tools and MCP browser tools. Browser MCP and Playwright MCP let agents control browsers. Cloudflare has also introduced browser infrastructure for agents.

Do not position AgentPort as:

> We give agents a browser.

That is not enough.

Position it as:

> We turn repeated human workflows into safe, typed, tested, auditable agent tools.

🔴 Direct competitors (same problem, similar approach)
GodHands (YC, active) — A deterministic computer use layer that enables AI agents to reliably operate across browser and desktop apps, on real-world workflows even on legacy or non-API systems, without completely relying on fragile vision-based approaches. Closest conceptual competitor: same determinism promise, same legacy/enterprise target. Difference: no workflow recorder or MCP tool compiler — it's more of an execution infrastructure play. Y Combinator

Cyberdesk (YC, active) — You write the task once ("Log in to X, click Y, find Z"), call their API, and the agent learns the task. Every time it repeats it, it executes 100% deterministically, upwards of 3x faster, at near-zero cost. If something unexpected happens (like a popup), the system falls back to a computer use agent and memorizes that new trajectory too. Very close to AgentPort's self-healing selector idea. Difference: focused on Windows desktop / legacy apps, not on compiling workflows into exposable MCP tools. Y Combinator

Browser Use (YC W25) — Used to fill out forms, extract data behind login walls, or automate CRMs. Some developers take the xPaths Browser Use clicked on and build their scripts faster, or directly rerun the actions deterministically. Open-source, already widely adopted. Difference: no MCP tool generator layer, no audit log, no approval gate. 

### Differentiation

| Existing browser-agent tools | AgentPort |
|---|---|
| Agent clicks around | Agent calls typed workflow |
| Hard to audit | Full replay and evidence |
| Brittle | Selector self-healing and validation |
| Broad browser access | Least-privilege tools |
| Good for demos | Designed for production workflows |

---

## Business Wedge

Start with one painful wedge:

> Agent-ready workflows for enterprise internal tools.

Most enterprise workflows are trapped in old web apps. Agents cannot reliably use them. APIs are missing, incomplete, or locked behind platform teams.

AgentPort says:

> Record once. Expose as MCP. Let any approved agent use it safely.

Long-term, this becomes a registry of agent-ready actions across the company.

---

## What Not to Build

Avoid these ideas:

- A generic customer support agent. Too crowded.
- A chatbot over company docs. Weak and old.
- A meeting summarizer. Not YC-level.
- A generic agent observability dashboard with no workflow wedge.
- A healthcare clinical decision agent. Too regulated for a 48-hour hackathon.
- A personal AI assistant that does everything. Too vague.

---

# Runner-Up Ideas

## 1. TrustOps Agent: Security Questionnaire and RFP Autopilot

This is the best “people will pay now” idea.

### Pain

B2B companies waste huge amounts of time answering security questionnaires and RFPs. OneTrust calls security questionnaires a major enterprise pain point and recommends tracking hours, cost, and volume per questionnaire. Some market sources estimate mid-market B2B companies answer 50 to 150 security questionnaires per year, with each taking 4 to 40 hours.

### 48-hour MVP

- Upload a security questionnaire.
- Connect docs, SOC 2 PDF, privacy policy, GitHub security docs, and Notion pages.
- Agent answers each question with citations.
- Flags low-confidence answers.
- Routes legal or security approvals.
- Exports back to Excel or Google Sheets.

### Why it could win

The buyer and ROI are obvious.

### Risk

It is crowded. To make it YC-level, pitch it as an autonomous trust center that completes enterprise procurement end-to-end, not just “AI fills forms.”

---

## 2. AI Agent Black Box for Coding Agents

This is Sentry for AI coding agents.

### Pain

AI-generated code is growing fast, but trust is low. Stack Overflow’s 2025 survey found more developers distrust AI tool accuracy than trust it. Veracode research found only 55% of AI-generated code was secure across tested tasks, meaning almost half contained known security flaws.

### 48-hour MVP

- GitHub app watches PRs created by agents.
- Detects AI-generated code.
- Runs security checks and tests.
- Creates a “safe to merge” report.
- Shows agent prompt, files changed, test results, and risk flags.

### Why it could win

Developers understand it instantly.

### Risk

Many code-security tools already exist. The angle must be “governance layer for autonomous coding agents,” not another scanner.

---

## 3. EU AI Act / AI Inventory Agent

### Pain

European companies need to know where AI is used, what risk class each system falls into, and what documentation exists. The EU AI Act applies progressively, with full rollout foreseen by **2 August 2027**, and GPAI obligations started applying from **2 August 2025**.

### 48-hour MVP

- Scan GitHub, Notion, Slack exports, and API keys.
- Find AI usage.
- Create an AI system inventory.
- Classify each system as low, limited, high risk, or unknown.
- Generate a missing-documentation checklist.
- Export a compliance packet.

### Why it could win

It is timely, especially in Europe.

### Risk

Judges may see it as compliance software unless the demo shows autonomous evidence-gathering and continuous monitoring.

---

## 4. Company Brain to Agent Skills Compiler

### Pain

Company knowledge is scattered across Slack, GitHub, Notion, Linear, support tickets, and people’s heads. YC has explicitly called out “Company Brain” as a promising direction.

### 48-hour MVP

- Connect a GitHub repo and a few docs.
- Extract workflows like “how to deploy,” “how to handle an incident,” or “how to refund a customer.”
- Generate `AGENTS.md` or agent skill files.
- Run an agent using those skills.

### Why it could win

The vision is huge.

### Risk

It is harder to prove buyer urgency in 48 hours unless the demo focuses on one workflow like incident response.

---

# Ranking

| Rank | Idea | Buildable in 48h | Buyer pain | YC/decacorn potential | Take |
|---:|---|---:|---:|---:|---|
| 1 | AgentPort | High | High | Very high | Best overall |
| 2 | TrustOps security questionnaire agent | Very high | Very high | Medium-high | Best immediate revenue |
| 3 | AI coding agent black box | High | High | High | Strong dev-tool demo |
| 4 | EU AI inventory agent | Medium-high | High in EU | Medium-high | Good if compliance angle is sharp |
| 5 | Company Brain compiler | Medium | High | Very high | Big, but harder to demo clearly |

---

# Final Recommendation

Build **AgentPort**.

Submit it under **Software for Agents**, but pitch it with a **Next Big Decacorn** narrative:

> Humans were the first users of software. Agents are the next users. Every company will need to expose its workflows to agents safely. AgentPort is the compatibility layer that makes existing software agent-ready.

This is technically sound, demoable in 48 hours, tied to a real market shift, and much more memorable than another wrapper around an LLM.

---

# Sources

- Menlo Ventures, *2025: The State of Generative AI in the Enterprise*: https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/
- McKinsey, *The State of AI*: https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai
- Reuters, *Over 40% of agentic AI projects will be scrapped by 2027, Gartner says*: https://www.reuters.com/business/over-40-agentic-ai-projects-will-be-scrapped-by-2027-gartner-says-2025-06-25/
- Y Combinator, *Requests for Startups*: https://www.ycombinator.com/rfs
- Anthropic, *Model Context Protocol*: https://www.anthropic.com/news/model-context-protocol
- OpenAI, *Agents SDK and agent development docs*: https://developers.openai.com/api/docs/guides/agents
- OWASP, *LLM01 Prompt Injection*: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- LangChain, *State of Agent Engineering*: https://www.langchain.com/state-of-agent-engineering
- Cleanlab, *AI Agents in Production 2025*: https://cleanlab.ai/ai-agents-in-production-2025/
- OpenTelemetry, *AI Agent Observability*: https://opentelemetry.io/blog/2025/ai-agent-observability/
- Browser MCP: https://browsermcp.io/
- OneTrust, *Security Questionnaire Guide*: https://www.onetrust.com/blog/security-questionnaire-guide/
- Infosec Flow, *Vendor Security Questionnaire Automation*: https://infosecflow.com/blog/vendor-security-questionnaire-automation/
- Stack Overflow, *2025 Developer Survey: AI*: https://survey.stackoverflow.co/2025/ai
- Veracode, *AI Generated Code Security Risks*: https://www.veracode.com/blog/ai-generated-code-security-risks/
- European Commission, *EU AI Act Timeline*: https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act
