
const ALLOWED_REASONS = [
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "DELIVERY_ISSUE",
  "OTHER",
];

const ALLOWED_RESOLUTIONS = [
  "REFUND",
  "REPLACEMENT",
  "STORE_CREDIT",
];

const STATUS_TRANSITIONS = {
  OPEN: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
};

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

  if (missingFields.length > 0) {
    return {
      code: "VALIDATION_ERROR",
      message: "Please fill in all required fields.",
      fields: missingFields,
      status: 400,
    };
  }

  const email = body.customerEmail.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      code: "INVALID_EMAIL",
      message: "Please enter a valid customer email address.",
      status: 400,
    };
  }

  if (!ALLOWED_REASONS.includes(body.reason)) {
    return {
      code: "INVALID_REASON",
      message: "Please select a valid reason for the return.",
      status: 400,
    };
  }

  return null;
}

export function validateStatusUpdate(currentRequest, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      code: "VALIDATION_ERROR",
      message: "A valid JSON object is required.",
      status: 400,
    };
  }

  const { status, resolutionType, refundAmount } = body;

  if (typeof status !== "string" || status.trim() === "") {
    return {
      code: "INVALID_STATUS",
      message: "Please select a target status.",
      status: 400,
    };
  }

  const allowedNextStatuses = STATUS_TRANSITIONS[currentRequest.status];

  if (!allowedNextStatuses?.includes(status)) {
    return {
      code: "INVALID_STATUS_TRANSITION",
      message:
        "This status change isn't allowed. Please refresh the request and try again.",
      status: 409,
    };
  }

  if (status === "APPROVED") {
    if (!ALLOWED_RESOLUTIONS.includes(resolutionType)) {
      return {
        code: "INVALID_RESOLUTION",
        message:
          "Please select a valid resolution before approving this request.",
        status: 400,
      };
    }

    if (resolutionType === "REFUND") {
      const amount = Number(refundAmount);

      if (
        refundAmount === undefined ||
        refundAmount === null ||
        (typeof refundAmount === "string" &&
          refundAmount.trim() === "") ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return {
          code: "INVALID_REFUND_AMOUNT",
          message: "Please enter a valid refund amount greater than ₹0.",
          status: 400,
        };
      }

      // Prevent amounts with more than two decimal places.
      if (Math.round(amount * 100) !== amount * 100) {
        return {
          code: "INVALID_REFUND_AMOUNT",
          message: "Refund amounts can have at most two decimal places.",
          status: 400,
        };
      }
    } else if (
      refundAmount !== undefined &&
      refundAmount !== null &&
      refundAmount !== ""
    ) {
      return {
        code: "INVALID_REFUND_AMOUNT",
        message: "Refund amount can only be entered for a refund resolution.",
        status: 400,
      };
    }
  } else if (
    resolutionType !== undefined ||
    refundAmount !== undefined
  ) {
    return {
      code: "INVALID_RESOLUTION",
      message:
        "Resolution details can only be added when approving a request.",
      status: 400,
    };
  }

  return null;
}
