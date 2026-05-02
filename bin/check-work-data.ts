import { prisma } from '../src/db';

async function main() {
    const work = await prisma.work.findFirst({
        where: { title: { contains: "Philosopher's Stone" } }
    });

    if (!work) {
        console.log("Work not found");
        return;
    }

    console.log(`Title: ${work.title}`);
    console.log(`Description: ${work.description}`);
    console.log(`Raw API Response:`, JSON.stringify(work.rawApiResponse, null, 2));
}

main().finally(() => prisma.$disconnect());
