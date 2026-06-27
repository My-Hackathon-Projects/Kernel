import type { ZodError } from "zod";

export type ApiErrorDetail = { path: string; message: string };

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
};

export function apiError(
  code: string,
  message: string,
  details?: ApiErrorDetail[]
): ApiErrorBody {
  const error: ApiErrorBody["error"] = { code, message };

  if (details !== undefined) {
    error.details = details;
  }

  return { error };
}

export function validationError(details: ApiErrorDetail[]): ApiErrorBody {
  return apiError("validation_failed", "Request validation failed", details);
}

export function formatZodError(error: ZodError): ApiErrorBody {
  return validationError(
    error.issues.flatMap((issue) => {
      if (issue.code === "unrecognized_keys") {
        return issue.keys.map((key) => ({
          path: key,
          message: "Unrecognized input"
        }));
      }

      return [
        {
          path: issue.path.join(".") || "(root)",
          message: issue.message
        }
      ];
    })
  );
}

/** Type guard for the shared API error envelope `{ error: { code, message } }`. */
export function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return false;
  }

  const error = (body as { error?: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

/**
 * Reads a human-readable message from an unknown response body, falling back to
 * the provided default when the body is not a typed API error.
 */
export function getApiErrorMessage(body: unknown, fallback: string): string {
  return isApiErrorBody(body) ? body.error.message : fallback;
}
