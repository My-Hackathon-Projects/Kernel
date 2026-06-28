import { validationError, type ApiErrorBody } from "./api-error";
import { parseDelimitedRows } from "./csv";

const REQUIRED_FIELDS = [
  "patient_id",
  "diagnosis_code",
  "attending_physician",
  "discharge_date",
  "readmission_risk"
] as const;

type DischargeField = (typeof REQUIRED_FIELDS)[number];
type ExtraField = "patient_name" | "follow_up";
type SourceType = "json" | "table" | "key_value" | "free_text";

export type DischargeIntakeSuccess = {
  success: true;
  data: {
    input: Partial<Record<DischargeField, string>>;
    context: Partial<Record<ExtraField, string>>;
    sourceType: SourceType;
    matchedFields: DischargeField[];
    missingFields: DischargeField[];
    confidence: number;
    warnings: string[];
    ready: boolean;
  };
};

export type DischargeIntakeFailure = {
  success: false;
  error: ApiErrorBody;
  extracted: Partial<Record<DischargeField, string>>;
};

export type DischargeIntakeResult = DischargeIntakeSuccess | DischargeIntakeFailure;

const FIELD_ALIASES: Record<DischargeField | ExtraField, string[]> = {
  patient_name: ["patient name", "patient", "name"],
  patient_id: ["patient id", "patientid", "mrn", "medical record number", "record number"],
  diagnosis_code: ["diagnosis code", "diagnosis", "icd", "icd10", "icd 10", "dx", "code"],
  attending_physician: ["attending physician", "attending", "physician", "doctor", "provider"],
  discharge_date: ["discharge date", "discharge", "discharged", "left hospital", "date"],
  readmission_risk: ["readmission risk", "risk", "risk level", "acuity"],
  follow_up: ["follow up", "follow-up", "fu", "followup"]
};

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const ALIAS_TO_FIELD = new Map<string, DischargeField | ExtraField>(
  Object.entries(FIELD_ALIASES).flatMap(([field, aliases]) =>
    aliases.map((alias) => [normalizeLabel(alias), field as DischargeField | ExtraField])
  )
);

function fieldForLabel(label: string): DischargeField | ExtraField | null {
  return ALIAS_TO_FIELD.get(normalizeLabel(label)) ?? null;
}

function normalizeRisk(value: string): string | undefined {
  const match = value.toLowerCase().match(/\b(low|medium|high)\b/);
  return match?.[1];
}

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  const iso = trimmed.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso?.[1] && iso[2] && iso[3]) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  const numeric = trimmed.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  if (numeric?.[1] && numeric[2] && numeric[3]) {
    return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  }

  const monthNames = new Map(
    [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december"
    ].map((month, index) => [month, String(index + 1).padStart(2, "0")])
  );
  const written = trimmed.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\b/);
  const month = written?.[2] ? monthNames.get(written[2].toLowerCase()) : undefined;
  if (written?.[1] && written[3] && month) {
    return `${written[3]}-${month}-${written[1].padStart(2, "0")}`;
  }

  const monthFirst = trimmed.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})\b/);
  const monthFirstMonth = monthFirst?.[1]
    ? monthNames.get(monthFirst[1].toLowerCase())
    : undefined;
  if (monthFirst?.[2] && monthFirst[3] && monthFirstMonth) {
    return `${monthFirst[3]}-${monthFirstMonth}-${monthFirst[2].padStart(2, "0")}`;
  }

  return trimmed;
}

function assignField(
  input: Partial<Record<DischargeField, string>>,
  context: Partial<Record<ExtraField, string>>,
  field: DischargeField | ExtraField,
  value: unknown
) {
  if (typeof value !== "string" && typeof value !== "number") {
    return;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return;
  }

  if (field === "readmission_risk") {
    const risk = normalizeRisk(trimmed);
    if (risk) {
      input[field] = risk;
    }
    return;
  }

  if (field === "discharge_date") {
    input[field] = normalizeDate(trimmed);
    return;
  }

  if (field === "patient_name" || field === "follow_up") {
    context[field] = trimmed;
    return;
  }

  input[field] = trimmed;
}

function extractFromObject(value: unknown) {
  const objectValue =
    Array.isArray(value) && value.length > 0 && typeof value[0] === "object"
      ? value[0]
      : value;
  const input: Partial<Record<DischargeField, string>> = {};
  const context: Partial<Record<ExtraField, string>> = {};

  if (!objectValue || typeof objectValue !== "object" || Array.isArray(objectValue)) {
    return { input, context };
  }

  for (const [key, entryValue] of Object.entries(objectValue)) {
    const field = fieldForLabel(key);
    if (field) {
      assignField(input, context, field, entryValue);
    }
  }

  return { input, context };
}

function extractFromJson(text: string) {
  try {
    return extractFromObject(JSON.parse(text));
  } catch {
    return null;
  }
}

function extractFromTable(text: string) {
  const doc = parseDelimitedRows(text);
  const row = doc.rows[0];
  if (!row) {
    return { input: {}, context: {} };
  }
  return extractFromObject(row);
}

function extractFromKeyValue(text: string) {
  const input: Partial<Record<DischargeField, string>> = {};
  const context: Partial<Record<ExtraField, string>> = {};
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const pair = line.match(/^([^:=]{2,80})\s*[:=]\s*(.+)$/);
    const field = pair?.[1] ? fieldForLabel(pair[1]) : null;
    if (field && pair?.[2] !== undefined) {
      assignField(input, context, field, pair[2]);
    }
  }

  return { input, context };
}

function firstMatch(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern);
  return match?.[1]?.trim();
}

function extractFromFreeText(text: string) {
  const input: Partial<Record<DischargeField, string>> = {};
  const context: Partial<Record<ExtraField, string>> = {};
  const patientId = firstMatch(
    text,
    /\b(?:MRN|medical record(?: number)?|record(?: number)?|patient id)\s*[-:#.]*(?:\.\.\.)?\s*([A-Z]{0,4}[- ]?\d{3,})\b/i
  );
  if (patientId) {
    const normalized = patientId.replace(/\s+/g, "-").toUpperCase();
    input.patient_id = normalized.startsWith("MRN") ? normalized : `MRN-${normalized}`;
  }

  const diagnosis =
    firstMatch(
      text,
      /\b(?:dx|diagnosis(?: code)?|icd(?:-?10)?|code|paperwork)\s*(?:is|was|=|:|says)?\s*([A-Z]\d{1,2}(?:\.\d+)?)\b/i
    ) ?? firstMatch(text, /\b(?:code|paperwork)\b[^\n.]{0,100}\b([A-Z]\d{1,2}(?:\.\d+)?)\b/i);
  if (diagnosis) {
    input.diagnosis_code = diagnosis.toUpperCase();
  }

  const physician =
    firstMatch(
      text,
      /\b(?:attending|physician|doctor|provider)\s*(?:is|=|:)?\s*(Dr\.?\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/i
    ) ?? firstMatch(text, /\bHi\s+(Dr\.?\s+[A-Z][A-Za-z]+)\b/i);
  if (physician) {
    input.attending_physician = physician.replace(/^Dr\s/i, "Dr. ");
  }

  const date = firstMatch(
    text,
    /\b(?:discharged on|discharge date|left hospital)\s+([A-Za-z]+\s+\d{1,2},?\s+20\d{2}|\d{1,2}\s+[A-Za-z]+\s+20\d{2}|\d{1,2}[/-]\d{1,2}[/-]20\d{2}|20\d{2}-\d{1,2}-\d{1,2})\b/i
  );
  if (date) {
    input.discharge_date = normalizeDate(date);
  }

  const risk = firstMatch(text, /\b(?:readmission\s+)?risk\s*(?:is|=|:)?\s*(low|medium|high)\b/i);
  if (risk) {
    input.readmission_risk = risk.toLowerCase();
  }

  const followUp =
    firstMatch(text, /\b(?:check back(?: with you)?|follow[- ]?up|FU)\s+(?:in\s+)?(about\s+\d+\s+\w+|\d+\s+\w+)\b/i) ??
    firstMatch(text, /\b(?:follow[- ]?up|FU)\s*(?:is|=|:|in)?\s*(none|no follow[- ]?up|as needed)\b/i);
  if (followUp) {
    context.follow_up = followUp.trim();
  }

  const nameLine = firstMatch(
    text,
    /^\s*(?:[-*\u2022]\s*)?([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,3})\s*\((?:MRN|medical record)/m
  );
  const signoff = firstMatch(text, /\b(?:Best|Regards|Thanks),?\s*\n\s*([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,3})\b/i);
  const patientName = nameLine ?? signoff;
  if (patientName) {
    context.patient_name = patientName;
  }

  return { input, context };
}

function mergeExtracted(
  attempts: Array<{
    sourceType: SourceType;
    input: Partial<Record<DischargeField, string>>;
    context: Partial<Record<ExtraField, string>>;
  }>
) {
  return attempts.reduce((best, current) => {
    const bestCount = Object.keys(best.input).length + Object.keys(best.context).length;
    const currentCount = Object.keys(current.input).length + Object.keys(current.context).length;
    return currentCount > bestCount ? current : best;
  });
}

function confidenceFor(matchedFields: DischargeField[]): number {
  return Math.round((matchedFields.length / REQUIRED_FIELDS.length) * 100) / 100;
}

export function extractDischargeInput(text: string): DischargeIntakeResult {
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
    input: Partial<Record<DischargeField, string>>;
    context: Partial<Record<ExtraField, string>>;
  }> = [
    { sourceType: "table", ...extractFromTable(sourceText) },
    { sourceType: "key_value", ...extractFromKeyValue(sourceText) },
    { sourceType: "free_text", ...extractFromFreeText(sourceText) }
  ];
  const jsonExtracted = extractFromJson(sourceText);
  if (jsonExtracted) {
    attempts.unshift({ sourceType: "json", ...jsonExtracted });
  }

  const bestAttempt = mergeExtracted(attempts);
  const matchedFields = REQUIRED_FIELDS.filter(
    (field) => bestAttempt.input[field] !== undefined
  );

  if (matchedFields.length === 0) {
    return {
      success: false,
      error: validationError([
        {
          path: "sourceText",
          message: "No recognizable discharge fields found"
        }
      ]),
      extracted: {}
    };
  }

  const missingFields = REQUIRED_FIELDS.filter(
    (field) => bestAttempt.input[field] === undefined
  );

  return {
    success: true,
    data: {
      input: bestAttempt.input,
      context: bestAttempt.context,
      sourceType: bestAttempt.sourceType,
      matchedFields,
      missingFields,
      confidence: confidenceFor(matchedFields),
      warnings:
        missingFields.length > 0
          ? [`Missing required fields: ${missingFields.join(", ")}`]
          : [],
      ready: missingFields.length === 0
    }
  };
}
