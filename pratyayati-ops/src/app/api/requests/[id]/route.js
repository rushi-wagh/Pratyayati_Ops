
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
