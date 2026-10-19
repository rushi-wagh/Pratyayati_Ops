import { STATUSES } from "@/components/dashboard/constants";

export default function StatusBadge({ status }) {
  const statusInfo = STATUSES.find((item) => item.value === status);
  return <span className={`status-badge ${statusInfo?.className || ""}`}>{statusInfo?.label || status}</span>;
}
