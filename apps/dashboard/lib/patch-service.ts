import {
  acceptSelectorPatch,
  getPrismaClient,
  listSelectorPatches
} from "@agentport/db";

export async function getSelectorPatches(accepted?: boolean) {
  return listSelectorPatches(
    getPrismaClient(),
    accepted === undefined ? {} : { accepted }
  );
}

export async function acceptPatch(patchId: string) {
  return acceptSelectorPatch(getPrismaClient(), patchId);
}
