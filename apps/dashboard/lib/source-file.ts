function cellToText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).trim();
}

export function spreadsheetRowsToSourceText(rows: unknown[][]): string {
  return rows
    .map((row) => row.map(cellToText))
    .filter((row) => row.some((cell) => cell.length > 0))
    .map((row) => row.join("\t"))
    .join("\n");
}

export function isXlsxFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}
