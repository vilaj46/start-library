import { prisma } from '../src/db';

async function main() {
    const work = await prisma.work.findFirst({
        where: { title: { contains: 'Half-Blood Prince' } }
    });

    if (!work) return;

    // We need to fetch the embedding as text because Prisma doesn't support it directly
    const workRes = await prisma.$queryRaw<any[]>`
        SELECT embedding::text FROM works WHERE id = ${work.id}
    `;
    const vectorString = workRes[0].embedding;

    const res = await prisma.$queryRaw<any[]>`
        SELECT id, name, 1 - (embedding <=> ${vectorString}::vector) as similarity 
        FROM concepts 
        WHERE id = 1076 OR name = 'Urban Fantasy'
    `;
    console.log(JSON.stringify(res, null, 2));
}

main().finally(() => prisma.$disconnect());
