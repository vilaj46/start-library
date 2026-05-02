import { prisma } from '../src/db.js'

async function main() {
  try {
    const count = await prisma.concept.count()
    console.log('Total concepts:', count)
    const last = await prisma.concept.findMany({
        orderBy: { id: 'desc' },
        take: 1
    })
    console.log('Last concept:', JSON.stringify(last, null, 2))
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
}

main()
