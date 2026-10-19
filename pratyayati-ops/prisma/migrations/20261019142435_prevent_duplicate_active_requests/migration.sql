-- This is an empty migration.

CREATE UNIQUE INDEX "unique_active_return_request_per_order_item"
ON "ReturnRequest" ("orderId", "itemId")
WHERE "isRemoved" = false
  AND "status" NOT IN ('COMPLETED', 'REJECTED');