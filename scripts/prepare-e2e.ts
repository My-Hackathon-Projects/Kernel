import { rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const tmpDir = path.join(rootDir, ".tmp");
const dbPath = path.join(tmpDir, "agentport-e2e.sqlite");
const artifactRoot = path.join(tmpDir, "artifacts");
const databaseUrl = "file:../.tmp/agentport-e2e.sqlite";

await mkdir(tmpDir, { recursive: true });
await rm(dbPath, { force: true });
await rm(`${dbPath}-journal`, { force: true });
await rm(`${dbPath}-wal`, { force: true });
await rm(`${dbPath}-shm`, { force: true });
await rm(artifactRoot, { recursive: true, force: true });
await mkdir(artifactRoot, { recursive: true });

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "prisma",
    "db",
    "push",
    "--schema",
    "prisma/schema.prisma",
    "--skip-generate"
  ],
  {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl
    }
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
