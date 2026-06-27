"use client";

import { useEffect, useRef, useState } from "react";

type TraceEventView = {
  type: string;
  runId: string;
  stepId?: string | undefined;
  reason?: string | undefined;
  [key: string]: unknown;
};

const TERMINAL_STATUSES = new Set([
  "succeeded",
  "validation_failed",
  "rejected",
  "failed"
]);

export function RunTracePanel({
  runId,
  status,
  initialEvents
}: {
  runId: string;
  status: string;
  initialEvents: TraceEventView[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const seenEvents = useRef(
    new Set(initialEvents.map((event) => JSON.stringify(event)))
  );

  useEffect(() => {
    if (TERMINAL_STATUSES.has(status)) {
      return;
    }

    const stream = new EventSource(`/api/runs/${runId}/stream`);

    function handleMessage(event: MessageEvent<string>) {
      const parsed = JSON.parse(event.data) as TraceEventView;
      const key = JSON.stringify(parsed);
      if (seenEvents.current.has(key)) {
        return;
      }

      seenEvents.current.add(key);
      setEvents((current) => [...current, parsed]);
    }

    const eventTypes = [
      "run_started",
      "step_started",
      "step_resolved",
      "screenshot",
      "approval_requested",
      "approval_decided",
      "selector_patch",
      "step_completed",
      "validation_result",
      "run_finished",
      "error"
    ];

    eventTypes.forEach((type) => stream.addEventListener(type, handleMessage));

    return () => {
      eventTypes.forEach((type) => stream.removeEventListener(type, handleMessage));
      stream.close();
    };
  }, [runId, status]);

  return (
    <section className="panel validation-panel">
      <div className="section-heading">
        <h2>Trace Events</h2>
        <span>{events.length}</span>
      </div>
      <ol className="trace-list">
        {events.map((event, index) => (
          <li key={`${event.type}-${index}`}>
            <div className="step-row">
              <div>
                <h3>{event.type}</h3>
                <p>{event.stepId ?? event.runId}</p>
              </div>
            </div>
            <pre className="result">{JSON.stringify(event, null, 2)}</pre>
          </li>
        ))}
      </ol>
    </section>
  );
}
