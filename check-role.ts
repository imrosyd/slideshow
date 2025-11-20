
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '194a39bc-987a-423c-bca8-57943a3b4870';
  const user = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (user?.role === 'admin') {
    console.log('User role is admin');
    process.exit(0);
  } else {
    console.log(`User role is not admin: ${user?.role}`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
