import Link from "next/link";
import { KernelDemo } from "../../components/kernel-demo";

const workflowSteps = [
  {
    num: "01",
    title: "Enable for this tab",
    desc: "Open the workflow you want to automate. Tap the Kernel extension and enable it for this session. It sees only that one tab — nothing else in your browser, nothing in the background."
  },
  {
    num: "02",
    title: "Kernel learns your pattern",
    desc: "Work through the routine a few times. You can also upload PDFs, CSVs, or photos of physical documents to give Kernel data context. It maps your exact sequence and builds a custom skill."
  },
  {
    num: "03",
    title: "Colonel Kernel offers to handle it",
    desc: "Next time that workflow begins, Colonel Kernel pops up and volunteers to take over. You review every pre-filled field. Nothing is submitted until you click Accept."
  }
];

const useCases = [
  {
    icon: "🏥",
    title: "Healthcare",
    body: "A nurse finishes a 12-hour shift and has dozens of medical records to enter digitally. One wrong field can cost a life. Kernel learns her exact EHR workflow across a few sessions — and handles the data entry from then on. She reviews every record before it's saved.",
    stake: "Patient safety · Compliance · Zero-error tolerance"
  },
  {
    icon: "💼",
    title: "Finance & VC",
    body: "Analysts spend hours logging portfolio data, transaction records, and compliance reports across multiple systems. The work is critical and the cost of errors is measured in millions. Kernel automates the repetition — not the oversight.",
    stake: "Regulatory risk · Audit trails · Financial accuracy"
  },
  {
    icon: "🏢",
    title: "Enterprise Ops",
    body: "Procurement and ops teams fill out vendor registrations, sourcing requests, and approval forms across SAP, Coupa, and ServiceNow every day. Kernel turns those recurring workflows into one-click skills — without any scripting or setup.",
    stake: "Procurement speed · Data consistency · Portal sprawl"
  }
];

const whatKernelHandles = [
  { icon: "🌐", title: "Web portals & forms",     desc: "Any browser-based data entry — EHR systems, procurement portals, CRMs, banking interfaces" },
  { icon: "📊", title: "Spreadsheets & Excel",     desc: "Formula application, data mapping, row transforms — recurring operations on new files" },
  { icon: "📄", title: "PDFs, CSVs & documents",  desc: "Feed Kernel your data files for context — it reads structure and maps values intelligently" },
  { icon: "📷", title: "Physical docs & photos",   desc: "Upload a photo of a printed form or handwritten record — Kernel extracts and maps the fields" }
];

const capabilities = [
  {
    title: "Tab-isolated privacy",
    body: "Kernel sees only the tab you explicitly authorize. Not your browser, not your history, not your other tabs. Privacy is architecture, not a policy statement."
  },
  {
    title: "Works with any data source",
    body: "Forms, spreadsheets, PDFs, uploaded CSVs, photos of physical documents. If you work with structured data, Kernel can learn your workflow for it."
  },
  {
    title: "You hold the pen",
    body: "Kernel executes the heavy lifting and stops. Nothing is committed, submitted, or saved until you've reviewed every field and clicked Accept."
  }
];

const team = [
  { name: "Sparsh Tyagi",                     bio: "BCG Applied AI, MMT at TUM, ex-Allianz, ex-Celonis, past 6 figure raising founder",   photo: "/Team/Sparsh.jpg" },
  { name: "Alicia Tyagi",                     bio: "CS & Business at Lehigh, DAAD RISE research intern at LMU Munich",           photo: "/Team/14.jpg" },
  { name: "Gauthier Asselin de Williencourt", bio: "Franco-American filmmaker, co-founder of HyperIA, serial builder at SNCF",   photo: "/Team/15.jpg" },
  { name: "Rishabh Tiwari",                   bio: "Full-stack engineer at SAP, ex-Porsche ML thesis, ex-Amazon, applied AI Engineer",   photo: "/Team/16.jpg" }
];

const logoRail = [
  { alt: "BCG",        src: "/logos/BCG.png" },
  { alt: "Amazon",     src: "/logos/Amazon.png" },
  { alt: "TUM",        src: "/logos/TUM.png" },
  { alt: "Lehigh",     src: "/logos/Lehigh.jpeg" },
  { alt: "LMU Munich", src: "/logos/LMU.png" },
  { alt: "SAP",        src: "/logos/SAP.jpg" },
  { alt: "Porsche",    src: "/logos/Porsche.png" },
  { alt: "SNCF",       src: "/logos/SNCF.png" },
  { alt: "NUS",        src: "/logos/NUS.png" },
  { alt: "Celonis",    src: "/logos/Celonis.png" },
  { alt: "Allianz",    src: "/logos/Allianz.png" },
  { alt: "EY",         src: "/logos/EY_logo_2019.svg.png" },
  { alt: "Deloitte",   src: "/logos/Deloitte-Logo.png" },
  { alt: "Heidelberg", src: "/logos/Hidelberg.jpg" },
];

const whatWeBuilt = [
  {
    icon: "🧩",
    title: "Browser Extension",
    tag: "Chrome MV3",
    desc: "Watches only the tab you authorize. Detects repeating data patterns across sessions and sends structured observations to the local skill layer — nothing leaves your machine without your say-so."
  },
  {
    icon: "🔧",
    title: "MCP Skill Server",
    tag: "Model Context Protocol",
    desc: "A custom MCP server is spun up per detected workflow. Your AI agent — Claude, Codex, Cursor — calls it to validate data and fill fields into the target portal. The skill lives locally and is reusable across sessions."
  },
  {
    icon: "🤖",
    title: "AI Validation Layer",
    tag: "Claude backend",
    desc: "Claude processes the raw source data, validates field values against the target schema, maps them intelligently, and flags anything uncertain. It never submits — it prepares. You're always the last step."
  },
  {
    icon: "🖥️",
    title: "Console Dashboard",
    desc: "The review interface. Every pre-filled field is visible and editable before anything touches the server. Includes a full audit trail: run logs, screenshots at each step, and a human-approval record for every submission.",
    tag: "Human-in-the-loop"
  }
];

const analyticsStats = [
  { value: "4.2 hrs",  label: "saved per user per week (avg)" },
  { value: "94%",      label: "of steps automated after skill creation" },
  { value: "~0",       label: "submission errors in human-reviewed flows" }
];

export default function Page() {
  return (
    <main>
      <div className="landing-shell">

        {/* ── Hero ── */}
        <section className="hero" id="top">
          <div className="hero-inner">
            <nav className="nav" aria-label="Primary navigation">
              <a className="brand" href="#top">
                <span className="brand-mark">
                  <img src="/logo.svg" alt="" width={30} height={30} />
                </span>
                Kernel
              </a>
              <div className="nav-links">
                <a href="#how-it-works">How it works</a>
                <Link href="/app">Demo</Link>
                <a href="#use-cases">Use cases</a>
                <a href="#team">Team</a>
              </div>
            </nav>

            <div className="hero-grid">
              <div className="hero-copy">
                <p className="eyebrow">Browser extension · Works with Claude Code, Codex & Cursor</p>
                <h1>Turn messy business data into validated, automated actions.</h1>
                <p className="hero-lede">
                  Kernel observes your repetitive data workflows — forms, spreadsheets,
                  PDFs, physical records — validates the data, and builds a skill your
                  AI agent can run. Colonel Kernel steps in to handle it. You review
                  every field before anything is committed.
                </p>
                <div className="hero-actions">
                  <Link className="primary-action" href="/app">Run the demo</Link>
                  <a className="secondary-action" href="#how-it-works">How it works</a>
                </div>
                <div className="proof-strip">
                  <div>
                    <strong>Tab-only</strong>
                    <span>Sees nothing beyond what you authorize</span>
                  </div>
                  <div>
                    <strong>Any data</strong>
                    <span>Forms, Excel, PDFs, physical docs</span>
                  </div>
                  <div>
                    <strong>You submit</strong>
                    <span>Always the final approver</span>
                  </div>
                </div>
              </div>

              <div className="hero-product">
                <div className="browser-bar">
                  <span /><span /><span />
                  <p>ehr.hospital.internal / patients / records / new</p>
                  <span className="browser-kernel-icon">🫡</span>
                </div>
                <div className="portal-preview">
                  <div className="portal-preview-inner">
                    <div className="portal-title-row">
                      <span className="portal-crumb">Patient Records › New Entry</span>
                      <h3 className="portal-form-heading">Patient Discharge Summary</h3>
                    </div>
                    <div className="portal-blank-fields">
                      {["Patient ID", "Diagnosis Code", "Attending Physician", "Discharge Date", "Follow-up Required"].map((f) => (
                        <div key={f} className="portal-blank-row">
                          <span className="portal-blank-label">{f}</span>
                          <div className="portal-blank-inp" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="hero-colonel">
                    <span className="hero-colonel-face">🫡</span>
                    <div className="hero-colonel-body">
                      <div className="hero-colonel-header">
                        <span className="hero-colonel-name">Colonel Kernel</span>
                        <span className="hero-colonel-stars">★★★</span>
                      </div>
                      <p>I know this form. You&apos;ve filled it 47 times this month. Let me handle it — you review before it saves.</p>
                      <div className="hero-colonel-btns">
                        <span className="hero-colonel-yes">Yes, fill it</span>
                        <span className="hero-colonel-no">Not now</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── The Case ── */}
        <section className="investor-band" id="investors">
          <div>
            <p className="eyebrow">The problem</p>
            <h2>Messy data, critical actions, and no validation layer in between.</h2>
          </div>
          <p>
            Every business has structured work that lives outside APIs — nurses entering
            patient records, analysts logging compliance data, ops teams navigating
            procurement portals. The data is messy, the stakes are high, and there&apos;s no
            layer that validates what goes in before the action fires. Kernel is that layer:
            it observes, validates, and automates — with a human approving every output.
          </p>
        </section>

        {/* ── Use Cases ── */}
        <section className="use-case-band" id="use-cases">
          <div className="section-intro">
            <p className="eyebrow">Who it&apos;s for</p>
            <h2>Built for work where mistakes have consequences.</h2>
            <p>
              Kernel is most valuable when the data is critical, the portal is painful,
              and the process happens every single day.
            </p>
          </div>
          <div className="use-case-grid">
            {useCases.map((uc) => (
              <div key={uc.title} className="use-case-card">
                <div className="use-case-icon">{uc.icon}</div>
                <h3>{uc.title}</h3>
                <p>{uc.body}</p>
                <div className="use-case-stake">{uc.stake}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── What Kernel handles ── */}
        <section className="handles-band">
          <div className="section-intro">
            <p className="eyebrow">What Kernel handles</p>
            <h2>Not just form filling. Any structured data work.</h2>
          </div>
          <div className="handles-grid">
            {whatKernelHandles.map((h) => (
              <div key={h.title} className="handle-tile">
                <span className="handle-icon">{h.icon}</span>
                <div>
                  <strong>{h.title}</strong>
                  <p>{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Privacy callout ── */}
        <section className="privacy-band">
          <div className="privacy-callout">
            <div className="privacy-lock">🔒</div>
            <div className="privacy-body">
              <h2>Your data never leaves your tab.</h2>
              <p>
                Kernel runs at the agent layer, not the browser level. It sees nothing beyond
                the specific tab you authorize for a session — no browser history, no other
                open tabs, no PII it wasn&apos;t explicitly shown.
              </p>
              <div className="privacy-points">
                <div className="privacy-point"><span>✓</span><p>Enable per-session, per-tab — you control exactly what Kernel sees</p></div>
                <div className="privacy-point"><span>✓</span><p>No browser-level access, no background data collection</p></div>
                <div className="privacy-point"><span>✓</span><p>Nothing submitted or saved without explicit human approval</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="workflow-band" id="how-it-works">
          <div className="section-intro">
            <p className="eyebrow">How it works</p>
            <h2>Enable. Learn. Automate. Three steps, no scripting.</h2>
          </div>
          <div className="workflow-grid">
            {workflowSteps.map((step) => (
              <div className="workflow-step" key={step.num}>
                <span>{step.num}</span>
                <div className="workflow-step-body">
                  <p>{step.title}</p>
                  <p className="workflow-step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Capabilities ── */}
        <section className="capability-band" aria-label="Kernel capabilities">
          {capabilities.map((c) => (
            <article className="capability" key={c.title}>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </article>
          ))}
        </section>

        {/* ── Analytics strip ── */}
        <section className="analytics-band">
          <div className="analytics-inner">
            <div className="analytics-label">
              <p className="eyebrow" style={{ color: "var(--c-brand)" }}>Early results</p>
              <h3>Time saved is measurable from day one.</h3>
            </div>
            <div className="analytics-stats">
              {analyticsStats.map((s) => (
                <div key={s.label} className="analytics-stat">
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Demo ── */}
        <section className="demo-band" id="demo">
          <div className="section-intro">
            <p className="eyebrow">Guided demo</p>
            <h2>Walk through the full loop — from pattern detection to submitted record.</h2>
            <p>
              Click through five stages: Kernel notices a pattern, builds a skill,
              offers to help, shows you the pre-filled form, and logs the completed run.
            </p>
          </div>
          <KernelDemo />
        </section>

        {/* ── What we built ── */}
        <section className="built-band">
          <div className="section-intro">
            <p className="eyebrow">What we built</p>
            <h2>Four layers. One seamless loop.</h2>
            <p>
              Kernel isn&apos;t a single tool — it&apos;s a stack. Each layer handles one job,
              and they chain together so the human only touches the part that matters: the final approval.
            </p>
          </div>
          <div className="built-grid">
            {whatWeBuilt.map((item) => (
              <div key={item.title} className="built-card">
                <div className="built-card-top">
                  <span className="built-icon">{item.icon}</span>
                  <span className="built-tag">{item.tag}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Suggestion feature callout ── */}
        <section className="suggest-band">
          <div className="suggest-card">
            <span className="suggest-icon">💡</span>
            <div>
              <h3>Kernel also proactively suggests automations.</h3>
              <p>
                You don&apos;t have to enable Kernel and wait. As it observes your sessions,
                it surfaces suggestions: &ldquo;I noticed you&apos;ve done this 5 times this week.
                Want me to build a skill for it?&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* ── Team ── */}
        <section className="team-band" id="team">
          <div className="section-intro">
            <p className="eyebrow">The team</p>
            <h2>Built by people who believe automation should never skip the human.</h2>
            <p>
              BCG strategy, SAP engineering, HyperIA creative production, and LMU HCI research
              — united by a shared obsession for keeping humans in control of autonomous systems.
            </p>
          </div>

          <div className="team-grid">
            {team.map((m) => (
              <div key={m.name} className="team-card">
                <img className="avatar" src={m.photo} alt={m.name} />
                <h3>{m.name}</h3>
                <p className="team-role">{m.bio}</p>
              </div>
            ))}
          </div>

          <div className="logo-rail-wrapper" aria-hidden="true">
            <div className="logo-rail">
              {[...logoRail, ...logoRail].map((logo, i) => (
                <div key={i} className="logo-tile">
                  <img src={logo.src} alt={logo.alt} className="logo-img" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-band">
          <h2>Stop doing your data work twice.</h2>
          <p>Kernel works with Claude Code, Codex, Cursor, and any MCP-compatible agent. Tab-isolated. Human-approved.</p>
          <Link className="primary-action" href="/app">Run the demo</Link>
        </section>

      </div>
    </main>
  );
}
