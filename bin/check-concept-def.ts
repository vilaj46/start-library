import { prisma } from '../src/db';

async function main() {
    const concept = await prisma.concept.findUnique({
        where: { slug: 'low_fantasy' }
    });

    if (!concept) {
        // Try finding by name if slug is different
        const cByName = await prisma.concept.findFirst({
            where: { name: 'Low Fantasy' }
        });
        if (cByName) {
            console.log(`Concept: ${cByName.name}`);
            console.log(`Description: ${cByName.description}`);
            console.log(`Logic: ${cByName.logic}`);
            return;
        }
        console.log("Concept not found");
        return;
    }

    console.log(`Concept: ${concept.name}`);
    console.log(`Description: ${concept.description}`);
    console.log(`Logic: ${concept.logic}`);
}

main().finally(() => prisma.$disconnect());
