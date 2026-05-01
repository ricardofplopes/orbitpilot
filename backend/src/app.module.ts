import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { SettingsModule } from './settings/settings.module';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
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
    SettingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
