"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Icon from "@/components/ui/Icon";
import { REASONS } from "@/components/dashboard/constants";
import { createRequest } from "@/lib/requests";

const INITIAL_FORM = {
  customerName: "",
  customerEmail: "",
  orderId: "",
  itemId: "",
  itemName: "",
  reason: "",
  description: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimForm(form) {
  return Object.fromEntries(Object.entries(form).map(([field, value]) => [field, value.trim()]));
}

function validateForm(form) {
  const values = trimForm(form);
  const errors = {};

  Object.entries(values).forEach(([field, value]) => {
    if (!value) errors[field] = "This field is required.";
  });
  if (values.customerEmail && !EMAIL_PATTERN.test(values.customerEmail)) {
    errors.customerEmail = "Please enter a valid customer email address.";
  }
  return errors;
}

function FieldError({ id, message }) {
  return message ? <p className="field-error" id={id}>{message}</p> : null;
}

export default function CreateRequestPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdRequest, setCreatedRequest] = useState(null);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError("");
  }

  function resetForAnotherRequest() {
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitError("");
    setSaving(false);
    setCreatedRequest(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const values = trimForm(form);
    const validationErrors = validateForm(values);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitError("Please review the highlighted fields.");
      return;
    }

    setSaving(true);
    setErrors({});
    setSubmitError("");
    try {
      const payload = await createRequest(values);
      setCreatedRequest(payload.request);
    } catch (error) {
      if (error.code === "VALIDATION_ERROR" && error.fields.length > 0) {
        setErrors(Object.fromEntries(error.fields.map((field) => [field, "This field is required."])));
      }
      setSubmitError(error.message || "Unable to create the return request.");
    } finally {
      setSaving(false);
    }
  }

  if (createdRequest) {
    return (
      <AppShell>
        <div className="form-page">
          <Link className="back-link" href="/"><Icon name="chevron" size={15} /> Back to Dashboard</Link>
          <section className="form-card success-card">
            <div className="success-icon">✓</div>
            <p className="eyebrow">Request created</p>
            <h1>Return request registered</h1>
            <p className="success-copy">The request has been added to your operations queue.</p>
            <div className="reference-callout"><span>Request reference</span><strong>{createdRequest.reference}</strong></div>
            <div className="success-actions">
              <button className="primary-button" type="button" onClick={resetForAnotherRequest}>Create Another Request</button>
              <Link className="secondary-button" href="/">Return to Dashboard</Link>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="form-page">
        <div className="form-page-header">
          <div>
            <Link className="back-link" href="/"><Icon name="chevron" size={15} /> Back to Dashboard</Link>
            <p className="eyebrow">Request intake</p>
            <h1>Create Return Request</h1>
            <p className="page-subtitle">Register a new customer return request for your operations team.</p>
          </div>
          <Link className="cancel-link" href="/">Cancel</Link>
        </div>

        <form className="form-card request-form" onSubmit={handleSubmit} noValidate>
          <div className="form-section-heading"><h2>Customer and order details</h2><p>Provide the information associated with this return.</p></div>
          {submitError && <div className="form-alert" role="alert"><strong>Unable to create request</strong><span>{submitError}</span></div>}
          <div className="form-grid">
            <label className="form-field"><span>Customer Name <em aria-hidden="true">*</em></span><input name="customerName" value={form.customerName} onChange={(event) => updateField("customerName", event.target.value)} placeholder="e.g. Ananya Sharma" aria-invalid={Boolean(errors.customerName)} aria-describedby="customerName-error" /> <FieldError id="customerName-error" message={errors.customerName} /></label>
            <label className="form-field"><span>Customer Email <em aria-hidden="true">*</em></span><input name="customerEmail" type="email" value={form.customerEmail} onChange={(event) => updateField("customerEmail", event.target.value)} placeholder="customer@example.com" aria-invalid={Boolean(errors.customerEmail)} aria-describedby="customerEmail-error" /> <FieldError id="customerEmail-error" message={errors.customerEmail} /></label>
            <label className="form-field"><span>Order ID <em aria-hidden="true">*</em></span><input name="orderId" value={form.orderId} onChange={(event) => updateField("orderId", event.target.value)} placeholder="e.g. ORD-10482" aria-invalid={Boolean(errors.orderId)} aria-describedby="orderId-error" /> <FieldError id="orderId-error" message={errors.orderId} /></label>
            <label className="form-field"><span>Item ID <em aria-hidden="true">*</em></span><input name="itemId" value={form.itemId} onChange={(event) => updateField("itemId", event.target.value)} placeholder="e.g. SKU-7842" aria-invalid={Boolean(errors.itemId)} aria-describedby="itemId-error" /> <FieldError id="itemId-error" message={errors.itemId} /></label>
            <label className="form-field form-field-wide"><span>Item Name <em aria-hidden="true">*</em></span><input name="itemName" value={form.itemName} onChange={(event) => updateField("itemName", event.target.value)} placeholder="e.g. Wireless headphones" aria-invalid={Boolean(errors.itemName)} aria-describedby="itemName-error" /> <FieldError id="itemName-error" message={errors.itemName} /></label>
          </div>
          <div className="form-divider" />
          <div className="form-section-heading"><h2>Return details</h2><p>Tell us why the customer is requesting a return.</p></div>
          <div className="form-grid">
            <label className="form-field"><span>Return Reason <em aria-hidden="true">*</em></span><select name="reason" value={form.reason} onChange={(event) => updateField("reason", event.target.value)} aria-invalid={Boolean(errors.reason)} aria-describedby="reason-error"><option value="">Select a reason</option>{REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select><FieldError id="reason-error" message={errors.reason} /></label>
            <label className="form-field form-field-wide"><span>Description <em aria-hidden="true">*</em></span><textarea name="description" value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Describe the issue or reason for this return…" rows={5} aria-invalid={Boolean(errors.description)} aria-describedby="description-error" /><FieldError id="description-error" message={errors.description} /></label>
          </div>
          <div className="form-actions"><Link className="cancel-link" href="/">Cancel</Link><button className="primary-button" type="submit" disabled={saving}>{saving && <span className="button-spinner" />}{saving ? "Saving request…" : "Create Request"}</button></div>
        </form>
      </div>
    </AppShell>
  );
}
