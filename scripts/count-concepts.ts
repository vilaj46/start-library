import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const count = await prisma.concept.count()
  console.log('Total concepts:', count)
  await prisma.$disconnect()
}

main()
