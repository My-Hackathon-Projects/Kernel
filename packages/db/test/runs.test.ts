import { describe, expect, it, vi } from "vitest";
import { deleteAllRuns, deleteRun } from "../src/runs";

type RunStub = {
  id: string;
  seq: number;
  artifacts: Array<{ uri: string }>;
};

function createPrismaStub(initialRuns: RunStub[]) {
  const runs = new Map(initialRuns.map((run) => [run.id, run]));
  let counterValue: number | null = null;
  const tx = {
    run: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const run = runs.get(where.id);
        return run
          ? {
              id: run.id,
              artifacts: run.artifacts
            }
          : null;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        runs.delete(where.id);
      }),
      aggregate: vi.fn(async () => ({
        _max: {
          seq:
            Array.from(runs.values()).reduce<number | null>(
              (max, run) => (max === null || run.seq > max ? run.seq : max),
              null
            ) ?? null
        }
      }))
    },
    counter: {
      upsert: vi.fn(
        async ({
          create,
          update
        }: {
          create: { value: number };
          update: { value: number };
        }) => {
          counterValue = update.value ?? create.value;
          return { id: "run", value: counterValue };
        }
      )
    }
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) =>
      callback(tx)
    )
  };

  return { prisma, tx, getCounterValue: () => counterValue };
}

function createResetPrismaStub(artifactUris: string[]) {
  let counterValue: number | null = null;
  const tx = {
    artifact: {
      findMany: vi.fn(async () => artifactUris.map((uri) => ({ uri })))
    },
    auditEvent: {
      deleteMany: vi.fn(async () => ({ count: 2 }))
    },
    selectorPatch: {
      deleteMany: vi.fn(async () => ({ count: 1 }))
    },
    run: {
      deleteMany: vi.fn(async () => ({ count: 3 }))
    },
    counter: {
      upsert: vi.fn(
        async ({
          create,
          update
        }: {
          create: { value: number };
          update: { value: number };
        }) => {
          counterValue = update.value ?? create.value;
          return { id: "run", value: counterValue };
        }
      )
    }
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) =>
      callback(tx)
    )
  };

  return { prisma, tx, getCounterValue: () => counterValue };
}

describe("deleteRun", () => {
  it("resets the run counter to the highest remaining run number", async () => {
    const { prisma, getCounterValue } = createPrismaStub([
      { id: "run_previous", seq: 100011, artifacts: [] },
      {
        id: "run_latest",
        seq: 100012,
        artifacts: [{ uri: "/tmp/artifacts/run_latest/s1.png" }]
      }
    ]);

    const artifactUris = await deleteRun(prisma as never, "run_latest");

    expect(artifactUris).toEqual(["/tmp/artifacts/run_latest/s1.png"]);
    expect(getCounterValue()).toBe(100011);
  });

  it("resets the run counter to the base number when no runs remain", async () => {
    const { prisma, getCounterValue } = createPrismaStub([
      { id: "run_only", seq: 100001, artifacts: [] }
    ]);

    const artifactUris = await deleteRun(prisma as never, "run_only");

    expect(artifactUris).toEqual([]);
    expect(getCounterValue()).toBe(100000);
  });

  it("does not reset the counter when the run does not exist", async () => {
    const { prisma, tx, getCounterValue } = createPrismaStub([]);

    const artifactUris = await deleteRun(prisma as never, "missing");

    expect(artifactUris).toBeNull();
    expect(tx.counter.upsert).not.toHaveBeenCalled();
    expect(getCounterValue()).toBeNull();
  });
});

describe("deleteAllRuns", () => {
  it("deletes demo run records and resets the run counter", async () => {
    const { prisma, tx, getCounterValue } = createResetPrismaStub([
      "/tmp/artifacts/run_1/s1.png",
      "/tmp/artifacts/run_2/s1.png"
    ]);

    const artifactUris = await deleteAllRuns(prisma as never);

    expect(artifactUris).toEqual([
      "/tmp/artifacts/run_1/s1.png",
      "/tmp/artifacts/run_2/s1.png"
    ]);
    expect(tx.auditEvent.deleteMany).toHaveBeenCalledWith({});
    expect(tx.selectorPatch.deleteMany).toHaveBeenCalledWith({});
    expect(tx.run.deleteMany).toHaveBeenCalledWith({});
    expect(getCounterValue()).toBe(100000);
  });
});
