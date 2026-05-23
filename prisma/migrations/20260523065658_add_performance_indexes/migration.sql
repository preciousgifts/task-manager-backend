-- CreateIndex
CREATE INDEX "PlanItem_projectId_knowledgeArea_idx" ON "PlanItem"("projectId", "knowledgeArea");

-- CreateIndex
CREATE INDEX "PlanItem_projectId_bragStatus_idx" ON "PlanItem"("projectId", "bragStatus");

-- CreateIndex
CREATE INDEX "PlanItem_assignedToId_idx" ON "PlanItem"("assignedToId");

-- CreateIndex
CREATE INDEX "PlanItem_dueDate_idx" ON "PlanItem"("dueDate");

-- CreateIndex
CREATE INDEX "PlanItem_parentId_idx" ON "PlanItem"("parentId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_bragStatus_idx" ON "Project"("bragStatus");

-- CreateIndex
CREATE INDEX "Task_projectId_bragStatus_idx" ON "Task"("projectId", "bragStatus");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");
