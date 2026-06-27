import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function findUpward(startDir: string, relativePath: string): string | null {
  let currentDir = startDir;

  while (true) {
    const candidate = path.join(currentDir, relativePath);
    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

export function loadRunnerEnv(startDir = process.cwd()): void {
  const envFile = findUpward(startDir, ".env");
  if (!envFile) {
    return;
  }

  const content = readFileSync(envFile, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(ANTHROPIC_API_KEY|ANTHROPIC_MODEL)\s*=\s*(.*)\s*$/);
    const key = match?.[1] as "ANTHROPIC_API_KEY" | "ANTHROPIC_MODEL" | undefined;
    const value = match?.[2];
    if (!key || value === undefined || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value.replace(/^['"]|['"]$/g, "");
  }
}

/**
 * Points Playwright at the repo-local browser cache. `pnpm playwright:install`
 * downloads Chromium into `.cache/ms-playwright`, so without this the runner
 * looks in the default home cache and fails to launch the browser.
 *
 * An absolute path already chosen by the operator is respected. A relative
 * value (the dev script default) is replaced with the resolved absolute path,
 * because Playwright resolves a relative browsers path against the current
 * working directory at launch, which is not guaranteed to be the package root.
 */
export function ensurePlaywrightBrowsersPath(startDir = process.cwd()): void {
  const current = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (current !== undefined && current !== "" && path.isAbsolute(current)) {
    return;
  }

  const cacheDir = findUpward(startDir, path.join(".cache", "ms-playwright"));
  if (cacheDir) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = cacheDir;
  }
}
