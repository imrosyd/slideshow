
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '194a39bc-987a-423c-bca8-57943a3b4870';
  await prisma.profile.update({
    where: { id: userId },
    data: { role: 'admin' },
  });
  console.log(`User ${userId} role updated to admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
