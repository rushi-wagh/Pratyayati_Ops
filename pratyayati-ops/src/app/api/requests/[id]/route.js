
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateStatusUpdate } from "../validation.js";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;

    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        isRemoved: false,
      },
      include: {
        notes: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!returnRequest) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Return request not found.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: returnRequest,
    });
  } catch (error) {
    console.error("Get request details failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to fetch request details.",
        },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Request body must contain valid JSON.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;

    const currentRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        isRemoved: false,
      },
    });

    if (!currentRequest) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Return request not found.",
          },
        },
        { status: 404 }
      );
    }

    const validationError = validateStatusUpdate(currentRequest, body);

    if (validationError) {
      const { status, ...error } = validationError;

      return NextResponse.json(
        { success: false, error },
        { status }
      );
    }

    const data = {
      status: body.status,
    };

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

    const updatedRequest = await prisma.returnRequest.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Request status updated successfully.",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Update request status failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to update request status.",
        },
      },
      { status: 500 }
    );
  }
}
