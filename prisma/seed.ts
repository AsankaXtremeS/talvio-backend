// prisma/seed.ts
// Run with: npx ts-node prisma/seed.ts
// Creates a hardcoded admin user and a test employer user if they don't already exist.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@talvio.com';
  const adminPassword = 'Admin@1234';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'ADMIN',
      firstName: 'Talvio',
      lastName: 'Admin',
      isVerified: true,
    },
    create: {
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 10),
      role: 'ADMIN',
      firstName: 'Talvio',
      lastName: 'Admin',
      isVerified: true,
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: { not: admin.email },
    },
  });

  console.log('✅ Only the admin user remains in the database.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });