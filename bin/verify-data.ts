import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const concepts = await prisma.concept.count();
    const edges = await prisma.conceptEdge.count();
    const conflicts = await prisma.conceptConflict.count();
    
    console.log('Database Totals:');
    console.log(`Concepts: ${concepts}`);
    console.log(`Edges: ${edges}`);
    console.log(`Conflicts: ${conflicts}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
