import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const autoPosts = await prisma.socialPost.findMany({
    where: { isAuto: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      userId: true,
      fortuneId: true,
      postType: true,
      fortuneType: true,
      isAuto: true,
      createdAt: true
    }
  })
  console.log('Auto-shared posts:', JSON.stringify(autoPosts, null, 2))
  
  const totalAuto = await prisma.socialPost.count({ where: { isAuto: true } })
  console.log('Total auto-shared posts:', totalAuto)
  
  const totalFortunes = await prisma.fortune.count()
  console.log('Total fortunes:', totalFortunes)
}

main().catch(console.error).finally(() => prisma.$disconnect())
