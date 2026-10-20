"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/ui/StatusBadge";
import { REASONS } from "@/components/dashboard/constants";
import { fetchRequest, updateRequestStatus } from "@/lib/requests";

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

const RESOLUTION_OPTIONS = [
  { value: "REFUND", label: "Refund" },
  { value: "REPLACEMENT", label: "Replacement" },
  { value: "STORE_CREDIT", label: "Store credit" },
];

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
  const [resolutionType, setResolutionType] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  function resetActionFeedback() {
    setActionError("");
    setSuccessMessage("");
  }

  function validateApproval() {
    if (!resolutionType) {
      return "Please select a resolution before approving this request.";
    }

    if (resolutionType === "REFUND") {
      const amount = Number(refundAmount);

      if (!refundAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
        return "Please enter a valid refund amount greater than ₹0.";
      }

      if (Math.round(amount * 100) !== amount * 100) {
        return "Refund amounts can have at most two decimal places.";
      }
    }

    return "";
  }

  async function submitStatusUpdate(payload, message) {
    resetActionFeedback();
    setSubmitting(true);

    try {
      await updateRequestStatus(id, payload);
      const refreshedRequest = await fetchRequest(id);
      setRequest(refreshedRequest);
      setResolutionType("");
      setRefundAmount("");
      setSuccessMessage(message);
    } catch (error) {
      setActionError(error.message || "Unable to update the request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReview() {
    submitStatusUpdate(
      { status: "IN_REVIEW" },
      "Request moved to In Review.",
    );
  }

  function handleApprove(event) {
    event.preventDefault();
    const validationMessage = validateApproval();

    if (validationMessage) {
      setActionError(validationMessage);
      setSuccessMessage("");
      return;
    }

    const payload = {
      status: "APPROVED",
      resolutionType,
    };

    if (resolutionType === "REFUND") {
      payload.refundAmount = refundAmount;
    }

    submitStatusUpdate(payload, "Request approved successfully.");
  }

  function handleReject() {
    if (window.confirm("Reject this request? This action cannot be reversed.")) {
      submitStatusUpdate({ status: "REJECTED" }, "Request rejected.");
    }
  }

  function handleComplete() {
    if (window.confirm("Mark this approved request as completed?")) {
      submitStatusUpdate({ status: "COMPLETED" }, "Request marked as completed.");
    }
  }

  function renderStatusActions() {
    if (!request || request.status === "COMPLETED" || request.status === "REJECTED") {
      return null;
    }

    return (
      <section className="details-card status-actions-card" aria-labelledby="status-actions-heading">
        <div className="details-card-heading">
          <div>
            <h2 id="status-actions-heading">Request actions</h2>
            <p>Move this request through its defined lifecycle.</p>
          </div>
        </div>
        <div className="status-actions-content">
          {request.status === "OPEN" && (
            <button className="primary-button" type="button" onClick={handleReview} disabled={submitting}>
              {submitting ? "Updating…" : "Move to In Review"}
            </button>
          )}

          {request.status === "IN_REVIEW" && (
            <form className="approval-form" onSubmit={handleApprove}>
              <div className="form-section-heading">
                <h3>Approve request</h3>
                <p>Select how the customer request will be resolved.</p>
              </div>
              <label className="form-field">
                <span>Resolution type</span>
                <select
                  value={resolutionType}
                  onChange={(event) => {
                    setResolutionType(event.target.value);
                    setActionError("");
                  }}
                  disabled={submitting}
                >
                  <option value="">Select a resolution</option>
                  {RESOLUTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              {resolutionType === "REFUND" && (
                <label className="form-field">
                  <span>Refund amount (₹)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={refundAmount}
                    onChange={(event) => {
                      setRefundAmount(event.target.value);
                      setActionError("");
                    }}
                    placeholder="e.g. 499.00"
                    disabled={submitting}
                  />
                </label>
              )}
              <div className="status-action-buttons">
                <button className="primary-button" type="submit" disabled={submitting}>
                  {submitting ? "Approving…" : "Approve Request"}
                </button>
                <button className="secondary-button" type="button" onClick={handleReject} disabled={submitting}>
                  Reject Request
                </button>
              </div>
            </form>
          )}

          {request.status === "APPROVED" && (
            <button className="primary-button" type="button" onClick={handleComplete} disabled={submitting}>
              {submitting ? "Completing…" : "Mark as Completed"}
            </button>
          )}
        </div>
        {(actionError || successMessage) && (
          <div className={`status-action-feedback ${actionError ? "status-action-error" : "status-action-success"}`} role={actionError ? "alert" : "status"}>
            {actionError || successMessage}
          </div>
        )}
      </section>
    );
  }

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

            {renderStatusActions()}

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
