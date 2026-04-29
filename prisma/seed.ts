import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding OrbitPilot database...');

  // --- Users ---
  const passwordHash = await bcrypt.hash('admin123', 10);
  const memberHash = await bcrypt.hash('member123', 10);

  const users = [
    { email: 'rlopes@intermedia.com', name: 'Ricardo Lopes', role: 'admin', passwordHash },
    { email: 'alice.chen@orbitpilot.dev', name: 'Alice Chen', role: 'member', passwordHash: memberHash },
    { email: 'bob.smith@orbitpilot.dev', name: 'Bob Smith', role: 'member', passwordHash: memberHash },
    { email: 'carol.davis@orbitpilot.dev', name: 'Carol Davis', role: 'member', passwordHash: memberHash },
    { email: 'david.park@orbitpilot.dev', name: 'David Park', role: 'member', passwordHash: memberHash },
    { email: 'eva.martinez@orbitpilot.dev', name: 'Eva Martinez', role: 'lead', passwordHash: memberHash },
    { email: 'frank.wilson@orbitpilot.dev', name: 'Frank Wilson', role: 'member', passwordHash: memberHash },
    { email: 'grace.lee@orbitpilot.dev', name: 'Grace Lee', role: 'member', passwordHash: memberHash },
    { email: 'henry.taylor@orbitpilot.dev', name: 'Henry Taylor', role: 'member', passwordHash: memberHash },
    { email: 'iris.johnson@orbitpilot.dev', name: 'Iris Johnson', role: 'lead', passwordHash: memberHash },
  ];

  const createdUsers: any[] = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash: u.passwordHash },
      create: u,
    });
    createdUsers.push(user);
  }
  console.log(`Created ${createdUsers.length} users`);

  // --- Teams ---
  const teamData = [
    { name: 'Platform', description: 'Core platform infrastructure and developer tools', color: '#6366f1' },
    { name: 'Payments', description: 'Payment processing and billing systems', color: '#f59e0b' },
    { name: 'Mobile', description: 'iOS and Android mobile applications', color: '#10b981' },
    { name: 'Data', description: 'Data pipelines, analytics, and ML infrastructure', color: '#ef4444' },
    { name: 'Web', description: 'Web frontend and user experience', color: '#3b82f6' },
  ];

  const createdTeams: any[] = [];
  for (const t of teamData) {
    // Use findFirst + create/update pattern for idempotent seeding
    const existing = await prisma.team.findFirst({ where: { name: t.name } });
    if (existing) {
      const team = await prisma.team.update({ where: { id: existing.id }, data: t });
      createdTeams.push(team);
    } else {
      const team = await prisma.team.create({ data: t });
      createdTeams.push(team);
    }
  }
  console.log(`Created ${createdTeams.length} teams`);

  const [platform, payments, mobile, data, web] = createdTeams;

  // --- Team Members ---
  const memberAssignments = [
    { userId: createdUsers[0].id, teamId: platform.id, role: 'lead', weeklyCapacity: 32 },
    { userId: createdUsers[1].id, teamId: payments.id, role: 'engineer', weeklyCapacity: 40 },
    { userId: createdUsers[2].id, teamId: payments.id, role: 'engineer', weeklyCapacity: 40 },
    { userId: createdUsers[3].id, teamId: mobile.id, role: 'engineer', weeklyCapacity: 40 },
    { userId: createdUsers[4].id, teamId: data.id, role: 'engineer', weeklyCapacity: 40 },
    { userId: createdUsers[5].id, teamId: data.id, role: 'lead', weeklyCapacity: 36 },
    { userId: createdUsers[6].id, teamId: platform.id, role: 'engineer', weeklyCapacity: 40 },
    { userId: createdUsers[7].id, teamId: web.id, role: 'engineer', weeklyCapacity: 40 },
    { userId: createdUsers[8].id, teamId: mobile.id, role: 'engineer', weeklyCapacity: 40 },
    { userId: createdUsers[9].id, teamId: web.id, role: 'lead', weeklyCapacity: 36 },
  ];

  const createdMembers: any[] = [];
  for (const m of memberAssignments) {
    const member = await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: m.userId, teamId: m.teamId } },
      update: { role: m.role, weeklyCapacity: m.weeklyCapacity },
      create: m,
    });
    createdMembers.push(member);
  }
  console.log(`Created ${createdMembers.length} team members`);

  // --- Quarter Plans ---
  const q3Start = new Date('2026-07-01');
  const q3End = new Date('2026-09-30');
  const q2Start = new Date('2026-04-01');
  const q2End = new Date('2026-06-30');

  let q3Plan = await prisma.quarterPlan.findFirst({ where: { name: 'Q3 2026' } });
  if (!q3Plan) {
    q3Plan = await prisma.quarterPlan.create({
      data: { name: 'Q3 2026', startDate: q3Start, endDate: q3End, status: 'active' },
    });
  } else {
    q3Plan = await prisma.quarterPlan.update({
      where: { id: q3Plan.id },
      data: { startDate: q3Start, endDate: q3End, status: 'active' },
    });
  }

  let q2Plan = await prisma.quarterPlan.findFirst({ where: { name: 'Q2 2026' } });
  if (!q2Plan) {
    q2Plan = await prisma.quarterPlan.create({
      data: { name: 'Q2 2026', startDate: q2Start, endDate: q2End, status: 'completed' },
    });
  } else {
    q2Plan = await prisma.quarterPlan.update({
      where: { id: q2Plan.id },
      data: { startDate: q2Start, endDate: q2End, status: 'completed' },
    });
  }
  console.log('Created quarter plans');

  // --- Capacity Period ---
  let capPeriod = await prisma.capacityPeriod.findFirst({ where: { name: 'Q3 2026' } });
  if (!capPeriod) {
    capPeriod = await prisma.capacityPeriod.create({
      data: { name: 'Q3 2026', startDate: q3Start, endDate: q3End },
    });
  }
  console.log('Created capacity period');

  // --- Initiatives ---
  const initiativeData = [
    { title: 'Improve Checkout Flow', description: 'Redesign and optimize the checkout experience for higher conversion', quarterPlanId: q3Plan.id, teamId: payments.id, priority: 'P1', estimatedEffort: 320, status: 'in_progress' },
    { title: 'Data Pipeline Reliability', description: 'Improve data pipeline uptime from 99.5% to 99.95%', quarterPlanId: q3Plan.id, teamId: data.id, priority: 'P1', estimatedEffort: 280, status: 'in_progress' },
    { title: 'Mobile App Performance', description: 'Reduce app startup time by 40% and improve frame rates', quarterPlanId: q3Plan.id, teamId: mobile.id, priority: 'P2', estimatedEffort: 240, status: 'planned' },
    { title: 'Reporting Redesign', description: 'New reporting dashboard with real-time analytics', quarterPlanId: q3Plan.id, teamId: platform.id, priority: 'P2', estimatedEffort: 200, status: 'in_progress' },
    { title: 'Onboarding Experience', description: 'Revamp user onboarding to reduce time-to-value', quarterPlanId: q3Plan.id, teamId: web.id, priority: 'P3', estimatedEffort: 160, status: 'planned' },
    { title: 'API Gateway Migration', description: 'Migrate from legacy API gateway to new cloud-native solution', quarterPlanId: q3Plan.id, teamId: platform.id, priority: 'P1', estimatedEffort: 360, status: 'in_progress' },
    { title: 'Payment Analytics', description: 'Build analytics dashboard for payment metrics and fraud detection', quarterPlanId: q3Plan.id, teamId: payments.id, priority: 'P2', estimatedEffort: 180, status: 'planned' },
  ];

  const createdInitiatives: any[] = [];
  for (const init of initiativeData) {
    const existing = await prisma.initiative.findFirst({
      where: { title: init.title, quarterPlanId: init.quarterPlanId },
    });
    if (existing) {
      const updated = await prisma.initiative.update({ where: { id: existing.id }, data: init });
      createdInitiatives.push(updated);
    } else {
      const created = await prisma.initiative.create({ data: init });
      createdInitiatives.push(created);
    }
  }
  console.log(`Created ${createdInitiatives.length} initiatives`);

  // --- Work Items ---
  const workItemData = [
    // Payments team - Checkout Flow
    { title: 'Design new checkout UI mockups', source: 'manual', status: 'done', priority: 'P1', storyPoints: 5, assignee: 'Alice Chen', teamId: payments.id, initiativeId: createdInitiatives[0].id, cycleTime: 3.5 },
    { title: 'Implement cart summary component', source: 'jira', status: 'done', priority: 'P1', storyPoints: 8, assignee: 'Bob Smith', teamId: payments.id, initiativeId: createdInitiatives[0].id, externalId: 'PROJ-101', cycleTime: 5.2 },
    { title: 'Payment method selection flow', source: 'jira', status: 'in_progress', priority: 'P1', storyPoints: 8, assignee: 'Alice Chen', teamId: payments.id, initiativeId: createdInitiatives[0].id, externalId: 'PROJ-102' },
    { title: 'Order confirmation page', source: 'jira', status: 'todo', priority: 'P2', storyPoints: 5, assignee: 'Bob Smith', teamId: payments.id, initiativeId: createdInitiatives[0].id, externalId: 'PROJ-103' },
    { title: 'Checkout analytics tracking', source: 'manual', status: 'todo', priority: 'P2', storyPoints: 3, assignee: null, teamId: payments.id, initiativeId: createdInitiatives[0].id },
    { title: 'A/B test framework for checkout', source: 'jira', status: 'in_review', priority: 'P2', storyPoints: 5, assignee: 'Alice Chen', teamId: payments.id, initiativeId: createdInitiatives[0].id, externalId: 'PROJ-104' },

    // Data team - Pipeline Reliability
    { title: 'Add retry logic to data ingestion', source: 'github', status: 'done', priority: 'P1', storyPoints: 5, assignee: 'David Park', teamId: data.id, initiativeId: createdInitiatives[1].id, externalId: '#38', cycleTime: 4.0 },
    { title: 'Implement circuit breaker pattern', source: 'jira', status: 'in_progress', priority: 'P1', storyPoints: 8, assignee: 'Eva Martinez', teamId: data.id, initiativeId: createdInitiatives[1].id, externalId: 'PROJ-105' },
    { title: 'Pipeline monitoring dashboard', source: 'manual', status: 'in_progress', priority: 'P1', storyPoints: 8, assignee: 'David Park', teamId: data.id, initiativeId: createdInitiatives[1].id },
    { title: 'Dead letter queue processing', source: 'jira', status: 'todo', priority: 'P2', storyPoints: 5, assignee: null, teamId: data.id, initiativeId: createdInitiatives[1].id, externalId: 'PROJ-106' },
    { title: 'Data quality validation framework', source: 'manual', status: 'todo', priority: 'P2', storyPoints: 8, assignee: 'Eva Martinez', teamId: data.id, initiativeId: createdInitiatives[1].id },

    // Mobile team
    { title: 'Profile app startup performance', source: 'manual', status: 'in_progress', priority: 'P2', storyPoints: 5, assignee: 'Carol Davis', teamId: mobile.id, initiativeId: createdInitiatives[2].id },
    { title: 'Optimize image loading pipeline', source: 'github', status: 'todo', priority: 'P2', storyPoints: 8, assignee: 'Henry Taylor', teamId: mobile.id, initiativeId: createdInitiatives[2].id, externalId: '#42' },
    { title: 'Reduce bundle size by 30%', source: 'manual', status: 'todo', priority: 'P2', storyPoints: 8, assignee: null, teamId: mobile.id, initiativeId: createdInitiatives[2].id },
    { title: 'Implement lazy loading for screens', source: 'jira', status: 'done', priority: 'P2', storyPoints: 5, assignee: 'Carol Davis', teamId: mobile.id, initiativeId: createdInitiatives[2].id, externalId: 'PROJ-107', cycleTime: 6.1 },
    { title: 'Fix memory leak in chat view', source: 'jira', status: 'in_review', priority: 'P1', storyPoints: 5, assignee: 'Henry Taylor', teamId: mobile.id, externalId: 'PROJ-108' },

    // Platform team - Reporting Redesign
    { title: 'Design reporting dashboard wireframes', source: 'manual', status: 'done', priority: 'P2', storyPoints: 5, assignee: 'Ricardo Lopes', teamId: platform.id, initiativeId: createdInitiatives[3].id, cycleTime: 2.5 },
    { title: 'Build report data aggregation service', source: 'jira', status: 'in_progress', priority: 'P2', storyPoints: 8, assignee: 'Frank Wilson', teamId: platform.id, initiativeId: createdInitiatives[3].id, externalId: 'PROJ-109' },
    { title: 'Real-time data streaming setup', source: 'manual', status: 'todo', priority: 'P2', storyPoints: 13, assignee: null, teamId: platform.id, initiativeId: createdInitiatives[3].id },

    // Platform team - API Gateway
    { title: 'Evaluate API gateway solutions', source: 'manual', status: 'done', priority: 'P1', storyPoints: 3, assignee: 'Ricardo Lopes', teamId: platform.id, initiativeId: createdInitiatives[5].id, cycleTime: 2.0 },
    { title: 'Set up new gateway infrastructure', source: 'jira', status: 'done', priority: 'P1', storyPoints: 8, assignee: 'Frank Wilson', teamId: platform.id, initiativeId: createdInitiatives[5].id, externalId: 'PROJ-110', cycleTime: 7.3 },
    { title: 'Migrate auth endpoints', source: 'jira', status: 'in_progress', priority: 'P1', storyPoints: 8, assignee: 'Ricardo Lopes', teamId: platform.id, initiativeId: createdInitiatives[5].id, externalId: 'PROJ-111' },
    { title: 'Migrate payment endpoints', source: 'jira', status: 'todo', priority: 'P1', storyPoints: 8, assignee: 'Frank Wilson', teamId: platform.id, initiativeId: createdInitiatives[5].id, externalId: 'PROJ-112' },
    { title: 'Load testing new gateway', source: 'manual', status: 'todo', priority: 'P1', storyPoints: 5, assignee: null, teamId: platform.id, initiativeId: createdInitiatives[5].id },

    // Web team - Onboarding
    { title: 'User research for onboarding flow', source: 'manual', status: 'done', priority: 'P3', storyPoints: 3, assignee: 'Grace Lee', teamId: web.id, initiativeId: createdInitiatives[4].id, cycleTime: 3.0 },
    { title: 'Design new onboarding screens', source: 'manual', status: 'in_progress', priority: 'P3', storyPoints: 5, assignee: 'Grace Lee', teamId: web.id, initiativeId: createdInitiatives[4].id },
    { title: 'Implement step-by-step wizard', source: 'github', status: 'todo', priority: 'P3', storyPoints: 8, assignee: 'Iris Johnson', teamId: web.id, initiativeId: createdInitiatives[4].id, externalId: '#45' },
    { title: 'Onboarding progress tracking', source: 'manual', status: 'todo', priority: 'P3', storyPoints: 5, assignee: null, teamId: web.id, initiativeId: createdInitiatives[4].id },

    // Payments team - Analytics
    { title: 'Define payment metrics schema', source: 'manual', status: 'done', priority: 'P2', storyPoints: 3, assignee: 'Alice Chen', teamId: payments.id, initiativeId: createdInitiatives[6].id, cycleTime: 1.5 },
    { title: 'Build payment analytics ETL', source: 'jira', status: 'todo', priority: 'P2', storyPoints: 8, assignee: 'Bob Smith', teamId: payments.id, initiativeId: createdInitiatives[6].id, externalId: 'PROJ-113' },
    { title: 'Fraud detection alerts', source: 'manual', status: 'todo', priority: 'P1', storyPoints: 8, assignee: null, teamId: payments.id, initiativeId: createdInitiatives[6].id },

    // Misc unlinked items
    { title: 'Update CI/CD pipeline config', source: 'github', status: 'done', priority: 'P2', storyPoints: 3, assignee: 'Frank Wilson', teamId: platform.id, externalId: '#40', cycleTime: 1.0 },
    { title: 'Security audit findings remediation', source: 'manual', status: 'in_progress', priority: 'P1', storyPoints: 13, assignee: 'Ricardo Lopes', teamId: platform.id },
  ];

  let workItemCount = 0;
  for (const w of workItemData) {
    const existing = await prisma.workItem.findFirst({
      where: { title: w.title, teamId: w.teamId },
    });
    if (existing) {
      await prisma.workItem.update({ where: { id: existing.id }, data: w });
    } else {
      await prisma.workItem.create({ data: w });
    }
    workItemCount++;
  }
  console.log(`Created ${workItemCount} work items`);

  // --- Availability (PTO days) ---
  const ptoEntries = [
    { teamMemberId: createdMembers[1].id, date: new Date('2026-07-21'), type: 'pto', hours: 8 },
    { teamMemberId: createdMembers[1].id, date: new Date('2026-07-22'), type: 'pto', hours: 8 },
    { teamMemberId: createdMembers[3].id, date: new Date('2026-08-04'), type: 'pto', hours: 8 },
    { teamMemberId: createdMembers[3].id, date: new Date('2026-08-05'), type: 'pto', hours: 8 },
    { teamMemberId: createdMembers[3].id, date: new Date('2026-08-06'), type: 'pto', hours: 8 },
    { teamMemberId: createdMembers[5].id, date: new Date('2026-07-28'), type: 'pto', hours: 8 },
    { teamMemberId: createdMembers[7].id, date: new Date('2026-08-18'), type: 'pto', hours: 8 },
    { teamMemberId: createdMembers[7].id, date: new Date('2026-08-19'), type: 'pto', hours: 8 },
    { teamMemberId: createdMembers[8].id, date: new Date('2026-09-01'), type: 'pto', hours: 8 },
    // Holidays
    { teamMemberId: createdMembers[0].id, date: new Date('2026-09-07'), type: 'holiday', hours: 8 },
    { teamMemberId: createdMembers[6].id, date: new Date('2026-09-07'), type: 'holiday', hours: 8 },
  ];

  // Clear existing availability for these members to make idempotent
  const memberIds = [...new Set(ptoEntries.map((p) => p.teamMemberId))];
  await prisma.availability.deleteMany({ where: { teamMemberId: { in: memberIds } } });
  for (const pto of ptoEntries) {
    await prisma.availability.create({ data: pto });
  }
  console.log(`Created ${ptoEntries.length} availability entries`);

  // --- Pre-generated Insights ---
  await prisma.insight.deleteMany({});
  const insightData = [
    { type: 'over_capacity', severity: 'warning', message: 'Platform is over capacity by 15% — consider deferring lower-priority items', metadata: { teamId: platform.id, utilization: 115 } },
    { type: 'unassigned_high_priority', severity: 'warning', message: 'Payments has 1 high-priority item without an owner', metadata: { teamId: payments.id, count: 1 } },
    { type: 'plan_over_capacity', severity: 'error', message: 'Q3 2026 has more committed work than available capacity for Platform', metadata: { quarterPlanId: q3Plan.id, teamId: platform.id } },
    { type: 'cycle_time_increase', severity: 'info', message: 'Average cycle time improved by 12% compared to Q2', metadata: { recentAvg: 3.8, olderAvg: 4.3 } },
    { type: 'velocity_trend', severity: 'info', message: 'Team velocity is trending upward — 15% increase over last 3 sprints', metadata: {} },
  ];

  for (const insight of insightData) {
    await prisma.insight.create({ data: insight });
  }
  console.log(`Created ${insightData.length} insights`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
