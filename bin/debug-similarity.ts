import { prisma } from "../src/db";
import { EmbeddingClient } from "../src/clients/EmbeddingClient";

async function debugSimilarity() {
    const embeddingClient = new EmbeddingClient();
    const title = "Harry Potter and the Chamber of Secrets";
    const description = "The second book in the Harry Potter series. Harry returns to Hogwarts, but a mysterious chamber has been opened and students are being petrified.";
    
    const context = `${title}. ${description}`;
    console.log(`Generating embedding for: ${title}`);
    const [embedding] = await embeddingClient.fetchBatch([context]);
    const vectorString = embeddingClient.toVectorString(embedding);

    const closest = await prisma.$queryRaw<{ id: number, name: string, similarity: number }[]>`
        SELECT id, name, 1 - (embedding <=> ${vectorString}::vector) as similarity
        FROM concepts
        ORDER BY embedding <=> ${vectorString}::vector ASC
        LIMIT 10;
    `;

    console.log(`\nTop matches for "${title}":`);
    closest.forEach(c => {
        console.log(`- ${c.name} (ID: ${c.id}, Similarity: ${c.similarity.toFixed(4)})`);
    });
}

debugSimilarity()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
