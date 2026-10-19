
const ALLOWED_REASONS = [
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "DELIVERY_ISSUE",
  "OTHER",
];

const REQUIRED_FIELDS = [
  "customerName",
  "customerEmail",
  "orderId",
  "itemId",
  "itemName",
  "reason",
  "description",
];

export function validateCreateRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      code: "VALIDATION_ERROR",
      message: "A valid JSON object is required.",
      status: 400,
    };
  }

  const missingFields = REQUIRED_FIELDS.filter(
    (field) =>
      typeof body[field] !== "string" ||
      body[field].trim() === ""
  );

  if (missingFields.length) {
    return {
      code: "VALIDATION_ERROR",
      message: "Please provide all required fields.",
      fields: missingFields,
      status: 400,
    };
  }

  const email = body.customerEmail.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      code: "INVALID_EMAIL",
      message: "Please provide a valid customer email.",
      status: 400,
    };
  }

  if (!ALLOWED_REASONS.includes(body.reason)) {
    return {
      code: "INVALID_REASON",
      message: "The selected request reason is invalid.",
      status: 400,
    };
  }

  return null;
}
