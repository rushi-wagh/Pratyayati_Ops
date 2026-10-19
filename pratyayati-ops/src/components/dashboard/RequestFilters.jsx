import Icon from "@/components/ui/Icon";
import { REASONS, SORT_OPTIONS, STATUSES } from "@/components/dashboard/constants";

export default function RequestFilters({ search, status, reason, sort, onSearchChange, onStatusChange, onReasonChange, onSortChange, onClear, hasFilters }) {
  return (
    <div className="filters" id="request-filters">
      <label className="search-field">
        <span className="sr-only">Search requests</span>
        <Icon name="search" />
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search reference, customer, email or order ID…" type="search" />
      </label>
      <label className="select-field"><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => onStatusChange(event.target.value)}><option value="ALL">All statuses</option>{STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="select-field"><span className="sr-only">Filter by reason</span><select value={reason} onChange={(event) => onReasonChange(event.target.value)}><option value="ALL">All reasons</option>{REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="select-field"><span className="sr-only">Sort requests</span><select value={sort} onChange={(event) => onSortChange(event.target.value)}>{SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      {hasFilters && <button className="clear-button" type="button" onClick={onClear}>Clear filters</button>}
    </div>
  );
}
