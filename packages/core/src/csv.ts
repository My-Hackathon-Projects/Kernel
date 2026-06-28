/**
 * Minimal, dependency-free reader for delimited documents (CSV or TSV).
 *
 * The product claim is that intake is data-agnostic: an operator exports
 * records from whatever system they already use and drops the file in. This
 * module is the source-agnostic first step. It only turns bytes into a header
 * plus rows of raw columns; mapping those columns onto a specific tool's typed
 * inputs happens downstream against the compiled workflow contract.
 */

export type DelimitedDocument = {
  headers: string[];
  /** One entry per data row: column header -> cell value. */
  rows: Array<Record<string, string>>;
};

function detectDelimiter(headerLine: string): "," | "\t" {
  return headerLine.includes("\t") ? "\t" : ",";
}

/**
 * Split a single delimited line, honoring double-quoted fields so values that
 * contain the delimiter (for example `"$3,180,000"`) stay intact.
 */
export function parseDelimitedLine(line: string, delimiter: "," | "\t"): string[] {
  if (delimiter === "\t") {
    return line.split("\t").map((part) => part.trim());
  }

  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

/**
 * Parse a delimited document into a header row plus one record per data row.
 * Returns an empty document when there is no header or no data row, so callers
 * can treat "nothing usable" uniformly.
 */
export function parseDelimitedRows(text: string): DelimitedDocument {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headerLine = lines[0];
  if (lines.length < 2 || !headerLine) {
    return { headers: [], rows: [] };
  }

  const delimiter = detectDelimiter(headerLine);
  const headers = parseDelimitedLine(headerLine, delimiter);

  const rows = lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });

  return { headers, rows };
}
