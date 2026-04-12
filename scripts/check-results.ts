import { prisma } from '../src/db.js'

async function main() {
  try {
    const edges = await prisma.conceptEdge.count()
    const conflicts = await prisma.conceptConflict.count()
    console.log('Final Edges:', edges)
    console.log('Final Conflicts:', conflicts)
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
}

main()
