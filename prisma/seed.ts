import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding OrbitPilot database...');

  // --- Admin User ---
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'rlopes@intermedia.com' },
    update: { name: 'Ricardo Lopes', role: 'admin', passwordHash },
    create: { email: 'rlopes@intermedia.com', name: 'Ricardo Lopes', role: 'admin', passwordHash },
  });
  console.log('Admin user created/updated: rlopes@intermedia.com');

  console.log('Seeding complete! Connect Jira to sync real team data.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
