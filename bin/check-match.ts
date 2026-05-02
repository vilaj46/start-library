import { prisma } from '../src/db';

async function main() {
    const work = await prisma.work.findFirst({
        where: { title: { contains: "Short Stories from Hogwarts of Heroism" } },
        include: { workConcepts: { include: { concept: true } } }
    });

    if (!work) {
        console.log("Work not found");
        return;
    }

    console.log(`Title: ${work.title}`);
    console.log(`Matched Concepts:`, work.workConcepts.map(wc => `${wc.concept.name} (${wc.similarity})`));
    console.log(`Raw API Response Subjects:`, (work.rawApiResponse as any).subjects);
}

main().finally(() => prisma.$disconnect());
