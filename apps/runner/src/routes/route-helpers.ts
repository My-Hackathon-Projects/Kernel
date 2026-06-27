import { apiError } from "@agentport/core";
import { type FastifyReply } from "fastify";

type RouteErrorContext = {
  errorCode: string;
  message: string;
  logContext: Record<string, unknown>;
};

/**
 * Runs the post-validation work for a runner route and turns any thrown error
 * into a single typed 500 response, logged with the run context. The `/execute`
 * and `/resume` routes share this so their success path and error envelope stay
 * identical and in one place.
 */
export async function sendExecutionResult<T>(
  reply: FastifyReply,
  errorContext: RouteErrorContext,
  run: () => Promise<T>
): Promise<FastifyReply> {
  try {
    return await reply.status(200).send(await run());
  } catch (error) {
    const detail = error instanceof Error ? error.message : errorContext.message;
    reply.log.error({ err: error, ...errorContext.logContext }, errorContext.message);
    return reply.status(500).send(apiError(errorContext.errorCode, detail));
  }
}
