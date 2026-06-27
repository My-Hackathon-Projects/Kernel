import Link from "next/link";
import { PatchReview } from "../../components/patch-review";
import { getSelectorPatches } from "../../lib/patch-service";

export const dynamic = "force-dynamic";

export default async function PatchesPage() {
  const patches = await getSelectorPatches();
  const patchSummaries = patches.map((patch) => ({
    id: patch.id,
    stepId: patch.stepId,
    oldSelector: patch.oldSelector,
    newSelector: patch.newSelector,
    tier: patch.tier,
    confidence: patch.confidence,
    accepted: patch.accepted,
    runId: patch.runId,
    workflow: {
      name: patch.workflow.name,
      version: patch.workflow.version
    }
  }));

  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <Link href="/" className="back-link">
            Back to home
          </Link>
          <div>
            <p className="eyebrow">Resolver</p>
            <h1>Selector Patches</h1>
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Patch Review</h2>
            <span>{patchSummaries.length}</span>
          </div>
          <PatchReview patches={patchSummaries} />
        </section>
      </div>
    </main>
  );
}
