import { prisma } from '../src/db';

async function main() {
    const work = await prisma.work.findFirst({
        where: { title: { contains: 'Half-Blood Prince' } }
    });

    if (!work) return;

    const result = await prisma.$queryRaw<any[]>`
        SELECT embedding::text FROM works WHERE id = ${work.id}
    `;
    
    const embeddingString = result[0]?.embedding;
    if (!embeddingString) return;

    const closest = await prisma.$queryRaw<any[]>`
        SELECT name, 1 - (embedding <=> ${embeddingString}::vector) as similarity
        FROM concepts
        ORDER BY embedding <=> ${embeddingString}::vector ASC
        LIMIT 20;
    `;

    console.log(`Top 20 matches for "${work.title}":`);
    closest.forEach(c => {
        console.log(`- ${c.name}: ${c.similarity}`);
    });
}

main().finally(() => prisma.$disconnect());
