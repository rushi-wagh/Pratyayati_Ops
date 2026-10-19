
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DB_URL,
  }),
});

const statuses = [
  "OPEN",
  "IN_REVIEW",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
];

const reasons = [
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "DELIVERY_ISSUE",
  "OTHER",
];

const resolutions = ["REFUND", "REPLACEMENT", "STORE_CREDIT"];

const customers = [
  ["Aarav Sharma", "aarav@example.com"],
  ["Priya Patel", "priya@example.com"],
  ["Rohan Verma", "rohan@example.com"],
  ["Ananya Desai", "ananya@example.com"],
  ["Ishaan Mehta", "ishaan@example.com"],
  ["Sneha Kulkarni", "sneha@example.com"],
];

const items = [
  ["ITEM-001", "Wireless Headphones"],
  ["ITEM-002", "Running Shoes"],
  ["ITEM-003", "Smart Watch"],
  ["ITEM-004", "Bluetooth Speaker"],
  ["ITEM-005", "Laptop Backpack"],
  ["ITEM-006", "Mechanical Keyboard"],
];

const descriptions = {
  DEFECTIVE: "Item arrived with a functional defect.",
  WRONG_ITEM: "Received an item different from the order.",
  NOT_AS_DESCRIBED: "Item does not match the product description.",
  NO_LONGER_NEEDED: "Customer no longer needs the item.",
  DELIVERY_ISSUE: "Item arrived later than expected.",
  OTHER: "Customer raised another return-related concern.",
};

async function main() {
  // Safe to rerun: skip records that already use our seed references.
  const existing = await prisma.returnRequest.count({
    where: { reference: { startsWith: "RET-SEED-" } },
  });

  if (existing > 0) {
    console.log(
      `Seed data already exists (${existing} requests). No changes made.`
    );
    return;
  }

  const requests = Array.from({ length: 30 }, (_, i) => {
    const status = statuses[i % statuses.length];
    const reason = reasons[i % reasons.length];
    const [customerName, customerEmail] = customers[i % customers.length];
    const [itemId, itemName] = items[i % items.length];

    const hasDecision = ["APPROVED", "COMPLETED", "REJECTED"].includes(status);
    const resolutionType = hasDecision
      ? resolutions[i % resolutions.length]
      : null;

    const refundAmount =
      resolutionType === "REFUND"
        ? (499 + i * 100).toFixed(2)
        : null;

    const createdAt = new Date(
      Date.now() - i * 6 * 60 * 60 * 1000
    );

    return {
      reference: `RET-SEED-${String(i + 1).padStart(3, "0")}`,
      customerName,
      customerEmail,
      orderId: `ORD-SEED-${String(i + 1).padStart(3, "0")}`,
      itemId,
      itemName,
      reason,
      description: descriptions[reason],
      status,
      resolutionType,
      refundAmount,
      decisionAt: hasDecision ? createdAt : null,
      decidedBy: hasDecision ? "Demo Agent" : null,
      createdAt,
      notes: {
        create: [
          {
            category: "INTERNAL_UPDATE",
            content: "Request reviewed by the operations team.",
            author: "Demo Agent",
            createdAt: new Date(createdAt.getTime() + 60 * 1000),
          },
          ...(hasDecision
            ? [
                {
                  category: "DECISION",
                  content:
                    status === "REJECTED"
                      ? "Request rejected after review."
                      : `Request processed with ${resolutionType.toLowerCase().replace("_", " ")} resolution.`,
                  author: "Demo Agent",
                  createdAt: new Date(createdAt.getTime() + 2 * 60 * 1000),
                },
              ]
            : []),
        ],
      },
    };
  });

  await prisma.$transaction(
    requests.map((data) => prisma.returnRequest.create({ data }))
  );

  console.log("Seed complete: 30 requests created with activity notes.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
