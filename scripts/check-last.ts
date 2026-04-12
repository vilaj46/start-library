import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const lastConcepts = await prisma.concept.findMany({
    orderBy: { id: 'desc' },
    take: 5
  })
  console.log('Last 5 concepts:', JSON.stringify(lastConcepts, null, 2))
  const count = await prisma.concept.count()
  console.log('Total count:', count)
  await prisma.$disconnect()
}

main()
