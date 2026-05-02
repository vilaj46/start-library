import { prisma } from "../src/db";

async function cleanup() {
    console.log("Cleaning up unverified concepts...");

    const targetId = 1137;
    const toDelete = await prisma.concept.findMany({
        where: { id: { gte: targetId } },
        select: { id: true }
    });

    const ids = toDelete.map(c => c.id);
    console.log(`Targeting ${ids.length} concepts (ID >= ${targetId}) for deletion.`);
    
    // Delete them (WorkConcept links will be handled by cascade if configured, 
    // but Prisma doesn't always have it for Concept -> WorkConcept in this direction)
    // Let's check schema. prisma shows:
    // model WorkConcept {
    //   ...
    //   concept    Concept  @relation(fields: [conceptId], references: [id])
    // }
    // It does NOT have onDelete: Cascade for Concept -> WorkConcept.
    
    console.log("Deleting related WorkConcept links first...");
    await prisma.workConcept.deleteMany({
        where: { conceptId: { in: ids } }
    });

    console.log("Deleting concepts...");
    const { count } = await prisma.concept.deleteMany({
        where: { id: { in: ids } }
    });

    console.log(`Successfully deleted ${count} unverified concepts.`);
}

cleanup()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
