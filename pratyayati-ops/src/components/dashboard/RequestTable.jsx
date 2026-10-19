import Link from "next/link";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/ui/StatusBadge";
import { REASONS } from "@/components/dashboard/constants";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatReason(value) {
  return REASONS.find((reason) => reason.value === value)?.label || value || "—";
}

export default function RequestTable({ requests }) {
  return (
    <div className="table-wrap"><table><thead><tr><th>Reference</th><th>Customer</th><th>Order ID</th><th>Item</th><th>Reason</th><th>Status</th><th>Created</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td><Link className="reference-link" href={`/requests/${request.id}`}>{request.reference || "—"} <Icon name="arrow" size={14} /></Link></td><td><div className="customer-cell"><strong>{request.customerName || "—"}</strong><span>{request.customerEmail || "—"}</span></div></td><td>{request.orderId || "—"}</td><td className="item-cell">{request.itemName || "—"}</td><td>{formatReason(request.reason)}</td><td><StatusBadge status={request.status} /></td><td className="date-cell">{formatDate(request.createdAt)}</td><td><Link className="view-link" href={`/requests/${request.id}`}>View <Icon name="chevron" size={14} /></Link></td></tr>)}</tbody></table></div>
  );
}
