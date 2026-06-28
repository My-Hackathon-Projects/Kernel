import { apiError } from "@agentport/core";
import { getDocumentProxy } from "unpdf";
import { json } from "../../../../lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * unpdf's `extractText` flattens a page into a single space-joined string,
 * which destroys the `Label: value` line structure the vendor extractor needs.
 * We read the text items directly and rebuild lines from pdf.js end-of-line
 * markers so labels and values stay on their own lines.
 */
async function extractPdfLines(buffer: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(buffer);
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let line = "";

    for (const item of content.items) {
      if (!("str" in item)) {
        continue;
      }

      line += item.str;
      if (item.hasEOL) {
        lines.push(line.trim());
        line = "";
      }
    }

    if (line.trim()) {
      lines.push(line.trim());
    }
  }

  return lines.filter(Boolean).join("\n").trim();
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(apiError("invalid_body", "Expected a multipart file upload."), {
      status: 400
    });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json(apiError("missing_file", "No file was uploaded."), { status: 400 });
  }

  try {
    const text = await extractPdfLines(new Uint8Array(await file.arrayBuffer()));
    return json({ text });
  } catch {
    return json(
      apiError(
        "pdf_parse_failed",
        "Could not read text from this PDF. Scanned or image-only PDFs need OCR."
      ),
      { status: 400 }
    );
  }
}
