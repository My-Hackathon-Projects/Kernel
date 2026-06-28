/* global chrome, document, fetch, URLSearchParams, window, HTMLElement, HTMLTextAreaElement, HTMLInputElement */

const dashboardUrl = "http://localhost:3000";
const sourceText = document.querySelector("#sourceText");
const result = document.querySelector("#result");
const error = document.querySelector("#error");
const openConsole = document.querySelector("#openConsole");

let extractedResult = null;

const DISPLAY_FIELDS = {
  create_vendor: [
    ["Company", "company_name"],
    ["Country", "country"],
    ["Tax ID", "tax_id"],
    ["Risk", "risk_level"]
  ],
  file_discharge: [
    ["Patient", "patient_name"],
    ["MRN", "patient_id"],
    ["Diagnosis", "diagnosis_code"],
    ["Physician", "attending_physician"],
    ["Discharged", "discharge_date"],
    ["Risk", "readmission_risk"],
    ["Follow-up", "follow_up"]
  ]
};

function setError(message) {
  error.textContent = message;
  error.hidden = false;
}

function clearError() {
  error.textContent = "";
  error.hidden = true;
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.label;
}

function fieldValue(payload, field) {
  return payload.input?.[field] ?? payload.context?.[field] ?? "";
}

function showResult(payload) {
  result.hidden = false;
  result.replaceChildren();

  const heading = document.createElement("p");
  heading.className = "result-heading";
  heading.textContent = payload.label ?? payload.workflow;
  result.append(heading);

  const list = document.createElement("dl");
  for (const [label, field] of DISPLAY_FIELDS[payload.workflow] ?? []) {
    const value = fieldValue(payload, field);
    if (!value) {
      continue;
    }

    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");

    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    list.append(row);
  }

  result.append(list);

  if (payload.warnings?.length > 0) {
    const warning = document.createElement("p");
    warning.className = "result-warning";
    warning.textContent = payload.warnings.join(" ");
    result.append(warning);
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function collectReadablePageText() {
  const maxTextLength = 50000;

  function cleanText(value) {
    return String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function isVisible(element) {
    if (!(element instanceof HTMLElement)) {
      return true;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function addCandidate(candidates, value, score) {
    const text = cleanText(value);
    if (text) {
      candidates.push({ text, score });
    }
  }

  const selection = cleanText(window.getSelection()?.toString() ?? "");
  const candidates = [];
  const selectors = [
    "textarea",
    "input:not([type='hidden']):not([type='password'])",
    "[contenteditable='true']",
    "[role='textbox']",
    "[aria-multiline='true']",
    "[aria-label*='Message Body' i]",
    "[data-message-id]",
    ".a3s",
    ".ii.gt",
    "article",
    "[role='article']",
    "[role='document']",
    "main",
    "[role='main']"
  ];

  if (selection) {
    addCandidate(candidates, selection, 1000);
  }

  for (const selector of selectors) {
    for (const element of document.querySelectorAll(selector)) {
      if (!isVisible(element)) {
        continue;
      }

      const formValue =
        element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement
          ? element.value
          : "";
      addCandidate(
        candidates,
        formValue || element.innerText || element.textContent,
        100
      );
    }
  }

  addCandidate(
    candidates,
    document.body?.innerText ?? document.body?.textContent ?? "",
    1
  );
  candidates.sort(
    (left, right) => right.score - left.score || right.text.length - left.text.length
  );

  const seen = new Set();
  const parts = [];
  for (const candidate of candidates) {
    const key = candidate.text.slice(0, 300);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    parts.push(candidate.text);
    if (parts.join("\n\n").length >= maxTextLength) {
      break;
    }
  }

  return {
    selection,
    text: cleanText(parts.join("\n\n")).slice(0, maxTextLength)
  };
}

function combineFrameText(results) {
  const selected = results.find((entry) => entry?.selection)?.selection;
  if (selected) {
    return selected;
  }

  const seen = new Set();
  const parts = [];
  for (const entry of results) {
    const text = entry?.text?.trim();
    if (!text) {
      continue;
    }
    const key = text.slice(0, 300);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    parts.push(text);
  }

  return parts.join("\n\n").slice(0, 50000);
}

async function readPageWithScripting(tabId) {
  if (!chrome.scripting?.executeScript) {
    throw new Error("scripting permission unavailable");
  }

  const frames = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: collectReadablePageText
  });

  return combineFrameText(frames.map((frame) => frame.result));
}

async function readPageWithContentScript(tabId) {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: "kernel_collect_text"
  });
  return response?.text ?? "";
}

async function readPageText(tabId) {
  try {
    return await readPageWithScripting(tabId);
  } catch {
    return readPageWithContentScript(tabId);
  }
}

async function readCurrentPage() {
  const button = document.querySelector("#readPage");
  setBusy(button, true, "Reading");
  clearError();

  try {
    const tab = await activeTab();
    if (!tab?.id) {
      setError("No active tab found.");
      return;
    }

    sourceText.value = await readPageText(tab.id);
    if (!sourceText.value) {
      setError("No page text found. Select the relevant text or paste it manually.");
    }
  } catch {
    setError("Could not read this page. Reload the page and try again.");
  } finally {
    setBusy(button, false);
  }
}

async function extractFields() {
  const button = document.querySelector("#extract");
  setBusy(button, true, "Extracting");
  clearError();
  result.hidden = true;
  extractedResult = null;
  openConsole.disabled = true;

  try {
    const response = await fetch(`${dashboardUrl}/api/intake/workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceText: sourceText.value })
    });
    const payload = await response.json();

    if (!response.ok || payload.error) {
      setError(payload.error?.message ?? "Could not extract vendor fields.");
      return;
    }

    extractedResult = payload;
    showResult(extractedResult);
    openConsole.disabled = false;
  } catch {
    setError("Kernel is not reachable at http://localhost:3000.");
  } finally {
    setBusy(button, false);
  }
}

function openKernel() {
  if (!extractedResult) {
    return;
  }

  const params = new URLSearchParams({
    ...extractedResult.input,
    ...extractedResult.context
  });
  const destination =
    extractedResult.workflow === "file_discharge"
      ? "/demo"
      : extractedResult.destination;
  chrome.tabs.create({ url: `${dashboardUrl}${destination}?${params.toString()}` });
}

for (const button of document.querySelectorAll("button")) {
  button.dataset.label = button.textContent;
}

document
  .querySelector("#readPage")
  .addEventListener("click", () => void readCurrentPage());
document
  .querySelector("#extract")
  .addEventListener("click", () => void extractFields());
openConsole.addEventListener("click", openKernel);
