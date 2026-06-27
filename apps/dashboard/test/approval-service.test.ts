import { describe, expect, it, vi } from "vitest";

const {
  getApprovalRequest,
  getPrismaClient,
  listApprovalRequests,
  postRunnerJson,
  rejectApprovalWithoutResume
} = vi.hoisted(() => ({
  getApprovalRequest: vi.fn(),
  getPrismaClient: vi.fn(() => ({})),
  listApprovalRequests: vi.fn(),
  postRunnerJson: vi.fn(),
  rejectApprovalWithoutResume: vi.fn()
}));

vi.mock("@agentport/db", () => ({
  getApprovalRequest,
  getPrismaClient,
  listApprovalRequests,
  rejectApprovalWithoutResume
}));

vi.mock("../lib/runner-client", () => ({
  postRunnerJson
}));

const { decideApproval } = await import("../lib/approval-service");

describe("decideApproval", () => {
  it("rejects stale approvals without a live runner session", async () => {
    getApprovalRequest.mockResolvedValueOnce({
      id: "approval_123",
      runId: "run_123",
      status: "pending"
    });
    postRunnerJson.mockResolvedValueOnce({
      success: false,
      error: {
        error: {
          code: "resume_failed",
          message: "No pending in-memory execution found for approval"
        }
      }
    });
    rejectApprovalWithoutResume.mockResolvedValueOnce({
      approvalId: "approval_123",
      runId: "run_123"
    });

    const outcome = await decideApproval({
      approvalId: "approval_123",
      decision: "reject"
    });

    expect(outcome.success).toBe(true);
    if (outcome.success) {
      expect(outcome.result.status).toBe("rejected");
      expect(outcome.result.approval).toEqual({
        id: "approval_123",
        status: "rejected"
      });
    }
    expect(rejectApprovalWithoutResume).toHaveBeenCalledWith(expect.anything(), {
      approvalId: "approval_123",
      decidedBy: "dashboard",
      reason: "Approval rejected"
    });
  });
});
