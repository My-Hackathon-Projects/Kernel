import { traceEventSchema, type TraceEvent } from "@agentport/core";
import { getPrismaClient, getRunDetail, listAuditEventsForRun } from "@agentport/db";

const encoder = new TextEncoder();

export function formatTraceEventSse(event: TraceEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function parseTraceEvent(value: unknown): TraceEvent | null {
  const parsed = traceEventSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function createRunStream(runId: string): ReadableStream<Uint8Array> {
  const sentIds = new Set<string>();
  let interval: NodeJS.Timeout | undefined;
  let closed = false;

  function close(controller: ReadableStreamDefaultController<Uint8Array>) {
    if (closed) {
      return;
    }

    closed = true;
    clearInterval(interval);
    controller.close();
  }

  return new ReadableStream({
    async start(controller) {
      async function flush() {
        if (closed) {
          return;
        }

        const events = await listAuditEventsForRun(getPrismaClient(), runId);
        for (const event of events) {
          if (sentIds.has(event.id)) {
            continue;
          }

          sentIds.add(event.id);
          const traceEvent = parseTraceEvent(event.data);
          if (traceEvent) {
            controller.enqueue(encoder.encode(formatTraceEventSse(traceEvent)));
          }
        }

        const run = await getRunDetail(getPrismaClient(), runId);
        if (
          run &&
          ["succeeded", "validation_failed", "rejected", "failed"].includes(run.status)
        ) {
          close(controller);
        }
      }

      await flush();
      interval = setInterval(() => {
        void flush().catch((error) => {
          closed = true;
          clearInterval(interval);
          controller.error(error);
        });
      }, 500);
    },
    cancel() {
      closed = true;
      clearInterval(interval);
    }
  });
}
