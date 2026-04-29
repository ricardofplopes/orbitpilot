-- CreateIndex
CREATE INDEX "availability_team_member_id_date_idx" ON "availability"("team_member_id", "date");

-- CreateIndex
CREATE INDEX "quarter_plans_status_idx" ON "quarter_plans"("status");

-- CreateIndex
CREATE INDEX "initiatives_quarter_plan_id_idx" ON "initiatives"("quarter_plan_id");

-- CreateIndex
CREATE INDEX "initiatives_team_id_idx" ON "initiatives"("team_id");

-- CreateIndex
CREATE INDEX "work_items_team_id_idx" ON "work_items"("team_id");

-- CreateIndex
CREATE INDEX "work_items_status_idx" ON "work_items"("status");

-- CreateIndex
CREATE INDEX "work_items_initiative_id_idx" ON "work_items"("initiative_id");
