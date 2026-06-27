# AgentPort Demo Intake Extension

This is a Chrome MV3 demo extension. It reads selected text, or the visible page
text, sends it to the local AgentPort intake API, and opens the console with the
vendor workflow prefilled.

## Run It

1. Start AgentPort locally with `pnpm dev`.
2. Open Chrome and go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select `apps/browser-extension`.

## Demo Flow

1. Open a page that contains vendor text, an invoice excerpt, or spreadsheet text.
2. Select the relevant text when possible.
3. Click the AgentPort extension.
4. Click Read current page.
5. Click Extract fields.
6. Click Open AgentPort.
7. Review the fields in `/console`, run the workflow, and approve or reject the write.

The extension expects the dashboard at `http://localhost:3000`. It does not parse
scanned images or OCR PDFs. It sends text to the same `/api/intake/vendor`
endpoint used by the dashboard source intake panel.
