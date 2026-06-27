import {
  apiError,
  approvalDecisionSchema,
  runnerExecuteResultSchema,
  type ApiErrorBody,
  type ApprovalDecision,
  type RunnerExecuteResult
} from "@agentport/core";
import {
  getApprovalRequest,
  getPrismaClient,
  listApprovalRequests,
  rejectApprovalWithoutResume
} from "@agentport/db";
import { resolveDashboardConfig } from "./config";
import { postRunnerJson } from "./runner-client";

export type ApprovalSummary = {
  id: string;
  runId: string;
  toolName: string;
  stepId: string;
  prompt: string;
  payload: unknown;
  status: string;
  createdAt: string;
};

export type ApprovalDecisionOutcome =
  | { success: true; result: RunnerExecuteResult }
  | { success: false; status: number; error: ApiErrorBody };

function toApprovalSummary(
  approval: Awaited<ReturnType<typeof listApprovalRequests>>[number]
): ApprovalSummary {
  return {
    id: approval.id,
    runId: approval.runId,
    toolName: approval.run.tool.name,
    stepId: approval.stepId,
    prompt: approval.prompt,
    payload: approval.payload,
    status: approval.status,
    createdAt: approval.createdAt.toISOString()
  };
}

export async function getApprovals(status = "pending"): Promise<ApprovalSummary[]> {
  const approvals = await listApprovalRequests(getPrismaClient(), { status });
  return approvals.map(toApprovalSummary);
}

function evidenceUrl(runId: string): string {
  return `${resolveDashboardConfig().dashboardBaseUrl}/runs/${runId}`;
}

function staleRejectedResult(params: {
  runId: string;
  approvalId: string;
}): RunnerExecuteResult {
  return {
    runId: params.runId,
    status: "rejected",
    steps: [],
    artifacts: [],
    approval: {
      id: params.approvalId,
      status: "rejected"
    },
    validation: null,
    evidenceUrl: evidenceUrl(params.runId)
  };
}

export async function decideApproval(params: {
  approvalId: string;
  decision: ApprovalDecision;
}): Promise<ApprovalDecisionOutcome> {
  const parsedDecision = approvalDecisionSchema.safeParse(params.decision);
  if (!parsedDecision.success) {
    return {
      success: false,
      status: 400,
      error: apiError("validation_failed", "Invalid approval decision")
    };
  }

  const approval = await getApprovalRequest(getPrismaClient(), params.approvalId);
  if (!approval) {
    return {
      success: false,
      status: 404,
      error: apiError("not_found", "Approval not found")
    };
  }

  if (approval.status !== "pending") {
    return {
      success: false,
      status: 409,
      error: apiError("approval_not_pending", "Approval has already been decided")
    };
  }

  const runnerResult = await postRunnerJson({
    path: "/resume",
    body: {
      runId: approval.runId,
      approvalId: approval.id,
      decision: parsedDecision.data
    }
  });

  if (!runnerResult.success) {
    if (parsedDecision.data === "reject") {
      const rejected = await rejectApprovalWithoutResume(getPrismaClient(), {
        approvalId: approval.id,
        decidedBy: "dashboard",
        reason: "Approval rejected"
      });

      if (rejected) {
        return {
          success: true,
          result: staleRejectedResult(rejected)
        };
      }
    }

    return {
      success: false,
      status: 502,
      error: runnerResult.error
    };
  }

  const parsedRunnerResult = runnerExecuteResultSchema.safeParse(runnerResult.data);
  if (!parsedRunnerResult.success) {
    return {
      success: false,
      status: 502,
      error: apiError("runner_contract_mismatch", "Runner response was invalid")
    };
  }

  return {
    success: true,
    result: parsedRunnerResult.data
  };
}
