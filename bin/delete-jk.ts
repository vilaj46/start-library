import { prisma } from "../src/db";

async function main() {
    const author = await prisma.author.findUnique({ where: { openLibraryId: "OL23919A" } });

    if (!author) {
        console.log("Author not found — nothing to delete.");
        return;
    }

    const workCount = await prisma.work.count({ where: { authorId: author.id } });
    console.log(`Found: ${author.name} (id: ${author.id}) with ${workCount} works. Deleting...`);

    // Delete work_concepts, work_series, then works before the author
    const works = await prisma.work.findMany({ where: { authorId: author.id }, select: { id: true } });
    const workIds = works.map(w => w.id);
    await prisma.$executeRaw`DELETE FROM work_concepts WHERE work_id = ANY(${workIds}::int[])`;
    await prisma.$executeRaw`DELETE FROM work_series WHERE work_id = ANY(${workIds}::int[])`;
    await prisma.work.deleteMany({ where: { authorId: author.id } });
    await prisma.author.delete({ where: { id: author.id } });
    console.log("Author and all associated records deleted.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
