
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCreateRequest } from "./validation";
import { createReturnRequest } from "./service";

const ALLOWED_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
];

const ALLOWED_REASONS = [
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "DELIVERY_ISSUE",
  "OTHER",
];

const SORT_FIELDS = {
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  customerName: "customerName",
  status: "status",
  reference: "reference",
};

function errorResponse(code, message, status) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status");
    const reason = searchParams.get("reason");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return errorResponse(
        "INVALID_PAGINATION",
        "Page must be positive and limit must be between 1 and 100.",
        400
      );
    }

    if (status && status !== "ALL" && !ALLOWED_STATUSES.includes(status)) {
      return errorResponse("INVALID_STATUS", "Invalid status filter.", 400);
    }

    if (reason && reason !== "ALL" && !ALLOWED_REASONS.includes(reason)) {
      return errorResponse("INVALID_REASON", "Invalid reason filter.", 400);
    }

    if (!SORT_FIELDS[sortBy] || !["asc", "desc"].includes(sortOrder)) {
      return errorResponse(
        "INVALID_SORT",
        "Invalid sorting field or direction.",
        400
      );
    }

    const where = {
      isRemoved: false,
      ...(status && status !== "ALL" ? { status } : {}),
      ...(reason && reason !== "ALL" ? { reason } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: "insensitive" } },
              { customerName: { contains: search, mode: "insensitive" } },
              { customerEmail: { contains: search, mode: "insensitive" } },
              { orderId: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [requests, total, groupedStatuses] = await prisma.$transaction([
      prisma.returnRequest.findMany({
        where,
        orderBy: { [SORT_FIELDS[sortBy]]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          reference: true,
          customerName: true,
          customerEmail: true,
          orderId: true,
          itemName: true,
          reason: true,
          status: true,
          resolutionType: true,
          refundAmount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.returnRequest.count({ where }),
      prisma.returnRequest.groupBy({
        by: ["status"],
        where: { isRemoved: false },
        _count: { _all: true },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      ALLOWED_STATUSES.map((value) => [value, 0])
    );

    for (const group of groupedStatuses) {
      statusCounts[group.status] = group._count._all;
    }

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts,
    });
  } catch (error) {
    console.error("List requests failed:", error);

    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Unable to fetch requests.",
      500
    );
  }
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
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

  const validationError = validateCreateRequest(body);

  if (validationError) {
    const { status, ...error } = validationError;

    return Response.json(
      { success: false, error },
      { status }
    );
  }

  try {
    const createdRequest = await createReturnRequest(body);

    return Response.json(
      {
        success: true,
        message: "Return request created successfully.",
        request: createdRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.status === 409) {
      return Response.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: 409 }
      );
    }

    console.error("POST /api/requests failed:", error);

    return Response.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create the return request.",
        },
      },
      { status: 500 }
    );
  }
}

