import { prisma } from "../src/db";

async function reset() {
    const authorId = "OL23919A";
    const author = await prisma.author.findUnique({ where: { openLibraryId: authorId } });
    
    if (!author) {
        console.log("Author not found, nothing to reset.");
        return;
    }

    console.log(`Wiping works for ${author.name}...`);
    const { count } = await prisma.work.deleteMany({
        where: { authorId: author.id }
    });
    
    console.log(`Deleted ${count} works. You are ready for a fresh ingest!`);
}

reset()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
