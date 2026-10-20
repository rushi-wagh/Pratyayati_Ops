"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/ui/StatusBadge";
import { REASONS } from "@/components/dashboard/constants";
import { fetchRequest } from "@/lib/requests";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatReason(value) {
  return REASONS.find((reason) => reason.value === value)?.label || value || "—";
}

function formatResolution(value) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRefundAmount(value) {
  if (value === null || value === undefined || value === "") return "—";

  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }).format(amount)
    : "—";
}

function DetailField({ label, value, wide = false }) {
  return (
    <div className={`detail-field${wide ? " detail-field-wide" : ""}`}>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function LoadingState() {
  return (
    <section className="detail-state" aria-live="polite">
      <span className="spinner" />
      <p>Loading request details…</p>
    </section>
  );
}

function ErrorState({ notFound }) {
  return (
    <section className="detail-state detail-error-state" role="alert">
      <div className="detail-state-icon">!</div>
      <h2>{notFound ? "Request not found" : "Unable to load request"}</h2>
      <p>
        {notFound
          ? "This request may have been removed or the link may be invalid."
          : "Something went wrong while loading this request. Please try again."}
      </p>
      <Link className="secondary-button" href="/">
        Back to Dashboard
      </Link>
    </section>
  );
}

function Notes({ notes }) {
  if (!notes.length) {
    return (
      <div className="notes-empty">
        <div className="notes-empty-icon" aria-hidden="true">•••</div>
        <strong>No activity notes yet</strong>
        <p>Notes added during the request workflow will appear here.</p>
      </div>
    );
  }

  return (
    <ol className="notes-list">
      {notes.map((note) => (
        <li className="note-item" key={note.id}>
          <div className="note-marker" aria-hidden="true" />
          <article className="note-card">
            <div className="note-heading">
              <div>
                <span className="note-category">{formatResolution(note.category)}</span>
                <strong>{note.author || "—"}</strong>
              </div>
              <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
            </div>
            <p>{note.content}</p>
          </article>
        </li>
      ))}
    </ol>
  );
}

export default function RequestDetailsPage() {
  const params = useParams();
  const id = params.id;
  const [request, setRequest] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let active = true;

    fetchRequest(id)
      .then((data) => {
        if (!active) return;
        setRequest(data);
        setState("ready");
      })
      .catch((error) => {
        if (!active) return;
        setState(error.status === 404 || error.code === "REQUEST_NOT_FOUND" ? "not-found" : "error");
      });

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <AppShell>
      <div className="details-page">
        <Link className="back-link" href="/">
          <Icon name="chevron" size={15} /> Back to Dashboard
        </Link>

        {state === "loading" && <LoadingState />}
        {state === "not-found" && <ErrorState notFound />}
        {state === "error" && <ErrorState />}

        {state === "ready" && request && (
          <>
            <header className="details-header">
              <div>
                <p className="eyebrow">Request details</p>
                <div className="details-title-row">
                  <h1>{request.reference || "Return Request"}</h1>
                  <StatusBadge status={request.status} />
                </div>
                <p className="page-subtitle">Review the customer return request and its activity history.</p>
              </div>
            </header>

            <div className="details-layout">
              <section className="details-card request-overview-card">
                <div className="details-card-heading">
                  <div>
                    <h2>Request overview</h2>
                    <p>Customer, order, and return information.</p>
                  </div>
                </div>
                <dl className="details-grid">
                  <DetailField label="Customer name" value={request.customerName} />
                  <DetailField label="Customer email" value={request.customerEmail} />
                  <DetailField label="Order ID" value={request.orderId} />
                  <DetailField label="Item ID" value={request.itemId} />
                  <DetailField label="Item name" value={request.itemName} />
                  <DetailField label="Return reason" value={formatReason(request.reason)} />
                  <DetailField label="Description" value={request.description} wide />
                </dl>
              </section>

              <aside className="details-card request-meta-card">
                <div className="details-card-heading">
                  <div>
                    <h2>Request timeline</h2>
                    <p>Key dates and resolution details.</p>
                  </div>
                </div>
                <dl className="meta-list">
                  <DetailField label="Created" value={formatDate(request.createdAt)} />
                  <DetailField label="Last updated" value={formatDate(request.updatedAt)} />
                  <DetailField label="Resolution" value={formatResolution(request.resolutionType)} />
                  {request.refundAmount !== null && request.refundAmount !== undefined && (
                    <DetailField label="Refund amount" value={formatRefundAmount(request.refundAmount)} />
                  )}
                </dl>
              </aside>
            </div>

            <section className="details-card notes-card">
              <div className="details-card-heading">
                <div>
                  <h2>Activity notes</h2>
                  <p>Chronological updates recorded for this request.</p>
                </div>
                {request.notes?.length > 0 && <span className="notes-count">{request.notes.length} {request.notes.length === 1 ? "note" : "notes"}</span>}
              </div>
              <Notes notes={request.notes || []} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
