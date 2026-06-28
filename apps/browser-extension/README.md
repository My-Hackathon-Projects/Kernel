# Kernel Workflow Intake (Chrome extension)

A Chrome MV3 demo extension that turns whatever is on the page in front of you
into a prefilled Kernel run. It reads the selected text (or the visible page
text), sends it to the local Kernel intake API, and opens Kernel with workflow
inputs already filled in, ready for you to review, run, and approve.

Vendor text uses the live path: the extension opens the real `create_vendor`
workflow in `/console`. Patient discharge text opens the guided healthcare demo
with the extracted record preloaded for review.

## What it is for

The point of Kernel is that messy data on a human-facing page becomes a typed,
approved action. This extension is the "grab it from wherever it already lives"
front door. You are on a supplier email, an invoice, an internal record, or a
spreadsheet view in your browser. Instead of retyping the details into another
portal, you capture them here and hand a prefilled, reviewable run to Kernel.

## Install (load unpacked)

1. Start Kernel locally: `pnpm dev` (the dashboard must be on
   `http://localhost:3000`).
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the `apps/browser-extension` folder.

The Kernel icon appears in the toolbar. Pin it for easy access.

## How to use it

1. Open any page that contains the details you want to file (vendor text, an
   invoice excerpt, a record, spreadsheet text).
2. Select the relevant text if you can. Selection is preferred; otherwise the
   extension falls back to the visible page text.
3. Click the **Kernel** toolbar icon to open the popup.
4. Click **Read current page** to pull the selected or visible text into the box
   (or paste text in manually).
5. Click **Extract fields**. Kernel maps the text onto the workflow inputs and
   shows what it found.
6. Click **Open in Kernel**. Vendor data opens `/console`; patient discharge
   data opens `/demo` at the import step.
7. Review the fields before running or approving anything.

## How it works

- `popup.js` injects a read-only collector into all available frames, so Gmail
  message bodies and editor frames can be read when Chrome allows it.
- `content-script.js` remains as a fallback and only responds to the extension's
  own `kernel_collect_text` message.
- `popup.js` sends text to `POST http://localhost:3000/api/intake/workflow`,
  which chooses the vendor or discharge intake path and renders the mapped fields.
- **Open in Kernel** opens `/console?company_name=...` for vendor data or
  `/demo?patient_id=...` for discharge data. Nothing is submitted by the
  extension.

## Scope and limits

- The extension expects the dashboard at `http://localhost:3000`
  (`host_permissions` is scoped to localhost only).
- It reads text. It does not OCR scanned images or parse PDFs.
- It never writes anything itself. It only prefills the console; the human
  approves the actual action inside Kernel.
