
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    if (
      !body ||
      typeof body.reason !== "string" ||
      body.reason.trim() === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REMOVAL_REASON_REQUIRED",
            message: "Please provide a reason for removing this request.",
          },
        },
        { status: 400 }
      );
    }

    if (body.reason.trim().length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REMOVAL_REASON_TOO_LONG",
            message: "Removal reason cannot exceed 500 characters.",
          },
        },
        { status: 400 }
      );
    }

    const result = await prisma.returnRequest.updateMany({
      where: {
        id,
        isRemoved: false,
        status: {
          in: ["OPEN", "REJECTED"],
        },
      },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removedBy: "Operations Agent",
        removalReason: body.reason.trim(),
      },
    });

    if (result.count === 0) {
      const existingRequest = await prisma.returnRequest.findFirst({
        where: { id },
        select: { isRemoved: true, status: true },
      });

      if (existingRequest && !existingRequest.isRemoved) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "REQUEST_REMOVAL_NOT_ALLOWED",
              message:
                "Only open or rejected requests can be removed.",
            },
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REQUEST_NOT_FOUND",
            message: "Request not found or already removed.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Request removed successfully.",
    });
  } catch (error) {
    console.error("Remove request failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to remove the request. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
