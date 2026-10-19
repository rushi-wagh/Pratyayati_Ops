
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

    const validationError = validateStatusUpdate(
      currentRequest,
      body
    );

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

    const updatedRequest = await prisma.$transaction(
      async (tx) => {
        // Update only if the status has not changed since validation.
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
            "This request was updated by someone else. Please refresh and try again."
          );
          error.code = "STATUS_CONFLICT";
          throw error;
        }

        // Record approval/rejection in the append-only notes history.
        if (
          body.status === "APPROVED" ||
          body.status === "REJECTED"
        ) {
          let content;

          if (body.status === "APPROVED") {
            content =
              `Request approved. Resolution: ${body.resolutionType}.`;

            if (body.resolutionType === "REFUND") {
              content +=
                ` Refund amount: ₹${Number(body.refundAmount).toFixed(2)}.`;
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
      }
    );

    return NextResponse.json({
      success: true,
      message: "Request status updated successfully.",
      request: updatedRequest,
    });
  } catch (error) {
    if (error?.code === "STATUS_CONFLICT") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STATUS_CONFLICT",
            message: error.message,
          },
        },
        { status: 409 }
      );
    }

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

