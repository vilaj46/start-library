import { prisma } from "#/db";
import { Prisma } from "@prisma/client";
import { WorkRepository } from "#/db/works/repository";
import type { OpenLibraryWork } from "#/lib/openlibrary/schema";
import { detectSeries } from "#/lib/openlibrary/utils";
import { AI_CONFIG } from "#/lib/ai/config";
import { CONCEPT_TAXONOMY } from "#/lib/concepts/constants";

export const WorkService = {
    async syncWorkWithEmbedding(
        existingWork: { id: number; title: string } | null,
        olWork: OpenLibraryWork,
        description: string,
        authorId: number,
        vectorString: string
    ): Promise<{ id: number; title: string } & Record<string, any>> {
        if (!existingWork) {
            const created = await WorkRepository.createWithEmbedding(
                olWork.title,
                description,
                olWork,
                authorId,
                vectorString
            );
            return { id: created.id, ...olWork };
        }

        await WorkRepository.updateEmbedding(existingWork.id, description, vectorString);
        return existingWork;
    },

    async linkSeries(
        workId: number,
        olWork: OpenLibraryWork & { _aiSeriesHint?: { name: string | null; order: number | null } }
    ): Promise<void> {
        let seriesInfo = detectSeries(olWork);

        if (!seriesInfo.name && olWork._aiSeriesHint?.name) {
            seriesInfo = { name: olWork._aiSeriesHint.name, order: olWork._aiSeriesHint.order };
        }

        if (seriesInfo.name) {
            await WorkRepository.linkSeries(workId, seriesInfo.name, seriesInfo.order);
        }
    },

    async evaluateAndLinkConcepts(
        workId: number,
        title: string,
        vectorString: string
    ): Promise<string[]> {
        const missingCategories: string[] = [];
        console.log(`🔍 Evaluating Categories for "${title}":`);

        // Centralize category references from CONCEPT_TAXONOMY keys
        const targetCategories = Object.keys(CONCEPT_TAXONOMY);
        const requiredSubCategories = ['perspective', 'target_audience', 'tone'];
        
        const SIMILARITY_THRESHOLD = AI_CONFIG.THRESHOLDS.CONCEPT_MATCH;
        const DELTA_THRESHOLD = AI_CONFIG.THRESHOLDS.MULTI_LINK_DELTA;

        // Evaluate Main Categories
        for (const category of targetCategories) {
            const excludeSql = category === 'narrative'
                ? Prisma.sql`AND sub_category NOT IN ('perspective', 'target_audience', 'tone')`
                : Prisma.empty;

            const matches = await prisma.$queryRaw<{ id: number, similarity: number, name: string }[]>`
                SELECT id, name, 1 - (embedding <=> ${vectorString}::vector) as similarity
                FROM concepts
                WHERE category = ${category} ${excludeSql}
                ORDER BY embedding <=> ${vectorString}::vector ASC
                LIMIT 2;
            `;

            let categoryMatched = false;

            if (matches.length > 0) {
                const topMatch = matches[0];
                if (topMatch.similarity >= SIMILARITY_THRESHOLD) {
                    await WorkRepository.linkConcept(workId, topMatch.id, topMatch.similarity);
                    console.log(`  ✅ Linked ${category}: "${topMatch.name}" (Sim: ${topMatch.similarity.toFixed(3)})`);
                    categoryMatched = true;

                    // Handle Delta Multi-Linking
                    if (matches.length > 1) {
                        const secondMatch = matches[1];
                        if (secondMatch.similarity >= SIMILARITY_THRESHOLD && (topMatch.similarity - secondMatch.similarity) <= DELTA_THRESHOLD) {
                            await WorkRepository.linkConcept(workId, secondMatch.id, secondMatch.similarity);
                            console.log(`  ➕ Multi-Linked ${category}: "${secondMatch.name}" (Sim: ${secondMatch.similarity.toFixed(3)})`);
                        }
                    }
                }
            }

            if (!categoryMatched) {
                console.log(`  ❌ Gap in ${category}: Score too low or no concepts.`);
                missingCategories.push(category);
            }
        }

        // Evaluate Required Subcategories
        for (const subCat of requiredSubCategories) {
            const matches = await prisma.$queryRaw<{ id: number, similarity: number, name: string }[]>`
                SELECT id, name, 1 - (embedding <=> ${vectorString}::vector) as similarity
                FROM concepts
                WHERE sub_category = ${subCat}
                ORDER BY embedding <=> ${vectorString}::vector ASC
                LIMIT 1;
            `;

            if (matches.length > 0) {
                const match = matches[0];
                if (match.similarity >= SIMILARITY_THRESHOLD) {
                    await WorkRepository.linkConcept(workId, match.id, match.similarity);
                    console.log(`  🎯 Linked ${subCat}: "${match.name}" (Sim: ${match.similarity.toFixed(3)})`);
                } else {
                    console.log(`  ❌ Gap in ${subCat}: Score too low (${match.similarity.toFixed(3)} < ${SIMILARITY_THRESHOLD})`);
                    missingCategories.push(subCat);
                }
            } else {
                console.log(`  ❌ Gap in ${subCat}: No concepts found in DB.`);
                missingCategories.push(subCat);
            }
        }

        return missingCategories;
    }
};
