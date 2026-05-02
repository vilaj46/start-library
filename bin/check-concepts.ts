import { prisma } from '../src/db';

async function main() {
    const concepts = await prisma.concept.findMany({
        take: 50,
        select: {
            name: true,
            category: true,
            subCategory: true
        }
    });

    console.log(`Total Concepts: ${await prisma.concept.count()}`);
    console.log("\nSample Concepts:");
    concepts.forEach(c => {
        console.log(`- ${c.name} (${c.category} / ${c.subCategory})`);
    });
}

main().finally(() => prisma.$disconnect());
