import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateStatusUpdate } from "../validation.js";

const ALLOWED_REASONS = [
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "DELIVERY_ISSUE",
  "OTHER",
];

const EDITABLE_FIELDS = [
  "customerName",
  "customerEmail",
  "orderId",
  "itemId",
  "itemName",
  "reason",
  "description",
];

const LOCKED_STATUSES = ["APPROVED", "REJECTED", "COMPLETED"];

function errorResponse(code, message, status, extra = {}) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...extra },
    },
    { status },
  );
}

function validateDetails(body) {
  const keys = Object.keys(body);
  const unknownFields = keys.filter((key) => !EDITABLE_FIELDS.includes(key));

  if (unknownFields.length > 0) {
    return {
      code: "INVALID_FIELDS",
      message: "One or more fields cannot be edited.",
      status: 400,
    };
  }

  if (keys.length === 0) {
    return {
      code: "EMPTY_UPDATE",
      message: "Provide at least one field to update.",
      status: 400,
    };
  }

  for (const field of keys) {
    if (typeof body[field] !== "string" || body[field].trim().length === 0) {
      return {
        code: "INVALID_FIELD",
        message: `${field} must be a non-empty string.`,
        status: 400,
      };
    }
  }

  if (
    body.customerEmail !== undefined &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customerEmail.trim())
  ) {
    return {
      code: "INVALID_EMAIL",
      message: "Please enter a valid customer email address.",
      status: 400,
    };
  }

  if (body.reason !== undefined && !ALLOWED_REASONS.includes(body.reason)) {
    return {
      code: "INVALID_REASON",
      message: "Please select a valid reason for the return.",
      status: 400,
    };
  }

  return null;
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;

    const returnRequest = await prisma.returnRequest.findFirst({
      where: { id, isRemoved: false },
      include: {
        notes: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!returnRequest) {
      return errorResponse(
        "REQUEST_NOT_FOUND",
        "Return request not found.",
        404,
      );
    }

    return NextResponse.json({
      success: true,
      request: returnRequest,
    });
  } catch (error) {
    console.error("Get request details failed:", error);

    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Unable to fetch request details.",
      500,
    );
  }
}

export async function PATCH(request, { params }) {
  let body;

  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "INVALID_JSON",
      "Request body must contain valid JSON.",
      400,
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "A valid JSON object is required.",
      400,
    );
  }

  try {
    const { id } = await params;

    const currentRequest = await prisma.returnRequest.findFirst({
      where: { id, isRemoved: false },
    });

    if (!currentRequest) {
      return errorResponse(
        "REQUEST_NOT_FOUND",
        "Return request not found.",
        404,
      );
    }

    // Branch 1: edit customer/item/request details.
    if (!Object.hasOwn(body, "status")) {
      const validationError = validateDetails(body);

      if (validationError) {
        const { status, ...error } = validationError;
        return NextResponse.json({ success: false, error }, { status });
      }

      if (LOCKED_STATUSES.includes(currentRequest.status)) {
        return errorResponse(
          "REQUEST_DETAILS_LOCKED",
          "Customer and item details cannot be edited after a request is approved, rejected, or completed.",
          409,
        );
      }

      const data = Object.fromEntries(
        Object.entries(body).map(([key, value]) => [key, value.trim()]),
      );

      const updatedRequest = await prisma.$transaction(async (tx) => {
        // The status condition prevents an edit if another operation
        // decides the request after our initial read.
        const result = await tx.returnRequest.updateMany({
          where: {
            id,
            isRemoved: false,
            status: {
              in: ["OPEN", "IN_REVIEW"],
            },
          },
          data,
        });

        if (result.count !== 1) {
          const error = new Error(
            "The request was changed or locked by another operation. Refresh and try again.",
          );
          error.code = "REQUEST_DETAILS_CONFLICT";
          throw error;
        }

        return tx.returnRequest.findUnique({
          where: { id },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Request details updated successfully.",
        request: updatedRequest,
      });
    }

    // Branch 2: status transition.
    const validationError = validateStatusUpdate(currentRequest, body);

    if (validationError) {
      const { status, ...error } = validationError;
      return NextResponse.json({ success: false, error }, { status });
    }

    const data = { status: body.status };

    if (body.status === "APPROVED") {
      data.resolutionType = body.resolutionType;
      data.refundAmount =
        body.resolutionType === "REFUND"
          ? Number(body.refundAmount).toFixed(2)
          : null;
      data.decisionAt = new Date();
      data.decidedBy = "Operations Agent";
    }

    if (body.status === "REJECTED") {
      data.resolutionType = null;
      data.refundAmount = null;
      data.decisionAt = new Date();
      data.decidedBy = "Operations Agent";
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.returnRequest.updateMany({
        where: {
          id,
          isRemoved: false,
          status: currentRequest.status,
        },
        data,
      });

      if (updateResult.count !== 1) {
        const error = new Error(
          "This request was updated by someone else. Please refresh and try again.",
        );
        error.code = "STATUS_CONFLICT";
        throw error;
      }

      if (body.status === "APPROVED" || body.status === "REJECTED") {
        let content;

        if (body.status === "APPROVED") {
          content = `Request approved. Resolution: ${body.resolutionType}.`;

          if (body.resolutionType === "REFUND") {
            content += ` Refund amount: ₹${Number(body.refundAmount).toFixed(
              2,
            )}.`;
          }
        } else {
          content = "Request rejected.";
        }

        await tx.requestNote.create({
          data: {
            requestId: id,
            category: "DECISION",
            content,
            author: "Operations Agent",
          },
        });
      }

      return tx.returnRequest.findUnique({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Request status updated successfully.",
      request: updatedRequest,
    });
  } catch (error) {
    if (
      error?.code === "STATUS_CONFLICT" ||
      error?.code === "REQUEST_DETAILS_CONFLICT"
    ) {
      return errorResponse(error.code, error.message, 409);
    }

    // PostgreSQL unique constraint violation, including the active
    // order/item partial unique index.
    if (error?.code === "P2002" || error?.code === "23505") {
      return errorResponse(
        "DUPLICATE_ACTIVE_REQUEST",
        "An active return request already exists for this order and item.",
        409,
      );
    }

    console.error("Update request failed:", error);

    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Unable to update the request.",
      500,
    );
  }
}
