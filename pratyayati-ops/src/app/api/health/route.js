import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      success: true,
      message: "API and database connection are working",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_CONNECTION_FAILED",
          message: "Unable to connect to the database",
        },
      },
      { status: 503 }
    );
  }
}
