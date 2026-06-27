import { type CreateVendorInput, type VendorRecord } from "@agentport/core";
import { randomUUID } from "node:crypto";

type VendorStoreGlobal = typeof globalThis & {
  __agentportVendorStore?: VendorRecord[];
};

const vendorStoreGlobal = globalThis as VendorStoreGlobal;

function getVendorStore(): VendorRecord[] {
  vendorStoreGlobal.__agentportVendorStore ??= [];
  return vendorStoreGlobal.__agentportVendorStore;
}

function cloneVendor(vendor: VendorRecord): VendorRecord {
  return { ...vendor };
}

function normalizeCompanyName(value: string): string {
  return value.trim().toLowerCase();
}

export function createVendor(input: CreateVendorInput): VendorRecord {
  const vendor: VendorRecord = {
    id: randomUUID(),
    ...input,
    status: "Pending Approval",
    createdAt: new Date().toISOString()
  };

  getVendorStore().push(vendor);
  return cloneVendor(vendor);
}

export function listVendors(): VendorRecord[] {
  return getVendorStore().map(cloneVendor);
}

export function findVendorByCompanyName(companyName: string): VendorRecord | null {
  const normalizedQuery = normalizeCompanyName(companyName);

  if (normalizedQuery.length === 0) {
    return null;
  }

  const vendor = getVendorStore().find((candidate) =>
    normalizeCompanyName(candidate.company_name).includes(normalizedQuery)
  );

  return vendor ? cloneVendor(vendor) : null;
}

export function resetVendorStoreForTest(): void {
  getVendorStore().splice(0);
}
