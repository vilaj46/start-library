import { prisma } from '../src/db';

async function main() {
    const author = await prisma.author.findFirst({
        where: { name: { contains: 'Rowling' } }
    });

    if (!author) {
        console.log("Author not found");
        return;
    }

    const { count } = await prisma.workConcept.deleteMany({
        where: {
            work: {
                authorId: author.id
            }
        }
    });

    console.log(`Cleared ${count} concept matches for ${author.name}`);
}

main().finally(() => prisma.$disconnect());
