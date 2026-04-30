-- Add new columns for Jira sync
ALTER TABLE "work_items" ADD COLUMN IF NOT EXISTS "external_url" TEXT;
ALTER TABLE "work_items" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "work_items" ADD COLUMN IF NOT EXISTS "assignee_email" TEXT;
ALTER TABLE "work_items" ADD COLUMN IF NOT EXISTS "sprint" TEXT;

-- Create index on source + external_id for fast lookups during sync
CREATE INDEX IF NOT EXISTS "work_items_source_external_id_idx"
ON "work_items"("source", "external_id");

-- Create index on assignee
CREATE INDEX IF NOT EXISTS "work_items_assignee_idx" ON "work_items"("assignee");
