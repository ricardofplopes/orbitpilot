-- AlterTable
ALTER TABLE "work_items" ADD COLUMN "t_shirt_size" TEXT;
ALTER TABLE "work_items" ADD COLUMN "quarter" TEXT;
ALTER TABLE "work_items" ADD COLUMN "epic_key" TEXT;

-- CreateIndex
CREATE INDEX "work_items_epic_key_idx" ON "work_items"("epic_key");
CREATE INDEX "work_items_quarter_idx" ON "work_items"("quarter");
