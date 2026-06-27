import { describe, expect, it, vi } from "vitest";

const { getRecentRuns, resetRunData } = vi.hoisted(() => ({
  getRecentRuns: vi.fn(),
  resetRunData: vi.fn()
}));

vi.mock("../lib/run-service", () => ({
  getRecentRuns,
  resetRunData
}));

const { DELETE, GET } = await import("../app/api/runs/route");

describe("/api/runs", () => {
  it("lists recent runs", async () => {
    getRecentRuns.mockResolvedValueOnce([{ id: "run_123" }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.runs).toEqual([{ id: "run_123" }]);
  });

  it("resets demo run data", async () => {
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ deleted: true });
    expect(resetRunData).toHaveBeenCalledOnce();
  });
});
