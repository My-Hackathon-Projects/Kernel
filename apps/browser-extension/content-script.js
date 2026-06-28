/* global chrome, document, window */

function pageText() {
  const selection = window.getSelection()?.toString().trim() ?? "";
  const bodyText = document.body?.innerText?.trim() ?? "";

  return {
    selection,
    text: (selection || bodyText).slice(0, 50000)
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "kernel_collect_text") {
    return false;
  }

  sendResponse(pageText());
  return true;
});
