"use client";

import { useState } from "react";

type PatchSummary = {
  id: string;
  stepId: string;
  oldSelector: string | null;
  newSelector: string;
  tier: number;
  confidence: number;
  accepted: boolean;
  workflow: {
    name: string;
    version: number;
  };
  runId: string | null;
};

export function PatchReview({ patches }: { patches: PatchSummary[] }) {
  const [items, setItems] = useState(patches);
  const [busyPatchId, setBusyPatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function accept(patchId: string) {
    setBusyPatchId(patchId);
    setError(null);

    try {
      const response = await fetch(`/api/patches/${patchId}/accept`, {
        method: "POST"
      });

      if (!response.ok) {
        setError("Could not accept selector patch");
        return;
      }

      setItems((current) =>
        current.map((patch) =>
          patch.id === patchId ? { ...patch, accepted: true } : patch
        )
      );
    } catch {
      setError("Could not accept selector patch");
    } finally {
      setBusyPatchId(null);
    }
  }

  return (
    <div className="patch-review">
      {items.length === 0 ? <p className="muted">No selector patches</p> : null}

      {items.map((patch) => (
        <article className="approval-card" key={patch.id}>
          <div>
            <h3>{patch.workflow.name}</h3>
            <p>
              {patch.stepId} - tier {patch.tier} - {Math.round(patch.confidence * 100)}%
            </p>
          </div>
          <dl className="approval-meta">
            <div>
              <dt>Old selector</dt>
              <dd>{patch.oldSelector ?? "None"}</dd>
            </div>
            <div>
              <dt>New selector</dt>
              <dd>{patch.newSelector}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{patch.accepted ? "accepted" : "pending"}</dd>
            </div>
          </dl>
          {!patch.accepted ? (
            <button
              type="button"
              disabled={busyPatchId === patch.id}
              onClick={() => void accept(patch.id)}
            >
              Accept patch
            </button>
          ) : null}
        </article>
      ))}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
