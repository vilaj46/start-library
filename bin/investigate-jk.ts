import { prisma } from '../src/db';

async function main() {
    const author = await prisma.author.findFirst({
        where: { name: { contains: 'Rowling' } },
        include: {
            works: {
                include: {
                    workConcepts: {
                        include: {
                            concept: true
                        }
                    }
                }
            }
        }
    });

    if (!author) {
        console.log("Author not found");
        return;
    }

    console.log(`Author: ${author.name}`);
    console.log(`Total Works: ${author.works.length}`);

    const matchedWorks = author.works.filter(w => w.workConcepts.length > 0);
    console.log(`Works with matches: ${matchedWorks.length}`);

    if (matchedWorks.length > 0) {
        console.log("\nMatches for first 5 matched works:");
        for (const work of matchedWorks.slice(0, 5)) {
            console.log(`Work: ${work.title}`);
            for (const wc of work.workConcepts) {
                console.log(`  - ${wc.concept.name} (Similarity: ${wc.similarity})`);
            }
        }
    }

    const unmatchedWorks = author.works.filter(w => w.workConcepts.length === 0);
    console.log(`\nUnmatched Works (First 5):`);
    for (const work of unmatchedWorks.slice(0, 5)) {
        console.log(`- ${work.title}`);
        // Let's also check if they have embeddings
        console.log(`  Has embedding: ${!!(work as any).embedding}`);
    }
}

main().finally(() => prisma.$disconnect());
