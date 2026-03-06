import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Get all fortune IDs that have been auto-shared
  const autoSharedFortuneIds = await prisma.socialPost.findMany({
    where: { isAuto: true, fortuneId: { not: null } },
    select: { fortuneId: true }
  })
  
  const sharedIds = autoSharedFortuneIds.map(p => p.fortuneId).filter(Boolean) as string[]
  
  // Get fortunes that were NOT auto-shared
  const missingFortunes = await prisma.fortune.findMany({
    where: { id: { notIn: sharedIds } },
    select: {
      id: true,
      fortuneType: true,
      createdAt: true,
      userId: true
    },
    orderBy: { createdAt: 'desc' }
  })
  
  console.log('Fortunes NOT auto-shared:', JSON.stringify(missingFortunes, null, 2))
  console.log('Missing count:', missingFortunes.length)
}

main().catch(console.error).finally(() => prisma.$disconnect())
