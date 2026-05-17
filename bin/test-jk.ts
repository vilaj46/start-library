// Environment variables are loaded via dotenv-cli
import { processOpenLibraryAuthor } from "../src/lib/openlibrary/service";
import { prisma } from "../src/db";

async function main() {
    try {
        console.log("Processing J.K. Rowling...");
        const author = await processOpenLibraryAuthor("OL23919A");

        console.log("--- RESULTS ---");
        console.log(`Author Created: ${author.name} (ID: ${author.id})`);

        const works = await prisma.work.findMany({
            where: { authorId: author.id }
        });

        console.log(`\nTotal Works Processed: ${works.length}`);

        // Let's get a few examples of works and the concepts they linked to
        const sampleWorks = await prisma.work.findMany({
            where: { authorId: author.id },
            include: {
                workConcepts: {
                    include: {
                        concept: true
                    }
                }
            },
            take: 5
        });

        console.log("\nSample Work Mappings:");
        for (const w of sampleWorks) {
            console.log(`- ${w.title}`);
            if (w.workConcepts.length > 0) {
                for (const wc of w.workConcepts) {
                    console.log(`  -> Linked to Concept: ${wc.concept.name} (Category: ${wc.concept.category}, Similarity: ${wc.similarity})`);
                }
            } else {
                console.log(`  -> No concepts linked (or wait, is it in workConcepts)?`);
            }
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
