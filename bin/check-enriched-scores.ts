import { prisma } from '../src/db';

async function main() {
    const work = await prisma.work.findFirst({
        where: { title: { contains: "Philosopher's Stone" } }
    });

    if (!work) return;

    const workRes = await prisma.$queryRaw<any[]>`
        SELECT embedding::text FROM works WHERE id = ${work.id}
    `;
    const vectorString = workRes[0].embedding;

    const res = await prisma.$queryRaw<any[]>`
        SELECT name, 1 - (embedding <=> ${vectorString}::vector) as similarity 
        FROM concepts 
        WHERE name IN ('Urban Fantasy', 'Coming of Age', 'Cryptocracy', 'Low Fantasy', 'The Chosen One')
    `;
    console.log(JSON.stringify(res, null, 2));
}

main().finally(() => prisma.$disconnect());
