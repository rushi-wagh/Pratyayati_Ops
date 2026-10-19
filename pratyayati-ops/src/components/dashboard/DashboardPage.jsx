"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Icon from "@/components/ui/Icon";
import StatusSummary from "@/components/dashboard/StatusSummary";
import RequestFilters from "@/components/dashboard/RequestFilters";
import RequestTable from "@/components/dashboard/RequestTable";
import Pagination from "@/components/dashboard/Pagination";
import { EmptyState, ErrorState, LoadingState } from "@/components/dashboard/RequestStates";
import { fetchRequests } from "@/lib/requests";

const DEFAULT_FILTERS = { search: "", status: "ALL", reason: "ALL", sort: "createdAt:desc" };

export default function DashboardPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], pagination: { page: 1, total: 0, totalPages: 0 }, statusCounts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setFilters((current) => ({ ...current, search: searchInput.trim() }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchRequests({ page, ...filters }));
    } catch (requestError) {
      setData((current) => ({ ...current, data: [] }));
      setError(requestError.message || "Unable to fetch requests.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const request = setTimeout(loadRequests, 0);
    return () => clearTimeout(request);
  }, [loadRequests]);

  const hasFilters = searchInput.length > 0 || filters.status !== "ALL" || filters.reason !== "ALL" || filters.sort !== DEFAULT_FILTERS.sort;
  const resultLabel = useMemo(() => {
    if (loading) return "Loading requests…";
    if (data.pagination.total === 0) return "0 requests";
    return `${data.pagination.total} ${data.pagination.total === 1 ? "request" : "requests"}`;
  }, [data.pagination.total, loading]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  function clearFilters() {
    setSearchInput("");
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  return (
    <AppShell>
      <header className="page-header">
        <div><p className="eyebrow">Operations overview</p><h1>Return Requests</h1><p className="page-subtitle">Manage and track customer return requests.</p></div>
        <Link className="primary-button" href="/requests/new"><span>+</span> New Request</Link>
      </header>
      <StatusSummary counts={data.statusCounts} />
      <section className="requests-panel" aria-labelledby="requests-heading">
        <div className="panel-heading">
          <div><h2 id="requests-heading">All requests</h2><span className="result-count">{resultLabel}</span></div>
          <button className="filter-toggle" type="button" onClick={() => document.getElementById("request-filters")?.scrollIntoView({ behavior: "smooth" })}><Icon name="filter" /> Filters</button>
        </div>
        <RequestFilters
          search={searchInput}
          status={filters.status}
          reason={filters.reason}
          sort={filters.sort}
          onSearchChange={setSearchInput}
          onStatusChange={(value) => updateFilter("status", value)}
          onReasonChange={(value) => updateFilter("reason", value)}
          onSortChange={(value) => updateFilter("sort", value)}
          onClear={clearFilters}
          hasFilters={hasFilters}
        />
        {error ? <ErrorState message={error} onRetry={loadRequests} /> : loading ? <LoadingState /> : data.data.length === 0 ? <EmptyState filtered={hasFilters} onClear={clearFilters} /> : <RequestTable requests={data.data} />}
        {!error && !loading && data.data.length > 0 && <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} onPrevious={() => setPage((current) => current - 1)} onNext={() => setPage((current) => current + 1)} />}
      </section>
    </AppShell>
  );
}
