import { prisma } from "#/db";
import { AI_CONFIG } from "#/lib/ai/config";

export const WorkRepository = {
    async findByTitleAndAuthor(title: string, authorId: number) {
        return prisma.work.findFirst({
            where: {
                authorId,
                title
            },
            select: {
                id: true,
                title: true,
                missingCategories: true,
                workConcepts: { select: { id: true } }
            }
        });
    },

    async createWithoutEmbedding(data: { title: string, description: string, rawApiResponse: any, authorId: number }) {
        return prisma.work.create({
            data
        });
    },

    async createWithEmbedding(title: string, description: string, rawApiResponse: any, authorId: number, vectorString: string) {
        const jsonResponse = rawApiResponse ? JSON.stringify(rawApiResponse) : null;

        const res = await prisma.$queryRaw<{ id: number }[]>`
            INSERT INTO works (title, description, raw_api_response, author_id, embedding)
            VALUES (${title}, ${description}, ${jsonResponse}::jsonb, ${authorId}, ${vectorString}::vector(1024))
            RETURNING id;
        `;
        return res[0];
    },

    async linkSeries(workId: number, seriesName: string, order: number | null) {
        return prisma.$transaction(async (tx) => {
            const series = await tx.series.upsert({
                where: { name: seriesName },
                update: {},
                create: { name: seriesName }
            });

            return tx.workSeries.upsert({
                where: {
                    workId_seriesId: {
                        workId,
                        seriesId: series.id
                    }
                },
                update: { order },
                create: {
                    workId,
                    seriesId: series.id,
                    order
                }
            });
        });
    },

    async linkConcept(workId: number, conceptId: number, similarity: number) {
        return prisma.$executeRaw`
            INSERT INTO work_concepts (work_id, concept_id, similarity)
            VALUES (${workId}, ${conceptId}, ${similarity})
            ON CONFLICT (work_id, concept_id) DO UPDATE SET similarity = EXCLUDED.similarity;
        `;
    },

    async updateEmbedding(workId: number, description: string, vectorString: string) {
        return prisma.$executeRaw`
            UPDATE works 
            SET embedding = ${vectorString}::vector(1024),
                description = ${description}
            WHERE id = ${workId};
        `;
    },

    async getSuggestedConcepts(workId: number) {
        const works = await prisma.$queryRaw<{ id: number, embedding: string }[]>`
            SELECT id, embedding::text FROM works WHERE id = ${workId};
        `;

        const work = works[0];
        if (!work || !work.embedding) return [];

        const matches = await prisma.$queryRaw<{ id: number, name: string, category: string, subCategory: string, similarity: number }[]>`
            WITH similarity_scores AS (
                SELECT id, name, category, sub_category,
                       (1 - (embedding <=> ${work.embedding}::vector(1024))) as similarity
                FROM concepts
                WHERE embedding IS NOT NULL
            )
            SELECT id, name, category, sub_category as "subCategory", similarity
            FROM similarity_scores
            WHERE similarity >= 0.58
              AND similarity < ${AI_CONFIG.THRESHOLDS.CONCEPT_MATCH}
              AND id NOT IN (SELECT concept_id FROM work_concepts WHERE work_id = ${workId})
            ORDER BY similarity DESC
            LIMIT 10;
        `;

        return matches;
    },

    async getAuthorWorkEmbeddings(authorId: number): Promise<number[][]> {
        const works = await prisma.$queryRaw<{ embedding: string }[]>`
            SELECT embedding::text 
            FROM works 
            WHERE author_id = ${authorId} 
              AND embedding IS NOT NULL
        `;

        return works
            .map(w => {
                if (!w.embedding) return null;
                const clean = w.embedding.replace(/[\[\]]/g, '');
                if (!clean) return null;
                const parts = clean.split(',').map(Number);
                return parts.some(isNaN) ? null : parts;
            })
            .filter((v): v is number[] => v !== null);
    }
};
