"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/ui/StatusBadge";
import { REASONS } from "@/components/dashboard/constants";
import {
  createRequestNote,
  fetchRequest,
  removeRequest,
  updateRequestStatus,
} from "@/lib/requests";

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

const NOTE_OPTIONS = [
  { value: "INTERNAL_UPDATE", label: "Internal Update" },
  { value: "CUSTOMER_CONTACT", label: "Customer Contact" },
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
  const router = useRouter();
  const id = params.id;
  const [request, setRequest] = useState(null);
  const [state, setState] = useState("loading");
  const [resolutionType, setResolutionType] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [noteCategory, setNoteCategory] = useState("INTERNAL_UPDATE");
  const [noteContent, setNoteContent] = useState("");
  const [noteError, setNoteError] = useState("");
  const [noteSuccess, setNoteSuccess] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [removalOpen, setRemovalOpen] = useState(false);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState("");
  const [removing, setRemoving] = useState(false);
  const removalDialogRef = useRef(null);

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

  useEffect(() => {
    if (!removalOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !removing) {
        setRemovalOpen(false);
        setRemovalError("");
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    removalDialogRef.current?.querySelector("textarea")?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [removalOpen, removing]);

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

  async function handleNoteSubmit(event) {
    event.preventDefault();

    if (!request || request.isRemoved) {
      setNoteError("This request has been removed and cannot receive new notes.");
      return;
    }

    const trimmedContent = noteContent.trim();

    if (!noteCategory) {
      setNoteError("Please choose a note category.");
      setNoteSuccess("");
      return;
    }

    if (!trimmedContent) {
      setNoteError("Please enter a note before submitting.");
      setNoteSuccess("");
      return;
    }

    if (trimmedContent.length > 2000) {
      setNoteError("Notes cannot exceed 2000 characters.");
      setNoteSuccess("");
      return;
    }

    setNoteError("");
    setNoteSaving(true);
    setNoteSuccess("");

    try {
      await createRequestNote(id, {
        category: noteCategory,
        content: trimmedContent,
      });

      const refreshedRequest = await fetchRequest(id);
      setRequest(refreshedRequest);
      setNoteCategory("INTERNAL_UPDATE");
      setNoteContent("");
      setNoteSuccess("Note added successfully.");
    } catch (error) {
      setNoteError(error.message || "Unable to add the note. Please try again.");
    } finally {
      setNoteSaving(false);
    }
  }

  function openRemovalDialog() {
    setRemovalReason("");
    setRemovalError("");
    setRemovalOpen(true);
  }

  function closeRemovalDialog() {
    if (removing) return;
    setRemovalOpen(false);
    setRemovalError("");
  }

  async function handleRemovalSubmit(event) {
    event.preventDefault();
    const trimmedReason = removalReason.trim();

    if (!trimmedReason) {
      setRemovalError("Please provide a reason for removing this request.");
      return;
    }

    if (trimmedReason.length > 500) {
      setRemovalError("Removal reason cannot exceed 500 characters.");
      return;
    }

    setRemovalError("");
    setRemoving(true);

    try {
      await removeRequest(id, trimmedReason);
      router.push("/");
      router.refresh();
    } catch (error) {
      setRemovalError(
        error.message || "Unable to remove the request. Please try again.",
      );
      setRemoving(false);
    }
  }

  function renderRemovalDialog() {
    if (!removalOpen) return null;

    return (
      <div
        className="removal-dialog-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !removing) {
            closeRemovalDialog();
          }
        }}
      >
        <div
          className="removal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="removal-dialog-heading"
          ref={removalDialogRef}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="removal-dialog-heading">
            <div className="removal-dialog-icon" aria-hidden="true">
              <Icon name="trash" size={19} />
            </div>
            <p className="eyebrow">Remove request</p>
            <h2 id="removal-dialog-heading">Remove this request?</h2>
            <p>
              This request will be hidden from normal operational views. Its
              record and notes will be preserved.
            </p>
          </div>
          <form onSubmit={handleRemovalSubmit}>
            <label className="form-field">
              <span>Reason for removal</span>
              <textarea
                value={removalReason}
                onChange={(event) => {
                  setRemovalReason(event.target.value);
                  setRemovalError("");
                }}
                maxLength={500}
                rows={4}
                placeholder="Explain why this request should be removed..."
                disabled={removing}
              />
            </label>
            <div className="removal-dialog-meta">
              <span>{removalReason.length}/500</span>
            </div>
            {removalError && (
              <div className="status-action-feedback status-action-error" role="alert">
                {removalError}
              </div>
            )}
            <div className="removal-dialog-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={closeRemovalDialog}
                disabled={removing}
              >
                Cancel
              </button>
              <button className="danger-button" type="submit" disabled={removing}>
                {removing ? "Removing…" : "Confirm Removal"}
              </button>
            </div>
          </form>
        </div>
      </div>
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

            {["OPEN", "REJECTED"].includes(request.status) && (
              <section className="details-card removal-card" aria-labelledby="removal-heading">
                <div>
                  <h2 id="removal-heading">Remove request</h2>
                  <p>
                    Hide this request from normal operational views while
                    preserving its record and notes.
                  </p>
                </div>
                <button className="danger-button" type="button" onClick={openRemovalDialog}>
                  Remove Request
                </button>
              </section>
            )}

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

              {!request.isRemoved && (
                <form className="note-form" onSubmit={handleNoteSubmit}>
                  <div className="form-section-heading">
                    <h3>Add Note</h3>
                    <p>Record an internal or customer-facing update.</p>
                  </div>

                  <div className="note-form-grid">
                    <label className="form-field">
                      <span>Category</span>
                      <select
                        value={noteCategory}
                        onChange={(event) => {
                          setNoteCategory(event.target.value);
                          setNoteError("");
                          setNoteSuccess("");
                        }}
                        disabled={noteSaving}
                      >
                        {NOTE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <div className="note-content-box">
                      <label className="form-field">
                        <span>Note</span>
                        <textarea
                          value={noteContent}
                          onChange={(event) => {
                            setNoteContent(event.target.value);
                            setNoteError("");
                            setNoteSuccess("");
                          }}
                          maxLength={2000}
                          rows={5}
                          placeholder="Enter a note for the request history…"
                          disabled={noteSaving}
                        />
                      </label>
                      <div className="note-meta-row">
                        <span>{noteContent.length}/2000</span>
                        <button className="primary-button" type="submit" disabled={noteSaving}>
                          {noteSaving ? "Saving…" : "Add Note"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {(noteError || noteSuccess) && (
                    <div className={`note-form-feedback ${noteError ? "status-action-error" : "status-action-success"}`} role={noteError ? "alert" : "status"}>
                      {noteError || noteSuccess}
                    </div>
                  )}
                </form>
              )}
            </section>
          </>
        )}
      </div>
      {renderRemovalDialog()}
    </AppShell>
  );
}
