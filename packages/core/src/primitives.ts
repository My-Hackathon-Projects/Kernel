import { z } from "zod";

/**
 * Shared zod building blocks used across vendor and workflow contracts.
 * Keeping them in one place avoids redefining the same validators per schema.
 */
export const nonEmptyString = z.string().trim().min(1, "Required");

export const relativePathString = nonEmptyString
  .startsWith("/")
  .refine((value) => !value.startsWith("//"), {
    message: "Path must be relative to the target host"
  })
  .refine((value) => !/^[a-z][a-z0-9+.-]*:\/\//i.test(value), {
    message: "Path must not include a URL scheme"
  });
