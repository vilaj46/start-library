import { type Concept, Prisma } from "@prisma/client";
import { prisma } from "#/db";
import type { Candidate, PeerResult } from "./types";

export const ConceptRepository = {
    async insertConcept(candidate: Candidate, vectorString: string, levelsString: string, deepContext: string) {
        return prisma.$queryRaw<{ id: Concept['id'] }[]>`
            INSERT INTO concepts (
                slug, name, description, category, sub_category,
                logic, appeal, examples, aliases, embedding, raw_input,
                levels, weight, updated_at
            )
            VALUES (
                ${candidate.slug}, ${candidate.name}, ${candidate.description}, 
                ${candidate.category}, ${candidate.subCategory},
                ${candidate.logic}, ${candidate.appeal}, ${candidate.examples},
                ${candidate.aliases || []},
                ${vectorString}::vector, 
                ${deepContext},
                ${levelsString}::jsonb, 
                ${candidate.weight}, 
                NOW()
            )
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        `;
    },

    async findPeers(newConceptId: number, vectorString: string, edgeThreshold: number, conflictThreshold: number, subCategory: string): Promise<PeerResult[]> {
        return prisma.$queryRaw<PeerResult[]>`
        SELECT id, (embedding <=> ${vectorString}::vector) as distance, sub_category as "subCategory"
        FROM concepts
        WHERE id != ${newConceptId}
        AND (
            (1 - (embedding <=> ${vectorString}::vector)) >= ${edgeThreshold}::real
            OR 
            (
                (1 - (embedding <=> ${vectorString}::vector)) <= ${conflictThreshold}::real
                AND sub_category = ${subCategory}
            )
        );
    `;
    },

    async createConflicts(data: Prisma.ConceptConflictCreateManyInput[]) {
        return prisma.conceptConflict.createMany({
            data,
            skipDuplicates: true
        });
    },

    async createEdges(data: Prisma.ConceptEdgeCreateManyInput[]) {
        return prisma.conceptEdge.createMany({
            data,
            skipDuplicates: true
        });
    },

    async clearAllRelations() {
        await prisma.conceptEdge.deleteMany();
        await prisma.conceptConflict.deleteMany();
    },

    async bulkInsertEdges(edgeThreshold: number) {
        return prisma.$executeRaw`
            INSERT INTO concept_edges (source_concept_id, target_concept_id, weight, type)
            SELECT c1.id, c2.id, (1 - (c1.embedding <=> c2.embedding)), 'SEMANTIC'::"EdgeType"
            FROM concepts c1
            CROSS JOIN LATERAL (
                SELECT id, embedding
                FROM concepts c2
                WHERE c1.id != c2.id
                AND (1 - (c1.embedding <=> c2.embedding)) >= ${edgeThreshold}::real
                ORDER BY c1.embedding <=> c2.embedding ASC
                LIMIT 10
            ) c2
            ON CONFLICT DO NOTHING;
        `;
    },

    async bulkInsertConflicts(conflictThreshold: number) {
        return prisma.$executeRaw`
        INSERT INTO concept_conflicts (concept_a_id, concept_b_id, reason, source, type, severity)
        SELECT 
            LEAST(c1.id, c2.id),
            GREATEST(c1.id, c2.id),
            'Opposite Similarity: ' || (1 - (c1.embedding <=> c2.embedding))::text, 
            'MATHEMATICAL'::"ConflictSource", 
            'LOGICAL'::"ConflictType", 
            1.0
        FROM concepts c1
        CROSS JOIN LATERAL (
            SELECT id, embedding
            FROM concepts c2
            WHERE c1.id != c2.id
            AND c1.sub_category = c2.sub_category
            AND (1 - (c1.embedding <=> c2.embedding)) <= ${conflictThreshold}::real
            ORDER BY c1.embedding <=> c2.embedding DESC
            LIMIT 12
        ) c2
        ON CONFLICT DO NOTHING;
    `;
    },

    async updateMetadata(id: number, data: { description: string, logic: string, appeal: string, examples: string[], aliases: string[], embedding: string, rawInput: string }) {
        return prisma.$executeRaw`
            UPDATE concepts
            SET description = ${data.description},
                logic = ${data.logic},
                appeal = ${data.appeal},
                examples = ${data.examples},
                aliases = ${data.aliases},
                embedding = ${data.embedding}::vector,
                raw_input = ${data.rawInput},
                updated_at = NOW()
            WHERE id = ${id};
        `;
    }
};
