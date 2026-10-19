export async function fetchRequests({ page, search, status, reason, sort }) {
  const [sortBy, sortOrder] = sort.split(":");
  const params = new URLSearchParams({ page: String(page), limit: "10", sortBy, sortOrder });

  if (search) params.set("search", search);
  if (status !== "ALL") params.set("status", status);
  if (reason !== "ALL") params.set("reason", reason);

  const response = await fetch(`/api/requests?${params.toString()}`);
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || "Unable to fetch requests.");
  }

  return payload;
}
