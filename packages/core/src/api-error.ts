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
