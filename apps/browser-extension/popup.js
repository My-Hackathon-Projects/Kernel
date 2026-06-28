/* global chrome, document, fetch, URLSearchParams */

const dashboardUrl = "http://localhost:3000";
const sourceText = document.querySelector("#sourceText");
const result = document.querySelector("#result");
const error = document.querySelector("#error");
const openConsole = document.querySelector("#openConsole");

let extractedInput = null;

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

function showResult(input) {
  result.hidden = false;
  result.replaceChildren();

  const list = document.createElement("dl");
  for (const [label, value] of [
    ["Company", input.company_name],
    ["Country", input.country],
    ["Tax ID", input.tax_id],
    ["Risk", input.risk_level]
  ]) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");

    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    list.append(row);
  }

  result.append(list);
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
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

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "kernel_collect_text"
    });
    sourceText.value = response?.text ?? "";
    if (!sourceText.value) {
      setError("No page text found. Select the vendor text or paste it manually.");
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
  extractedInput = null;
  openConsole.disabled = true;

  try {
    const response = await fetch(`${dashboardUrl}/api/intake/vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceText: sourceText.value })
    });
    const payload = await response.json();

    if (!response.ok || payload.error) {
      setError(payload.error?.message ?? "Could not extract vendor fields.");
      return;
    }

    extractedInput = payload.input;
    showResult(extractedInput);
    openConsole.disabled = false;
  } catch {
    setError("Kernel is not reachable at http://localhost:3000.");
  } finally {
    setBusy(button, false);
  }
}

function openKernel() {
  if (!extractedInput) {
    return;
  }

  const params = new URLSearchParams(extractedInput);
  chrome.tabs.create({ url: `${dashboardUrl}/console?${params.toString()}` });
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
