-- AlterTable
ALTER TABLE "EmployerProfile" ADD COLUMN     "calendarProvider" TEXT,
ADD COLUMN     "microsoftAccessToken" TEXT,
ADD COLUMN     "microsoftCalendarConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "microsoftRefreshToken" TEXT,
ADD COLUMN     "microsoftTokenExpiry" BIGINT;

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "microsoftCalendarEventId" TEXT,
ADD COLUMN     "microsoftCalendarLink" TEXT;
