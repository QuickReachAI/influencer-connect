/**
 * Map the 12 DealStatus enum values into 4 UI groups,
 * plus helper functions for labels and badge colors.
 */

type DealStatusGroup = "active" | "pending" | "completed" | "cancelled";

const STATUS_GROUP_MAP: Record<string, DealStatusGroup> = {
  DRAFT: "pending",
  LOCKED: "active",
  SCRIPT_PENDING: "active",
  SCRIPT_APPROVED: "active",
  PAYMENT_50_PENDING: "active",
  PRODUCTION: "active",
  DELIVERY_PENDING: "active",
  REVISION_PENDING: "active",
  PAYMENT_100_PENDING: "active",
  COMPLETED: "completed",
  DISPUTED: "cancelled",
  CANCELLED: "cancelled",
};

export function getDealStatusGroup(status: string): DealStatusGroup {
  return STATUS_GROUP_MAP[status] ?? "pending";
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  LOCKED: "Locked",
  SCRIPT_PENDING: "Script Pending",
  SCRIPT_APPROVED: "Script Approved",
  PAYMENT_50_PENDING: "Payment 50% Pending",
  PRODUCTION: "In Production",
  DELIVERY_PENDING: "Delivery Pending",
  REVISION_PENDING: "Revision Pending",
  PAYMENT_100_PENDING: "Final Payment Pending",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
  CANCELLED: "Cancelled",
};

export function getDealStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const STATUS_COLORS: Record<DealStatusGroup, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export function getDealStatusColor(status: string): string {
  return STATUS_COLORS[getDealStatusGroup(status)] ?? STATUS_COLORS.pending;
}

/**
 * Badge variant for shadcn Badge component.
 */
export function getDealStatusBadgeVariant(status: string): "success" | "warning" | "default" | "destructive" {
  const group = getDealStatusGroup(status);
  switch (group) {
    case "active": return "success";
    case "pending": return "warning";
    case "completed": return "default";
    case "cancelled": return "destructive";
  }
}
