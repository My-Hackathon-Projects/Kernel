"use client";

import { useState } from "react";

type Scenario = {
  label: string;
  tag: string;
  history: { day: string; portal: string; action: string }[];
  detectFinding: string;
  colonelDetect: string;
  fields: Record<string, string>;
  skillName: string;
  portals: string[];
  colonelSkill: string;
  portalUrl: string;
  portalTitle: string;
  portalBreadcrumb: string;
  colonelOffer: string;
  filledBadge: string;
  reviewNote: string;
  doneTitle: string;
  doneBody: string;
  doneStats: { value: string; label: string }[];
  evidence: string[];
};

const SCENARIOS: Record<string, Scenario> = {
  healthcare: {
    label: "Healthcare / EHR",
    tag: "🏥",
    history: [
      { day: "Mon", portal: "Medscape EHR",   action: "Patient discharge summary" },
      { day: "Wed", portal: "Epic Systems",    action: "Discharge documentation" },
      { day: "Thu", portal: "Hospital Portal", action: "Post-care record filing" },
    ],
    detectFinding:
      "Same patient discharge data entered across 3 different hospital systems. Kernel sees a pattern worth automating.",
    colonelDetect:
      "You've entered discharge summaries 47 times this month across 3 different systems. Let me handle this — you review before anything saves to the patient record.",
    fields: {
      "Patient ID":          "CHN-2024-003847",
      "Diagnosis Code":      "ICD-10: J18.9",
      "Attending Physician": "Dr. Sarah Miller",
      "Discharge Date":      "2024-06-27",
      "Follow-up Required":  "Yes — 2 weeks",
    },
    skillName: "discharge_autofill",
    portals: ["Medscape EHR", "Epic Systems", "Hospital Portal"],
    colonelSkill:
      "Skill built and locked. Next time you open any of these systems for a discharge summary, I'll offer to fill it in.",
    portalUrl: "ehr.hospital.internal / patients / discharge / new",
    portalTitle: "Patient Discharge Summary",
    portalBreadcrumb: "Patient Records › Discharge › New Entry",
    colonelOffer: "I know exactly what goes here. Fill it in for you?",
    filledBadge: "🫡 Filled by Kernel — review before saving to patient record",
    reviewNote:
      "Every field is editable. Nothing has been written to the patient record yet. Click Submit when you're satisfied.",
    doneTitle: "Record saved.",
    doneBody:
      "Patient discharge summary filed to Medscape EHR. Run logged, audit trail preserved.",
    doneStats: [
      { value: "~6 min", label: "saved" },
      { value: "5", label: "fields filled" },
      { value: "1", label: "human approval" },
    ],
    evidence: [
      "discharge_autofill run #48 — completed",
      "Screenshot captured at each step",
      "Human reviewed and approved all fields",
      "Patient record validated post-submit",
    ],
  },

  vendor: {
    label: "Enterprise / Procurement",
    tag: "🏢",
    history: [
      { day: "Mon", portal: "SAP Ariba",         action: "New supplier registration" },
      { day: "Wed", portal: "ServiceNow Catalog", action: "Vendor onboarding request" },
      { day: "Thu", portal: "Coupa Procurement",  action: "Add approved supplier" },
    ],
    detectFinding:
      "Same supplier details across 3 different portals. Kernel sees a pattern worth automating.",
    colonelDetect:
      "I noticed you keep entering the same supplier details across different portals. Let me remember them for you.",
    fields: {
      "Supplier Name":    "Solarwind Materials GmbH",
      "Country":          "Germany",
      "Business Address": "Kantstraße 14, 10623 Berlin",
      "Contact Email":    "procurement@solarwind.de",
      "VAT Number":       "DE381234567",
    },
    skillName: "vendor_autofill",
    portals: ["SAP Ariba", "ServiceNow", "Coupa"],
    colonelSkill:
      "Skill built and locked. Next time you land on any of these portals, I'll offer to fill it automatically.",
    portalUrl: "sap.ariba.com / suppliers / new",
    portalTitle: "New Supplier Registration",
    portalBreadcrumb: "Suppliers › New Supplier Registration",
    colonelOffer: "I know exactly what goes here. Fill it in for you?",
    filledBadge: "🫡 Filled by Kernel — review before submitting",
    reviewNote:
      "Every field is editable. Nothing has been touched on the server yet. Click Submit when you're satisfied.",
    doneTitle: "Supplier registered.",
    doneBody:
      "Solarwind Materials GmbH is now live in SAP Ariba. Run logged, screenshots saved.",
    doneStats: [
      { value: "~4 min", label: "saved" },
      { value: "5", label: "fields filled" },
      { value: "1", label: "human approval" },
    ],
    evidence: [
      "vendor_autofill run #4 — completed",
      "Screenshot captured at each step",
      "Human reviewed and approved inputs",
      "Post-submit validation passed",
    ],
  },
};

const STEPS = [
  { id: "detect", num: "01", title: "Pattern spotted",  kicker: "Kernel noticed" },
  { id: "skill",  num: "02", title: "Skill built",       kicker: "No config needed" },
  { id: "offer",  num: "03", title: "Colonel offers",    kicker: "Next portal visit" },
  { id: "review", num: "04", title: "You review",        kicker: "Nothing yet submitted" },
  { id: "done",   num: "05", title: "Done",               kicker: "Evidence saved" },
];

const NEXT_LABELS = [
  "Build the skill →",
  "See it in action →",
  "Let Kernel fill it →",
  "Submit →",
  "Start over",
];

function ColonelTag({ text }: { text: string }) {
  return (
    <div className="colonel-tag">
      <span className="colonel-tag-face">🫡</span>
      <div>
        <span className="colonel-tag-rank">Colonel Kernel ★★★</span>
        <p>{text}</p>
      </div>
    </div>
  );
}

function StageDetect({ s }: { s: Scenario }) {
  return (
    <div className="demo-stage-content">
      <div className="detect-log">
        <p className="demo-sublabel">Activity log — this week</p>
        {s.history.map((h) => (
          <div key={h.day} className="detect-row">
            <span className="detect-day">{h.day}</span>
            <span className="detect-portal">{h.portal}</span>
            <span className="detect-action">{h.action}</span>
            <span className="detect-check">✓</span>
          </div>
        ))}
        <div className="detect-finding">
          <span>⚡</span>
          <p>{s.detectFinding}</p>
        </div>
      </div>
      <ColonelTag text={s.colonelDetect} />
    </div>
  );
}

function StageSkill({ s }: { s: Scenario }) {
  return (
    <div className="demo-stage-content">
      <div className="skill-card-demo">
        <div className="skill-card-top">
          <div className="skill-name-row">
            <code className="skill-badge">{s.skillName}</code>
            <span className="skill-version-pill">v1</span>
          </div>
          <span className="skill-active-dot">● Active</span>
        </div>
        <p className="demo-sublabel" style={{ marginTop: 0 }}>What I&apos;ll fill in</p>
        <div className="skill-fields-table">
          {Object.entries(s.fields).map(([k, v]) => (
            <div key={k} className="skill-field-row">
              <span className="skill-field-key">{k}</span>
              <span className="skill-field-val">{v}</span>
            </div>
          ))}
        </div>
        <div className="skill-portals-row">
          <span className="demo-sublabel" style={{ marginTop: 0 }}>Works on:</span>
          {s.portals.map((p) => (
            <span key={p} className="skill-portal-pill">{p}</span>
          ))}
        </div>
      </div>
      <ColonelTag text={s.colonelSkill} />
    </div>
  );
}

function StageOffer({ s }: { s: Scenario }) {
  return (
    <div className="demo-stage-content">
      <div className="portal-sim">
        <div className="portal-sim-bar">
          <span className="portal-dot red" />
          <span className="portal-dot yellow" />
          <span className="portal-dot green" />
          <span className="portal-url">{s.portalUrl}</span>
        </div>
        <div className="portal-body">
          <div className="portal-breadcrumb-row">{s.portalBreadcrumb}</div>
          <h3 className="portal-form-title">{s.portalTitle}</h3>
          <div className="portal-fields-blank">
            {Object.keys(s.fields).map((k) => (
              <div key={k} className="portal-blank-row">
                <label className="portal-field-label">{k}</label>
                <div className="portal-blank-input" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="colonel-popup-card">
        <span className="colonel-popup-face">🫡</span>
        <div className="colonel-popup-body">
          <div className="colonel-popup-header">
            <strong>Colonel Kernel</strong>
            <span className="colonel-star-strip">★★★</span>
          </div>
          <p>{s.colonelOffer}</p>
          <div className="colonel-popup-btns">
            <span className="colonel-btn-yes">Yes, fill it</span>
            <span className="colonel-btn-no">Not now</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageReview({ s }: { s: Scenario }) {
  return (
    <div className="demo-stage-content">
      <div className="portal-sim">
        <div className="portal-sim-bar">
          <span className="portal-dot red" />
          <span className="portal-dot yellow" />
          <span className="portal-dot green" />
          <span className="portal-url">{s.portalUrl}</span>
        </div>
        <div className="portal-body">
          <div className="portal-breadcrumb-row">{s.portalBreadcrumb}</div>
          <div className="portal-filled-badge">{s.filledBadge}</div>
          <h3 className="portal-form-title">{s.portalTitle}</h3>
          <div className="portal-fields-filled">
            {Object.entries(s.fields).map(([k, v]) => (
              <div key={k} className="portal-filled-row">
                <label className="portal-field-label">{k}</label>
                <div className="portal-filled-input">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="review-note">
        <span className="review-note-icon">👀</span>
        <p>{s.reviewNote}</p>
      </div>
    </div>
  );
}

function StageDone({ s }: { s: Scenario }) {
  return (
    <div className="demo-stage-content">
      <div className="done-hero-card">
        <span className="done-hero-icon">🫡</span>
        <h3>{s.doneTitle}</h3>
        <p>{s.doneBody}</p>
      </div>
      <div className="done-stats-grid">
        {s.doneStats.map((stat) => (
          <div key={stat.label} className="done-stat">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
      <div className="done-evidence">
        <p className="demo-sublabel">Evidence trail</p>
        {s.evidence.map((line) => (
          <div key={line} className="done-evidence-row">
            <span className="done-check">✓</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KernelDemo() {
  const [scenarioKey, setScenarioKey] = useState<"healthcare" | "vendor">("healthcare");
  const [step, setStep] = useState(0);
  const s = SCENARIOS[scenarioKey];

  const StageViews = [
    () => <StageDetect s={s} />,
    () => <StageSkill s={s} />,
    () => <StageOffer s={s} />,
    () => <StageReview s={s} />,
    () => <StageDone s={s} />,
  ];
  const View = StageViews[step];

  function switchScenario(key: "healthcare" | "vendor") {
    setScenarioKey(key);
    setStep(0);
  }

  return (
    <div className="kernel-demo-wrapper">
      {/* Scenario switcher */}
      <div className="scenario-switcher">
        <span className="scenario-switcher-label">Scenario</span>
        {(Object.entries(SCENARIOS) as [string, Scenario][]).map(([key, sc]) => (
          <button
            key={key}
            type="button"
            className={`scenario-btn ${scenarioKey === key ? "active" : ""}`}
            onClick={() => switchScenario(key as "healthcare" | "vendor")}
          >
            <span>{sc.tag}</span>
            {sc.label}
          </button>
        ))}
      </div>

      <div className="kernel-demo">
        {/* Left stepper rail */}
        <ol className="demo-rail">
          {STEPS.map((st, i) => {
            const done   = i < step;
            const active = i === step;
            return (
              <li key={st.id} className="demo-rail-item">
                {i < STEPS.length - 1 && (
                  <span className={`demo-rail-line ${done ? "done" : ""}`} />
                )}
                <button
                  type="button"
                  className={`demo-rail-btn ${active ? "active" : ""} ${done ? "done" : ""}`}
                  onClick={() => setStep(i)}
                >
                  <span className={`demo-rail-num ${active ? "active" : ""} ${done ? "done" : ""}`}>
                    {done ? "✓" : st.num}
                  </span>
                  <span className="demo-rail-label">
                    <span className="demo-rail-title">{st.title}</span>
                    <span className="demo-rail-kicker">{st.kicker}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Right content */}
        <div className="demo-content-col">
          <div className="demo-stage-chip">{STEPS[step].kicker.toUpperCase()}</div>
          <View />
          <div className="demo-nav-row">
            <button
              className="demo-nav-back"
              disabled={step === 0}
              onClick={() => setStep((prev) => prev - 1)}
            >
              ← Back
            </button>
            <div className="demo-dots">
              {STEPS.map((_, i) => (
                <span key={i} className={`demo-dot ${i === step ? "on" : ""}`} />
              ))}
            </div>
            <button
              className="demo-nav-next"
              onClick={() => setStep(step === STEPS.length - 1 ? 0 : (prev) => prev + 1)}
            >
              {NEXT_LABELS[step]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
