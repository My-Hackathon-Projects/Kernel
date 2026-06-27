import Link from "next/link";
import { listVendors } from "../../lib/vendor-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function VendorsPage() {
  const vendors = listVendors();

  return (
    <main>
      <section className="portal-shell">
        <div className="page-header">
          <div>
            <p className="eyebrow">Procurement</p>
            <h1>Vendors</h1>
          </div>
          <Link className="button primary" href="/vendors/new">
            Create Vendor
          </Link>
        </div>

        {vendors.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">Country</th>
                  <th scope="col">Tax ID</th>
                  <th scope="col">Risk</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>{vendor.company_name}</td>
                    <td>{vendor.country}</td>
                    <td>{vendor.tax_id}</td>
                    <td className="capitalize">{vendor.risk_level}</td>
                    <td>
                      <span className="status-pill">{vendor.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No vendors yet.</p>
        )}
      </section>
    </main>
  );
}
