-- CreateTable
CREATE TABLE "ProgressUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "doerId" TEXT NOT NULL,
    "percentComplete" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressUpdate_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssignmentRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgressUpdate_doerId_fkey" FOREIGN KEY ("doerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT,
    "fromAdmin" BOOLEAN NOT NULL DEFAULT true,
    "toUserId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "message" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'general',
    "attachments" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminMessage_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssignmentRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdminMessage_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AdminMessage_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AdminMessage" ("assignmentId", "attachments", "createdAt", "fromAdmin", "fromUserId", "id", "isRead", "message", "toUserId") SELECT "assignmentId", "attachments", "createdAt", "fromAdmin", "fromUserId", "id", "isRead", "message", "toUserId" FROM "AdminMessage";
DROP TABLE "AdminMessage";
ALTER TABLE "new_AdminMessage" RENAME TO "AdminMessage";
CREATE INDEX "AdminMessage_assignmentId_toUserId_createdAt_idx" ON "AdminMessage"("assignmentId", "toUserId", "createdAt");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssignmentRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssignmentRequest_assignedDoerId_fkey" FOREIGN KEY ("assignedDoerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AssignmentRequest" ("adminNotes", "assignedDoerId", "assignmentType", "attachments", "budgetMax", "budgetMin", "clientId", "clientPaid", "contactFlagged", "contactFlags", "createdAt", "deadline", "description", "doerPaidOut", "finalPrice", "id", "revisionCount", "status", "subject", "title", "updatedAt") SELECT "adminNotes", "assignedDoerId", "assignmentType", "attachments", "budgetMax", "budgetMin", "clientId", "clientPaid", "contactFlagged", "contactFlags", "createdAt", "deadline", "description", "doerPaidOut", "finalPrice", "id", "revisionCount", "status", "subject", "title", "updatedAt" FROM "AssignmentRequest";
DROP TABLE "AssignmentRequest";
ALTER TABLE "new_AssignmentRequest" RENAME TO "AssignmentRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProgressUpdate_assignmentId_createdAt_idx" ON "ProgressUpdate"("assignmentId", "createdAt");
