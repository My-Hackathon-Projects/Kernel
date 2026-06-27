import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function findEnvFile(startDir: string): string | null {
  let currentDir = startDir;

  while (true) {
    const candidate = path.join(currentDir, ".env");
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
  const envFile = findEnvFile(startDir);
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
