import { prisma } from "#/db";

export const WorkRepository = {
    async findByTitleAndAuthor(title: string, authorId: number) {
        return prisma.work.findFirst({
            where: {
                authorId,
                title
            },
            include: {
                workConcepts: true
            }
        });
    },

    async createWithoutEmbedding(data: { title: string, description: string, rawApiResponse: any, authorId: number }) {
        return prisma.work.create({
            data
        });
    },

    async createWithEmbedding(title: string, description: string, rawApiResponse: any, authorId: number, vectorString: string) {
        const res = await prisma.$queryRaw<{ id: number }[]>`
            INSERT INTO works (title, description, raw_api_response, author_id, embedding)
            VALUES (${title}, ${description}, ${JSON.stringify(rawApiResponse)}::jsonb, ${authorId}, ${vectorString}::vector)
            RETURNING id;
        `;
        return res[0];
    },

    async linkConcept(workId: number, conceptId: number, similarity: number) {
        return prisma.$executeRaw`
            INSERT INTO work_concepts (work_id, concept_id, similarity)
            VALUES (${workId}, ${conceptId}, ${similarity})
            ON CONFLICT DO NOTHING;
        `;
    }
};
