import {
  workflowDefinitionSchema,
  type WorkflowDefinition,
  type WorkflowInput
} from "@agentport/core";
import { type PrismaClient } from "@prisma/client";

export type ToolWithWorkflow = Awaited<ReturnType<typeof getToolWithWorkflow>>;

export async function listEnabledTools(prisma: PrismaClient) {
  return prisma.tool.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
    include: {
      workflow: {
        include: {
          target: true
        }
      }
    }
  });
}

export async function getToolWithWorkflow(prisma: PrismaClient, toolId: string) {
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    include: {
      workflow: {
        include: {
          target: true
        }
      }
    }
  });

  if (!tool || !tool.enabled) {
    return null;
  }

  return tool;
}

export function parseStoredWorkflow(definition: unknown): WorkflowDefinition {
  return workflowDefinitionSchema.parse(definition);
}

export function cloneWorkflowInput(input: WorkflowInput): Record<string, string> {
  return Object.fromEntries(Object.entries(input));
}
