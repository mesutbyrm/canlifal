import prisma from '../lib/db';
import { randomBytes } from 'crypto';

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

async function main() {
  const users = await prisma.user.findMany({
    where: { referralCode: null }
  });

  console.log(`Found ${users.length} users without referral codes`);

  for (const user of users) {
    let code = generateReferralCode();
    let attempts = 0;
    
    while (attempts < 10) {
      const existing = await prisma.user.findUnique({ where: { referralCode: code } });
      if (!existing) break;
      code = generateReferralCode();
      attempts++;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: code }
    });
    console.log(`Updated user ${user.email} with code: ${code}`);
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
