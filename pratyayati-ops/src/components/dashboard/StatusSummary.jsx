import { STATUSES } from "@/components/dashboard/constants";

export default function StatusSummary({ counts }) {
  return (
    <section className="summary-grid" aria-label="Request status summary">
      {STATUSES.map((status) => (
        <div className="summary-card" key={status.value}>
          <div className={`summary-icon ${status.className}`}><span /></div>
          <div><p>{status.label}</p><strong>{counts[status.value] ?? 0}</strong></div>
        </div>
      ))}
    </section>
  );
}
