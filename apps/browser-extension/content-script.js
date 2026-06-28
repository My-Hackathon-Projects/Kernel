/* global chrome, document, window, HTMLElement, HTMLTextAreaElement, HTMLInputElement */

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

function pageText() {
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
      addCandidate(candidates, formValue || element.innerText || element.textContent, 100);
    }
  }

  addCandidate(candidates, document.body?.innerText ?? document.body?.textContent ?? "", 1);
  candidates.sort((left, right) => right.score - left.score || right.text.length - left.text.length);

  const seen = new Set();
  const parts = [];
  for (const candidate of candidates) {
    const key = candidate.text.slice(0, 300);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    parts.push(candidate.text);
    if (parts.join("\n\n").length >= 50000) {
      break;
    }
  }

  return {
    selection,
    text: cleanText(parts.join("\n\n")).slice(0, 50000)
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "kernel_collect_text") {
    return false;
  }

  sendResponse(pageText());
  return true;
});
