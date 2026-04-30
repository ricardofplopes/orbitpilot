-- Drop existing index and add unique constraint
DROP INDEX IF EXISTS "work_items_source_external_id_idx";

-- Remove duplicates before adding unique constraint (keep newest)
DELETE FROM work_items a USING work_items b
WHERE a.id < b.id
AND a.source = b.source
AND a.external_id = b.external_id
AND a.external_id IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "work_items_source_externalId_key" ON "work_items"("source", "external_id");
