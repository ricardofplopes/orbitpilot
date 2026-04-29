import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { CapacityModule } from './capacity/capacity.module';
import { PlanningModule } from './planning/planning.module';
import { WorkModule } from './work/work.module';
import { JiraModule } from './integrations/jira/jira.module';
import { GithubModule } from './integrations/github/github.module';
import { InsightsModule } from './insights/insights.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    CapacityModule,
    PlanningModule,
    WorkModule,
    JiraModule,
    GithubModule,
    InsightsModule,
    ReportsModule,
    DashboardModule,
  ],
})
export class AppModule {}
