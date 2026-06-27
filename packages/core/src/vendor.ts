import { z } from "zod";

const nonEmptyString = z.string().trim().min(1, "Required");

export const vendorRiskLevels = ["low", "medium", "high"] as const;
export const vendorStatuses = ["Pending Approval"] as const;

export const createVendorInputSchema = z
  .object({
    company_name: nonEmptyString,
    country: nonEmptyString,
    tax_id: nonEmptyString,
    risk_level: z.enum(vendorRiskLevels)
  })
  .strict();

export const vendorRecordSchema = createVendorInputSchema.extend({
  id: nonEmptyString,
  status: z.enum(vendorStatuses),
  createdAt: nonEmptyString
});

export type CreateVendorInput = z.infer<typeof createVendorInputSchema>;
export type VendorRecord = z.infer<typeof vendorRecordSchema>;
export type VendorRiskLevel = (typeof vendorRiskLevels)[number];
export type VendorStatus = (typeof vendorStatuses)[number];
