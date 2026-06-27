const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "medium"
});

/** Formats a timestamp for the run views, or "Not recorded" when absent. */
export function formatDate(value: Date | string | null): string {
  if (!value) {
    return "Not recorded";
  }

  return dateFormatter.format(new Date(value));
}

/** Formats the elapsed time between two timestamps in milliseconds. */
export function formatDuration(
  startedAt: Date | string | null,
  finishedAt: Date | string | null
): string {
  if (!startedAt || !finishedAt) {
    return "Not recorded";
  }

  const elapsed = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  return `${Math.max(0, elapsed)} ms`;
}
