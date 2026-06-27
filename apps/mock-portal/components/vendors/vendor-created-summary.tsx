import { type VendorRecord } from "@agentport/core";

type VendorCreatedSummaryProps = {
  vendor: VendorRecord;
};

/** Confirmation block shown after a vendor is created. */
export function VendorCreatedSummary({ vendor }: VendorCreatedSummaryProps) {
  return (
    <section className="success-state" role="status" aria-live="polite">
      <h2>Vendor created</h2>
      <dl>
        <div>
          <dt>Company</dt>
          <dd>{vendor.company_name}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{vendor.status}</dd>
        </div>
      </dl>
    </section>
  );
}
