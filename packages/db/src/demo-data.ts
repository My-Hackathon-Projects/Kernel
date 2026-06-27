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

async function ensureTarget(
  prisma: PrismaClient,
  params: { name: string; baseUrl: string; id?: string }
) {
  await ensureDemoWorkspace(prisma);

  return prisma.target.upsert({
    where: {
      workspaceId_name: {
        workspaceId: DEMO_WORKSPACE_ID,
        name: params.name
      }
    },
    create: {
      ...(params.id ? { id: params.id } : {}),
      workspaceId: DEMO_WORKSPACE_ID,
      name: params.name,
      baseUrl: params.baseUrl,
      authMode: "none"
    },
    update: {
      baseUrl: params.baseUrl,
      authMode: "none"
    }
  });
}

type StableIds = {
  targetId?: string;
  workflowId?: string;
  toolId?: string;
};

/**
 * Compiles a workflow and persists its Target, Workflow, and Tool rows in the
 * demo workspace, returning the tool with its workflow and target included.
 * Re-runnable: workflows upsert by (target, name, version) and tools by
 * workflow. `ids` pins stable identifiers for the seeded create_vendor demo;
 * studio-imported workflows leave them unset and get generated cuids.
 */
export async function upsertWorkflowTool(
  prisma: PrismaClient,
  params: {
    workflow: WorkflowDefinition;
    targetBaseUrl: string;
    ids?: StableIds;
  }
) {
  const compiled = compileToolOrThrow(params.workflow);
  const target = await ensureTarget(prisma, {
    name: params.workflow.target,
    baseUrl: params.targetBaseUrl,
    ...(params.ids?.targetId ? { id: params.ids.targetId } : {})
  });

  const workflowRow = await prisma.workflow.upsert({
    where: {
      targetId_name_version: {
        targetId: target.id,
        name: params.workflow.name,
        version: params.workflow.version
      }
    },
    create: {
      ...(params.ids?.workflowId ? { id: params.ids.workflowId } : {}),
      targetId: target.id,
      name: params.workflow.name,
      version: params.workflow.version,
      definition: toJsonValue(params.workflow),
      contentHash: compiled.contentHash
    },
    update: {
      definition: toJsonValue(params.workflow),
      contentHash: compiled.contentHash
    }
  });

  return prisma.tool.upsert({
    where: { workflowId: workflowRow.id },
    create: {
      ...(params.ids?.toolId ? { id: params.ids.toolId } : {}),
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

export async function ensureCreateVendorTool(
  prisma: PrismaClient,
  options: {
    targetBaseUrl: string;
    workflow?: WorkflowDefinition;
  }
) {
  const workflow = options.workflow ?? createVendorWorkflowFixture();

  return upsertWorkflowTool(prisma, {
    workflow,
    targetBaseUrl: options.targetBaseUrl,
    ids: {
      targetId: DEMO_TARGET_ID,
      workflowId: CREATE_VENDOR_WORKFLOW_ID,
      toolId: CREATE_VENDOR_TOOL_ID
    }
  });
}
