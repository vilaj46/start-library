import { prisma } from '../src/db';

async function main() {
    const work = await prisma.work.findFirst({
        where: { title: { contains: "Philosopher's Stone" } }
    });

    if (!work) return;

    const subjects = (work.rawApiResponse as any).subjects || [];
    console.log("Full Subjects Count:", subjects.length);
    console.log("First 10 Subjects:", subjects.slice(0, 10));
}

main().finally(() => prisma.$disconnect());
