import { prisma } from '../src/db';

async function main() {
    const concepts = await prisma.concept.findMany({
        where: {
            name: { in: ['Low Fantasy', 'The Chosen One', 'Middle Grade', 'Young Adult'] }
        },
        select: {
            name: true,
            description: true,
            logic: true,
            appeal: true,
            rawInput: true
        }
    });

    for (const c of concepts) {
        console.log(`\nConcept: ${c.name}`);
        console.log(`Description: ${c.description}`);
        console.log(`Logic: ${c.logic}`);
        console.log(`Appeal: ${c.appeal}`);
        console.log(`Raw Input: ${c.rawInput}`);
    }
}

main().finally(() => prisma.$disconnect());
