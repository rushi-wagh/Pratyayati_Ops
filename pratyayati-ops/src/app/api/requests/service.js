
import { prisma } from "@/lib/db";

function generateReference() {
  const suffix = Array.from(
    { length: 6 },
    () => Math.floor(Math.random() * 36).toString(36)
  )
    .join("")
    .toUpperCase();

  return `RET-${suffix}`;
}

export async function createReturnRequest(body) {
  const orderId = body.orderId.trim();
  const itemId = body.itemId.trim();

  const duplicate = await prisma.returnRequest.findFirst({
    where: {
      orderId,
      itemId,
      isRemoved: false,
      status: {
        notIn: ["COMPLETED", "REJECTED"],
      },
    },
    select: { reference: true },
  });

  if (duplicate) {
    const error = new Error(
      `An active request already exists (${duplicate.reference}).`
    );
    error.code = "DUPLICATE_REQUEST";
    error.status = 409;
    throw error;
  }

  const data = {
    customerName: body.customerName.trim(),
    customerEmail: body.customerEmail.trim(),
    orderId,
    itemId,
    itemName: body.itemName.trim(),
    reason: body.reason,
    description: body.description.trim(),
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.returnRequest.create({
        data: {
          ...data,
          reference: generateReference(),
        },
      });
    } catch (error) {
      const target = error?.meta?.target;

      const referenceCollision =
        error?.code === "P2002" &&
        (Array.isArray(target)
          ? target.includes("reference")
          : String(target).includes("reference"));

      if (referenceCollision) {
        if (attempt < 2) continue;

        throw new Error("Could not generate a unique reference.");
      }

      // Handle the PostgreSQL partial unique index violation.
      const isUniqueViolation =
        error?.code === "23505" ||
        error?.cause?.code === "23505" ||
        error?.meta?.code === "23505";

      if (isUniqueViolation) {
        const duplicateError = new Error(
          "An active request already exists for this order and item."
        );
        duplicateError.code = "DUPLICATE_REQUEST";
        duplicateError.status = 409;
        throw duplicateError;
      }

      throw error;
    }
  }

  throw new Error("Could not generate a unique reference.");
}
