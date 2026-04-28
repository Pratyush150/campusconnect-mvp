-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "raterId" TEXT NOT NULL,
    "rateeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "type" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AssignmentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subject" TEXT,
    "assignmentType" TEXT,
    "deadline" DATETIME NOT NULL,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "attachments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "assignedDoerId" TEXT,
    "finalPrice" INTEGER,
    "clientPaid" BOOLEAN NOT NULL DEFAULT false,
    "doerPaidOut" BOOLEAN NOT NULL DEFAULT false,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "revisionRequestCount" INTEGER NOT NULL DEFAULT 0,
    "contactFlagged" BOOLEAN NOT NULL DEFAULT false,
    "contactFlags" TEXT,
    "isHandwritten" BOOLEAN NOT NULL DEFAULT false,
    "handwrittenExtra" INTEGER,
    "clientAcknowledgedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssignmentRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssignmentRequest_assignedDoerId_fkey" FOREIGN KEY ("assignedDoerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AssignmentRequest" ("adminNotes", "assignedDoerId", "assignmentType", "attachments", "budgetMax", "budgetMin", "clientId", "clientPaid", "contactFlagged", "contactFlags", "createdAt", "deadline", "description", "doerPaidOut", "finalPrice", "id", "revisionCount", "revisionRequestCount", "status", "subject", "title", "updatedAt") SELECT "adminNotes", "assignedDoerId", "assignmentType", "attachments", "budgetMax", "budgetMin", "clientId", "clientPaid", "contactFlagged", "contactFlags", "createdAt", "deadline", "description", "doerPaidOut", "finalPrice", "id", "revisionCount", "revisionRequestCount", "status", "subject", "title", "updatedAt" FROM "AssignmentRequest";
DROP TABLE "AssignmentRequest";
ALTER TABLE "new_AssignmentRequest" RENAME TO "AssignmentRequest";
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentType" TEXT NOT NULL,
    "installment" TEXT NOT NULL DEFAULT 'single',
    "referenceId" TEXT,
    "referenceType" TEXT,
    "assignmentId" TEXT,
    "orderId" TEXT,
    "providerPaymentId" TEXT,
    "providerSignature" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssignmentRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "assignmentId", "createdAt", "currency", "id", "orderId", "payerId", "paymentType", "providerPaymentId", "providerSignature", "referenceId", "referenceType", "status", "updatedAt") SELECT "amount", "assignmentId", "createdAt", "currency", "id", "orderId", "payerId", "paymentType", "providerPaymentId", "providerSignature", "referenceId", "referenceType", "status", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Review_rateeId_createdAt_idx" ON "Review"("rateeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_raterId_type_referenceId_key" ON "Review"("raterId", "type", "referenceId");
