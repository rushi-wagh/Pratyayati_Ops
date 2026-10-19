import Icon from "@/components/ui/Icon";

export function LoadingState() {
  return <div className="state-card"><div className="spinner" /><p>Loading requests…</p></div>;
}

export function ErrorState({ message, onRetry }) {
  return <div className="state-card error-state"><div><strong>We couldn’t load the requests</strong><p>{message}</p></div><button className="secondary-button" type="button" onClick={onRetry}><Icon name="refresh" /> Try again</button></div>;
}

export function EmptyState({ filtered, onClear }) {
  return <div className="state-card empty-state"><div className="empty-icon"><Icon name="search" /></div><strong>{filtered ? "No matching requests" : "No return requests yet"}</strong><p>{filtered ? "Try adjusting your search or filters." : "New return requests will appear here."}</p>{filtered && <button className="secondary-button" type="button" onClick={onClear}>Clear filters</button>}</div>;
}
