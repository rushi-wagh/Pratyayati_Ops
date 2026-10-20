import { Suspense } from "react";
import RequestDetailsPage from "@/components/requests/RequestDetailsPage";

export default function RequestDetailsRoute() {
  return (
    <Suspense fallback={<div className="detail-state"><span className="spinner" /><p>Loading request details…</p></div>}>
      <RequestDetailsPage />
    </Suspense>
  );
}
