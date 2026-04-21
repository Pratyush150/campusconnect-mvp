-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MentorBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentRole" TEXT NOT NULL,
    "topic" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "bookingType" TEXT NOT NULL DEFAULT 'one_time',
    "meetingLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "paymentId" TEXT,
    "rating" INTEGER,
    "feedback" TEXT,
    "expiresAt" DATETIME,
    "sessionNotes" TEXT,
    "sessionNotesUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "MentorSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MentorBooking_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MentorBooking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MentorBooking" ("bookingType", "createdAt", "feedback", "id", "meetingLink", "mentorId", "paymentId", "rating", "slotId", "status", "studentId", "studentRole", "topic") SELECT "bookingType", "createdAt", "feedback", "id", "meetingLink", "mentorId", "paymentId", "rating", "slotId", "status", "studentId", "studentRole", "topic" FROM "MentorBooking";
DROP TABLE "MentorBooking";
ALTER TABLE "new_MentorBooking" RENAME TO "MentorBooking";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
