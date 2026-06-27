import {
  formatZodError,
  validationError,
  type ApiErrorBody,
  type ApiErrorDetail
} from "./api-error";
import {
  createVendorInputSchema,
  vendorCountries,
  vendorRiskLevels,
  type CreateVendorInput
} from "./vendor";

const REQUIRED_FIELDS = ["company_name", "country", "tax_id", "risk_level"] as const;

type VendorField = (typeof REQUIRED_FIELDS)[number];
type SourceType = "json" | "table" | "key_value";

export type VendorIntakeSuccess = {
  success: true;
  data: {
    input: CreateVendorInput;
    sourceType: SourceType;
    matchedFields: VendorField[];
    confidence: number;
    warnings: string[];
  };
};

export type VendorIntakeFailure = {
  success: false;
  error: ApiErrorBody;
  extracted: Partial<Record<VendorField, string>>;
};

export type VendorIntakeResult = VendorIntakeSuccess | VendorIntakeFailure;

const FIELD_ALIASES: Record<VendorField, string[]> = {
  company_name: [
    "company_name",
    "company name",
    "company",
    "vendor",
    "vendor name",
    "supplier",
    "supplier name",
    "legal name"
  ],
  country: ["country", "vendor country", "supplier country", "jurisdiction"],
  tax_id: [
    "tax_id",
    "tax id",
    "tax",
    "tax number",
    "tax registration",
    "vat",
    "vat id",
    "vat number",
    "ein"
  ],
  risk_level: [
    "risk_level",
    "risk level",
    "risk",
    "vendor risk",
    "supplier risk",
    "risk rating"
  ]
};

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const ALIAS_TO_FIELD = new Map<string, VendorField>(
  Object.entries(FIELD_ALIASES).flatMap(([field, aliases]) =>
    aliases.map((alias) => [normalizeLabel(alias), field as VendorField])
  )
);

const COUNTRY_ALIASES = new Map<string, CreateVendorInput["country"]>([
  ...vendorCountries.map((country) => [normalizeLabel(country), country] as const),
  ["de", "Germany"],
  ["deutschland", "Germany"],
  ["germany", "Germany"],
  ["us", "United States"],
  ["usa", "United States"],
  ["unitedstatesofamerica", "United States"],
  ["fr", "France"],
  ["france", "France"],
  ["gb", "United Kingdom"],
  ["uk", "United Kingdom"],
  ["greatbritain", "United Kingdom"],
  ["unitedkingdom", "United Kingdom"]
]);

const RISK_ALIASES = new Map<string, CreateVendorInput["risk_level"]>(
  vendorRiskLevels.map((risk) => [normalizeLabel(risk), risk])
);

function fieldForLabel(label: string): VendorField | null {
  return ALIAS_TO_FIELD.get(normalizeLabel(label)) ?? null;
}

function normalizeFieldValue(field: VendorField, value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return undefined;
  }

  if (field === "country") {
    return COUNTRY_ALIASES.get(normalizeLabel(trimmed)) ?? trimmed;
  }

  if (field === "risk_level") {
    return RISK_ALIASES.get(normalizeLabel(trimmed)) ?? trimmed.toLowerCase();
  }

  return trimmed;
}

function assignField(
  target: Partial<Record<VendorField, string>>,
  field: VendorField,
  value: unknown
) {
  const normalized = normalizeFieldValue(field, value);
  if (normalized !== undefined) {
    target[field] = normalized;
  }
}

function extractFromObject(value: unknown): Partial<Record<VendorField, string>> {
  const objectValue =
    Array.isArray(value) && value.length > 0 && typeof value[0] === "object"
      ? value[0]
      : value;

  if (!objectValue || typeof objectValue !== "object" || Array.isArray(objectValue)) {
    return {};
  }

  const extracted: Partial<Record<VendorField, string>> = {};
  for (const [key, entryValue] of Object.entries(objectValue)) {
    const field = fieldForLabel(key);
    if (field) {
      assignField(extracted, field, entryValue);
    }
  }

  return extracted;
}

function parseJson(text: string): Partial<Record<VendorField, string>> | null {
  try {
    return extractFromObject(JSON.parse(text));
  } catch {
    return null;
  }
}

function parseDelimitedLine(line: string, delimiter: "," | "\t"): string[] {
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

function extractFromTable(text: string): Partial<Record<VendorField, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {};
  }

  const [headerLine, valueLine] = lines;
  if (!headerLine || !valueLine) {
    return {};
  }

  const delimiter = headerLine.includes("\t") ? "\t" : ",";
  if (!headerLine.includes(delimiter)) {
    return {};
  }

  const headers = parseDelimitedLine(headerLine, delimiter);
  const values = parseDelimitedLine(valueLine, delimiter);
  const extracted: Partial<Record<VendorField, string>> = {};

  headers.forEach((header, index) => {
    const field = fieldForLabel(header);
    if (field) {
      assignField(extracted, field, values[index]);
    }
  });

  return extracted;
}

function extractFromFieldValueTable(
  text: string
): Partial<Record<VendorField, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const extracted: Partial<Record<VendorField, string>> = {};

  for (const line of lines) {
    const delimiter = line.includes("\t") ? "\t" : ",";
    if (!line.includes(delimiter)) {
      continue;
    }

    const [label, value] = parseDelimitedLine(line, delimiter);
    if (!label || value === undefined) {
      continue;
    }

    const field = fieldForLabel(label);
    if (field) {
      assignField(extracted, field, value);
    }
  }

  return extracted;
}

function extractFromKeyValue(text: string): Partial<Record<VendorField, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const extracted: Partial<Record<VendorField, string>> = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    const pair = line.match(/^([^:=]{2,80})\s*[:=]\s*(.+)$/);
    const pairLabel = pair?.[1];
    const pairValue = pair?.[2];
    if (pairLabel && pairValue !== undefined) {
      const field = fieldForLabel(pairLabel);
      if (field) {
        assignField(extracted, field, pairValue);
      }
      continue;
    }

    const field = fieldForLabel(line);
    const nextLine = lines[index + 1];
    if (field && nextLine) {
      assignField(extracted, field, nextLine);
      index += 1;
    }
  }

  return extracted;
}

function missingFieldDetails(
  extracted: Partial<Record<VendorField, string>>
): ApiErrorDetail[] {
  return REQUIRED_FIELDS.flatMap((field) =>
    extracted[field] === undefined ? [{ path: field, message: "Required" }] : []
  );
}

function confidenceFor(matchedFields: VendorField[]): number {
  return Math.round((matchedFields.length / REQUIRED_FIELDS.length) * 100) / 100;
}

export function extractCreateVendorInput(text: string): VendorIntakeResult {
  const sourceText = text.trim();
  if (!sourceText) {
    return {
      success: false,
      error: validationError([{ path: "sourceText", message: "Required" }]),
      extracted: {}
    };
  }

  const attempts: Array<{
    sourceType: SourceType;
    extracted: Partial<Record<VendorField, string>>;
  }> = [];
  const jsonExtracted = parseJson(sourceText);
  if (jsonExtracted) {
    attempts.push({ sourceType: "json", extracted: jsonExtracted });
  }

  attempts.push(
    { sourceType: "table", extracted: extractFromTable(sourceText) },
    { sourceType: "table", extracted: extractFromFieldValueTable(sourceText) },
    { sourceType: "key_value", extracted: extractFromKeyValue(sourceText) }
  );

  const bestAttempt = attempts.reduce((best, current) =>
    Object.keys(current.extracted).length > Object.keys(best.extracted).length
      ? current
      : best
  );
  const matchedFields = REQUIRED_FIELDS.filter(
    (field) => bestAttempt.extracted[field] !== undefined
  );

  if (matchedFields.length === 0) {
    return {
      success: false,
      error: validationError([
        {
          path: "sourceText",
          message: "No recognizable vendor fields found"
        }
      ]),
      extracted: {}
    };
  }

  const missingDetails = missingFieldDetails(bestAttempt.extracted);
  if (missingDetails.length > 0) {
    return {
      success: false,
      error: validationError(missingDetails),
      extracted: bestAttempt.extracted
    };
  }

  const parsed = createVendorInputSchema.safeParse(bestAttempt.extracted);
  if (!parsed.success) {
    return {
      success: false,
      error: formatZodError(parsed.error),
      extracted: bestAttempt.extracted
    };
  }

  return {
    success: true,
    data: {
      input: parsed.data,
      sourceType: bestAttempt.sourceType,
      matchedFields,
      confidence: confidenceFor(matchedFields),
      warnings: []
    }
  };
}
