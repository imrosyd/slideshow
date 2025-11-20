
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '194a39bc-987a-423c-bca8-57943a3b4870';
  await prisma.profile.delete({
    where: { id: userId },
  });
  console.log(`User ${userId} deleted`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
