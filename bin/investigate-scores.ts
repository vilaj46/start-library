import { prisma } from '../src/db';

async function main() {
    const author = await prisma.author.findFirst({
        where: { name: { contains: 'Rowling' } }
    });

    if (!author) {
        console.log("Author not found");
        return;
    }

    const works = await prisma.work.findMany({
        where: { authorId: author.id },
        take: 5
    });

    for (const work of works) {
        console.log(`\nWork: ${work.title}`);
        
        // Get the embedding from DB using raw SQL
        const result = await prisma.$queryRaw<any[]>`
            SELECT embedding::text FROM works WHERE id = ${work.id}
        `;
        
        const embeddingString = result[0]?.embedding;
        if (!embeddingString) {
            console.log("  No embedding found in DB");
            continue;
        }

        // Find top 5 closest concepts
        const closest = await prisma.$queryRaw<any[]>`
            SELECT name, 1 - (embedding <=> ${embeddingString}::vector) as similarity
            FROM concepts
            ORDER BY embedding <=> ${embeddingString}::vector ASC
            LIMIT 5;
        `;

        console.log("  Top 5 closest concepts:");
        for (const c of closest) {
            console.log(`    - ${c.name}: ${c.similarity}`);
        }
    }
}

main().finally(() => prisma.$disconnect());
