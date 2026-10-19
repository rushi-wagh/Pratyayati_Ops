
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ALLOWED_CATEGORIES = [
  "INTERNAL_UPDATE",
  "CUSTOMER_CONTACT",
];

export async function POST(request, { params }) {
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

    const { category, content } = body ?? {};

    if (
      typeof category !== "string" ||
      !ALLOWED_CATEGORIES.includes(category)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_NOTE_CATEGORY",
            message:
              "Please select Internal Update or Customer Contact.",
          },
        },
        { status: 400 }
      );
    }

    if (
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMPTY_NOTE",
            message: "Please enter a note before submitting.",
          },
        },
        { status: 400 }
      );
    }

    if (content.trim().length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOTE_TOO_LONG",
            message: "Notes cannot exceed 2000 characters.",
          },
        },
        { status: 400 }
      );
    }

    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        isRemoved: false,
      },
      select: {
        id: true,
        status: true,
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

    if (
      returnRequest.status === "COMPLETED" ||
      returnRequest.status === "REJECTED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REQUEST_CLOSED",
            message:
              "Notes cannot be added to a completed or rejected request.",
          },
        },
        { status: 409 }
      );
    }

    const note = await prisma.requestNote.create({
      data: {
        requestId: id,
        category,
        content: content.trim(),
        author: "Operations Agent",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Note added successfully.",
        note,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create request note failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to add the note. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
