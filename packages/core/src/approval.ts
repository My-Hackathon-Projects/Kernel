import { z } from "zod";
import { nonEmptyString } from "./primitives";

export const approvalDecisionSchema = z.enum(["approve", "reject"]);

export const resumeRequestSchema = z.object({
  runId: nonEmptyString,
  approvalId: nonEmptyString,
  decision: approvalDecisionSchema
});

export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
export type ResumeRequest = z.infer<typeof resumeRequestSchema>;
