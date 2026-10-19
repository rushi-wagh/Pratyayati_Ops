-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'APPROVED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RequestReason" AS ENUM ('DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'NO_LONGER_NEEDED', 'DELIVERY_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('REFUND', 'REPLACEMENT', 'STORE_CREDIT');

-- CreateEnum
CREATE TYPE "NoteCategory" AS ENUM ('INTERNAL_UPDATE', 'CUSTOMER_CONTACT', 'DECISION');

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "reason" "RequestReason" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionType" "ResolutionType",
    "refundAmount" DECIMAL(12,2),
    "decisionAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "removedAt" TIMESTAMP(3),
    "removedBy" TEXT,
    "removalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestNote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "category" "NoteCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_reference_key" ON "ReturnRequest"("reference");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_isRemoved_createdAt_idx" ON "ReturnRequest"("status", "isRemoved", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderId_itemId_idx" ON "ReturnRequest"("orderId", "itemId");

-- CreateIndex
CREATE INDEX "ReturnRequest_customerName_idx" ON "ReturnRequest"("customerName");

-- CreateIndex
CREATE INDEX "ReturnRequest_reason_idx" ON "ReturnRequest"("reason");

-- CreateIndex
CREATE INDEX "RequestNote_requestId_createdAt_idx" ON "RequestNote"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "RequestNote" ADD CONSTRAINT "RequestNote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
