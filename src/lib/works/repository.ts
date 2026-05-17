import { prisma } from "#/db";

export const WorkRepository = {
    async findByTitleAndAuthor(title: string, authorId: number) {
        return prisma.work.findFirst({
            where: { authorId, title },
            include: { workConcepts: true }
        });
    },

    async createWithEmbedding(
        title: string,
        description: string,
        olRawResponse: any,
        authorId: number,
        vectorString: string,
        meta: { googleRawResponse?: Record<string, unknown> | null } = {}
    ) {
        const googleRaw = meta.googleRawResponse ? JSON.stringify(meta.googleRawResponse) : null;
        const res = await prisma.$queryRaw<{ id: number }[]>`
            INSERT INTO works (title, description, ol_raw_response, author_id, embedding, google_raw_response)
            VALUES (
                ${title}, ${description}, ${JSON.stringify(olRawResponse)}::jsonb,
                ${authorId}, ${vectorString}::vector,
                ${googleRaw}::jsonb
            )
            RETURNING id;
        `;
        return res[0];
    },

    async linkSeries(workId: number, seriesName: string, order: number | null) {
        const series = await prisma.series.upsert({
            where: { name: seriesName },
            update: {},
            create: { name: seriesName }
        });

        return prisma.workSeries.upsert({
            where: { workId_seriesId: { workId, seriesId: series.id } },
            update: { order },
            create: { workId, seriesId: series.id, order }
        });
    },

    async linkConcept(workId: number, conceptId: number, similarity: number) {
        return prisma.$executeRaw`
            INSERT INTO work_concepts (work_id, concept_id, similarity)
            VALUES (${workId}, ${conceptId}, ${similarity})
            ON CONFLICT DO NOTHING;
        `;
    },

    async updateEmbedding(workId: number, description: string, vectorString: string) {
        return prisma.$executeRaw`
            UPDATE works
            SET embedding = ${vectorString}::vector,
                description = ${description}
            WHERE id = ${workId};
        `;
    }
};
