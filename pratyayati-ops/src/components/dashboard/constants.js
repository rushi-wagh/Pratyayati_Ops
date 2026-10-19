export const STATUSES = [
  { value: "OPEN", label: "Open", className: "status-open" },
  { value: "IN_REVIEW", label: "In Review", className: "status-review" },
  { value: "APPROVED", label: "Approved", className: "status-approved" },
  { value: "COMPLETED", label: "Completed", className: "status-completed" },
  { value: "REJECTED", label: "Rejected", className: "status-rejected" },
];

export const REASONS = [
  { value: "DEFECTIVE", label: "Defective" },
  { value: "WRONG_ITEM", label: "Wrong item" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "NO_LONGER_NEEDED", label: "No longer needed" },
  { value: "DELIVERY_ISSUE", label: "Delivery issue" },
  { value: "OTHER", label: "Other" },
];

export const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "updatedAt:desc", label: "Recently updated" },
  { value: "customerName:asc", label: "Customer A–Z" },
  { value: "customerName:desc", label: "Customer Z–A" },
  { value: "status:asc", label: "Status A–Z" },
  { value: "reference:asc", label: "Reference A–Z" },
];
