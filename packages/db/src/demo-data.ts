import { createVendorWorkflowFixture, type WorkflowDefinition } from "@agentport/core";
import { compileToolOrThrow } from "@agentport/core/compiler";
import { type PrismaClient } from "@prisma/client";
import { toJsonValue } from "./json";

export const DEMO_WORKSPACE_ID = "workspace_demo";
export const DEMO_TARGET_ID = "target_mock_procurement";
export const CREATE_VENDOR_WORKFLOW_ID = "workflow_create_vendor_v1";
export const CREATE_VENDOR_TOOL_ID = "tool_create_vendor";

export async function ensureDemoWorkspace(prisma: PrismaClient) {
  return prisma.workspace.upsert({
    where: { id: DEMO_WORKSPACE_ID },
    create: {
      id: DEMO_WORKSPACE_ID,
      name: "Demo workspace"
    },
    update: {
      name: "Demo workspace"
    }
  });
}

export async function ensureDemoTarget(prisma: PrismaClient, baseUrl: string) {
  await ensureDemoWorkspace(prisma);

  return prisma.target.upsert({
    where: {
      workspaceId_name: {
        workspaceId: DEMO_WORKSPACE_ID,
        name: "mock-procurement"
      }
    },
    create: {
      id: DEMO_TARGET_ID,
      workspaceId: DEMO_WORKSPACE_ID,
      name: "mock-procurement",
      baseUrl,
      authMode: "none"
    },
    update: {
      baseUrl,
      authMode: "none"
    }
  });
}

export async function ensureWorkflow(
  prisma: PrismaClient,
  workflow: WorkflowDefinition,
  targetBaseUrl: string
) {
  const target = await ensureDemoTarget(prisma, targetBaseUrl);
  const compiled = compileToolOrThrow(workflow);

  return prisma.workflow.upsert({
    where: {
      targetId_name_version: {
        targetId: target.id,
        name: workflow.name,
        version: workflow.version
      }
    },
    create: {
      id: CREATE_VENDOR_WORKFLOW_ID,
      targetId: target.id,
      name: workflow.name,
      version: workflow.version,
      definition: toJsonValue(workflow),
      contentHash: compiled.contentHash
    },
    update: {
      definition: toJsonValue(workflow),
      contentHash: compiled.contentHash
    }
  });
}

export async function ensureCreateVendorTool(
  prisma: PrismaClient,
  options: {
    targetBaseUrl: string;
    workflow?: WorkflowDefinition;
  }
) {
  const workflow = options.workflow ?? createVendorWorkflowFixture();
  const workflowRow = await ensureWorkflow(prisma, workflow, options.targetBaseUrl);
  const compiled = compileToolOrThrow(workflow);

  return prisma.tool.upsert({
    where: { workflowId: workflowRow.id },
    create: {
      id: CREATE_VENDOR_TOOL_ID,
      workflowId: workflowRow.id,
      name: compiled.name,
      inputSchema: toJsonValue(compiled.inputSchema),
      enabled: true
    },
    update: {
      name: compiled.name,
      inputSchema: toJsonValue(compiled.inputSchema),
      enabled: true
    },
    include: {
      workflow: {
        include: {
          target: true
        }
      }
    }
  });
}
