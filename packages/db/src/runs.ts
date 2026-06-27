import {
  type RunStatus,
  type ValidationResult,
  type WorkflowDefinition,
  type WorkflowInput
} from "@agentport/core";
import { type PrismaClient } from "@prisma/client";
import { DEMO_WORKSPACE_ID, ensureCreateVendorTool } from "./demo-data";
import { toJsonValue } from "./json";
import { cloneWorkflowInput } from "./tools";

export type RunDetail = Awaited<ReturnType<typeof getRunDetail>>;

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

  return prisma.run.upsert({
    where: { id: params.runId },
    create: {
      id: params.runId,
      toolId: tool.id,
      workflowVersion: params.workflow.version,
      input: toJsonValue(cloneWorkflowInput(params.input)),
      status: "pending"
    },
    update: {
      input: toJsonValue(cloneWorkflowInput(params.input)),
      status: "pending",
      error: null
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
    status: Extract<RunStatus, "succeeded" | "failed">;
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
      }
    }
  });
}
