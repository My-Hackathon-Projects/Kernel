import {
  applySelectorPatchToWorkflow,
  type SelectorPatchProposal
} from "@agentport/core";
import { compileToolOrThrow } from "@agentport/core/compiler";
import { type PrismaClient } from "@prisma/client";
import { toJsonValue } from "./json";
import { parseStoredWorkflow } from "./tools";

export type SelectorPatchListItem = Awaited<
  ReturnType<typeof listSelectorPatches>
>[number];

export async function createSelectorPatch(
  prisma: PrismaClient,
  params: {
    workflowId: string;
    runId: string;
    stepId: string;
    patch: SelectorPatchProposal;
  }
) {
  return prisma.selectorPatch.create({
    data: {
      workflowId: params.workflowId,
      runId: params.runId,
      stepId: params.stepId,
      oldSelector: params.patch.oldSelector,
      newSelector: params.patch.newSelector,
      tier: params.patch.tier,
      confidence: params.patch.confidence
    }
  });
}

export async function listSelectorPatches(
  prisma: PrismaClient,
  params: {
    accepted?: boolean;
    limit?: number;
  } = {}
) {
  return prisma.selectorPatch.findMany({
    where: params.accepted === undefined ? {} : { accepted: params.accepted },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 50,
    include: {
      workflow: {
        include: {
          target: true,
          tool: true
        }
      },
      run: {
        include: {
          tool: true
        }
      }
    }
  });
}

export async function acceptSelectorPatch(prisma: PrismaClient, patchId: string) {
  return prisma.$transaction(async (transaction) => {
    const patch = await transaction.selectorPatch.findUnique({
      where: { id: patchId },
      include: {
        workflow: {
          include: {
            tool: true
          }
        }
      }
    });

    if (!patch) {
      return null;
    }

    if (!patch.accepted) {
      const workflow = parseStoredWorkflow(patch.workflow.definition);
      const nextWorkflow = applySelectorPatchToWorkflow(workflow, {
        stepId: patch.stepId,
        selector: patch.newSelector,
        confidence: patch.confidence
      });
      const compiled = compileToolOrThrow(nextWorkflow);

      await transaction.workflow.update({
        where: { id: patch.workflowId },
        data: {
          definition: toJsonValue(nextWorkflow),
          contentHash: compiled.contentHash
        }
      });

      if (patch.workflow.tool) {
        await transaction.tool.update({
          where: { id: patch.workflow.tool.id },
          data: {
            inputSchema: toJsonValue(compiled.inputSchema)
          }
        });
      }
    }

    return transaction.selectorPatch.update({
      where: { id: patchId },
      data: { accepted: true }
    });
  });
}
