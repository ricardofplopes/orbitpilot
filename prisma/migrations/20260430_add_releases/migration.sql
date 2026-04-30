-- CreateTable
CREATE TABLE "releases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unreleased',
    "start_date" TIMESTAMP(3),
    "release_date" TIMESTAMP(3),
    "description" TEXT,
    "project_key" TEXT NOT NULL,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "releases_projectKey_name_key" ON "releases"("project_key", "name");
