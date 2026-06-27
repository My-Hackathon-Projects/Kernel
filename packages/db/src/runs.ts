import {
  type ApprovalDecision,
  type RunStatus,
  type TraceEvent,
  type ValidationResult,
  type WorkflowDefinition,
  type WorkflowInput
} from "@agentport/core";
import { type PrismaClient } from "@prisma/client";
import { DEMO_WORKSPACE_ID, ensureCreateVendorTool } from "./demo-data";
import { toJsonValue } from "./json";
import { cloneWorkflowInput } from "./tools";

export type RunDetail = Awaited<ReturnType<typeof getRunDetail>>;

const RUN_SEQ_BASE = 100000;

/**
 * Allocates the next sequential, human-readable run number. SQLite reserves
 * `autoincrement()` for primary keys, so we keep a dedicated counter row and
 * rely on an atomic `increment` update, which stays unique under the parallel
 * runs the E2E suite creates.
 */
async function nextRunSeq(prisma: PrismaClient): Promise<number> {
  const counter = await prisma.counter.upsert({
    where: { id: "run" },
    create: { id: "run", value: RUN_SEQ_BASE + 1 },
    update: { value: { increment: 1 } }
  });

  return counter.value;
}

export async function listRecentRuns(prisma: PrismaClient, limit = 50) {
  return prisma.run.findMany({
    orderBy: [{ seq: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      tool: {
        include: {
          workflow: {
            include: {
              target: true
            }
          }
        }
      }
    }
  });
}

/**
 * Deletes a run and its cascaded children (steps, approvals, validations,
 * artifacts). Audit events and selector patches keep their rows with the run
 * reference nulled, so the append-only audit trail is preserved. Returns the
 * stored artifact URIs so the caller can remove the screenshot files, or null
 * when the run does not exist.
 */
export async function deleteRun(
  prisma: PrismaClient,
  runId: string
): Promise<string[] | null> {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: { id: true, artifacts: { select: { uri: true } } }
  });

  if (!run) {
    return null;
  }

  await prisma.run.delete({ where: { id: runId } });
  return run.artifacts.map((artifact) => artifact.uri);
}

export async function ensureRunForExecution(
  prisma: PrismaClient,
  params: {
    runId: string;
    workflow: WorkflowDefinition;
    input: WorkflowInput;
    targetBaseUrl: string;
  }
) {
  const tool = await ensureCreateVendorTool(prisma, {
    targetBaseUrl: params.targetBaseUrl,
    workflow: params.workflow
  });

  const existing = await prisma.run.findUnique({
    where: { id: params.runId },
    select: { id: true }
  });
  const seq = existing ? undefined : await nextRunSeq(prisma);

  return prisma.run.upsert({
    where: { id: params.runId },
    create: {
      id: params.runId,
      ...(seq !== undefined ? { seq } : {}),
      toolId: tool.id,
      workflowVersion: params.workflow.version,
      input: toJsonValue(cloneWorkflowInput(params.input)),
      status: "pending"
    },
    update: {
      input: toJsonValue(cloneWorkflowInput(params.input)),
      status: "pending",
      error: null
    },
    include: {
      tool: true
    }
  });
}

export async function createRunForTool(
  prisma: PrismaClient,
  params: {
    toolId: string;
    workflowVersion: number;
    input: WorkflowInput;
    callerId?: string;
  }
) {
  return prisma.run.create({
    data: {
      seq: await nextRunSeq(prisma),
      toolId: params.toolId,
      workflowVersion: params.workflowVersion,
      input: toJsonValue(cloneWorkflowInput(params.input)),
      status: "pending",
      callerId: params.callerId ?? null
    }
  });
}

export async function markRunStarted(prisma: PrismaClient, runId: string) {
  return prisma.run.update({
    where: { id: runId },
    data: {
      status: "running",
      startedAt: new Date(),
      error: null
    }
  });
}

export async function markRunFinished(
  prisma: PrismaClient,
  params: {
    runId: string;
    status: Extract<
      RunStatus,
      "succeeded" | "validation_failed" | "rejected" | "failed"
    >;
    error?: string;
  }
) {
  return prisma.run.update({
    where: { id: params.runId },
    data: {
      status: params.status,
      error: params.error ?? null,
      finishedAt: new Date()
    }
  });
}

export async function markRunAwaitingApproval(prisma: PrismaClient, runId: string) {
  return prisma.run.update({
    where: { id: runId },
    data: {
      status: "awaiting_approval"
    }
  });
}

export async function createRunStep(
  prisma: PrismaClient,
  params: {
    runId: string;
    stepId: string;
    action: string;
  }
) {
  return prisma.runStep.create({
    data: {
      runId: params.runId,
      stepId: params.stepId,
      action: params.action,
      status: "running"
    }
  });
}

export async function completeRunStep(
  prisma: PrismaClient,
  params: {
    id: string;
    selector?: string;
    resolvedValue?: string;
    resolvedTier?: number;
    durationMs: number;
    screenshotId?: string;
  }
) {
  return prisma.runStep.update({
    where: { id: params.id },
    data: {
      selector: params.selector ?? null,
      resolvedValue: params.resolvedValue ?? null,
      resolvedTier: params.resolvedTier ?? null,
      durationMs: params.durationMs,
      screenshotId: params.screenshotId ?? null,
      status: "succeeded"
    }
  });
}

export async function markRunStepAwaitingApproval(
  prisma: PrismaClient,
  params: {
    id: string;
    selector?: string;
    resolvedValue?: string;
    resolvedTier?: number;
    durationMs: number;
    screenshotId?: string;
  }
) {
  return prisma.runStep.update({
    where: { id: params.id },
    data: {
      selector: params.selector ?? null,
      resolvedValue: params.resolvedValue ?? null,
      resolvedTier: params.resolvedTier ?? null,
      durationMs: params.durationMs,
      screenshotId: params.screenshotId ?? null,
      status: "awaiting_approval"
    }
  });
}

export async function markRunStepRejected(
  prisma: PrismaClient,
  params: {
    id: string;
    durationMs: number;
  }
) {
  return prisma.runStep.update({
    where: { id: params.id },
    data: {
      durationMs: params.durationMs,
      status: "rejected"
    }
  });
}

export async function failRunStep(
  prisma: PrismaClient,
  params: {
    id: string;
    durationMs: number;
  }
) {
  return prisma.runStep.update({
    where: { id: params.id },
    data: {
      durationMs: params.durationMs,
      status: "failed"
    }
  });
}

export async function createScreenshotArtifact(
  prisma: PrismaClient,
  params: {
    runId: string;
    stepId: string;
    uri: string;
  }
) {
  return prisma.artifact.create({
    data: {
      runId: params.runId,
      stepId: params.stepId,
      kind: "screenshot",
      uri: params.uri
    }
  });
}

export async function createValidation(
  prisma: PrismaClient,
  params: {
    runId: string;
    type: string;
    result: ValidationResult;
  }
) {
  return prisma.validation.create({
    data: {
      runId: params.runId,
      type: params.type,
      expected: toJsonValue(params.result.expected),
      actual: toJsonValue(params.result.actual),
      passed: params.result.passed,
      reason: params.result.reason ?? null
    }
  });
}

export async function createAuditEvent(
  prisma: PrismaClient,
  params: {
    runId?: string;
    type: string;
    data: unknown;
  }
) {
  return prisma.auditEvent.create({
    data: {
      workspaceId: DEMO_WORKSPACE_ID,
      runId: params.runId ?? null,
      type: params.type,
      data: toJsonValue(params.data)
    }
  });
}

export async function createTraceEvent(prisma: PrismaClient, event: TraceEvent) {
  return createAuditEvent(prisma, {
    runId: event.runId,
    type: event.type,
    data: event
  });
}

export async function listAuditEventsForRun(prisma: PrismaClient, runId: string) {
  return prisma.auditEvent.findMany({
    where: { runId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });
}

export async function createApprovalRequest(
  prisma: PrismaClient,
  params: {
    runId: string;
    stepId: string;
    prompt: string;
    payload: unknown;
  }
) {
  return prisma.approvalRequest.create({
    data: {
      runId: params.runId,
      stepId: params.stepId,
      prompt: params.prompt,
      payload: toJsonValue(params.payload),
      status: "pending"
    }
  });
}

export async function getApprovalRequest(prisma: PrismaClient, approvalId: string) {
  return prisma.approvalRequest.findUnique({
    where: { id: approvalId },
    include: {
      run: {
        include: {
          tool: true
        }
      }
    }
  });
}

export async function listApprovalRequests(
  prisma: PrismaClient,
  params: {
    status?: string;
  } = {}
) {
  return prisma.approvalRequest.findMany({
    where: params.status ? { status: params.status } : {},
    orderBy: { createdAt: "asc" },
    include: {
      run: {
        include: {
          tool: true
        }
      }
    }
  });
}

export async function decideApprovalRequest(
  prisma: PrismaClient,
  params: {
    approvalId: string;
    decision: ApprovalDecision;
    decidedBy: string;
  }
) {
  return prisma.approvalRequest.update({
    where: { id: params.approvalId },
    data: {
      status: params.decision === "approve" ? "approved" : "rejected",
      decidedBy: params.decidedBy,
      decidedAt: new Date()
    }
  });
}

export async function getRunDetail(prisma: PrismaClient, runId: string) {
  return prisma.run.findUnique({
    where: { id: runId },
    include: {
      tool: {
        include: {
          workflow: {
            include: {
              target: true
            }
          }
        }
      },
      steps: {
        orderBy: { createdAt: "asc" }
      },
      artifacts: {
        orderBy: { createdAt: "asc" }
      },
      validations: {
        orderBy: { createdAt: "asc" }
      },
      approvals: {
        orderBy: { createdAt: "asc" }
      },
      selectorPatches: {
        orderBy: { createdAt: "asc" }
      },
      auditEvents: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      }
    }
  });
}
