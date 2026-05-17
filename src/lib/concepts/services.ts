import { prisma } from "#/db/client";
import { embeddingClient } from "#/lib/ai/embedding";
import { ConceptRepository } from "#/db/concepts/repository";
import { AI_CONFIG } from "#/lib/ai/config";
import type { PostConceptBody } from "#/lib/concepts/schema";
import {
    createCandidate,
    toEmbeddingString,
    determineRelationships
} from "#/lib/concepts/utils";
import { VectorMath } from "#/lib/math";

export const createConcept = async (body: PostConceptBody): Promise<number | null> => {
    const candidate = createCandidate(body);
    const deepContext = toEmbeddingString(candidate);

    const embeddings = await embeddingClient.fetchBatch([deepContext]);
    const embedding = embeddings[0];

    if (!embedding) {
        throw new Error("Embedding generation failed: No vector returned from AI.");
    }

    const levelsString = JSON.stringify(candidate.levels);
    const vectorString = VectorMath.toVectorString(embedding);

    const result = await ConceptRepository.insertConcept(candidate, vectorString, levelsString, deepContext);
    const newConceptId = result[0]?.id;

    if (!newConceptId) {
        return null;
    }

    const { EDGE, CONFLICT } = AI_CONFIG.THRESHOLDS;
    const peers = await ConceptRepository.findPeers(
        newConceptId,
        vectorString,
        EDGE,
        CONFLICT,
        candidate.subCategory
    );

    const { conflicts, edges } = determineRelationships(newConceptId, candidate.subCategory, peers);

    await ConceptRepository.linkRelatedPeers(conflicts, edges);

    return newConceptId;
};

export const reEdgeAllConcepts = async () => {
    const { EDGE, CONFLICT } = AI_CONFIG.THRESHOLDS;

    await ConceptRepository.clearAllRelations();
    await ConceptRepository.bulkInsertEdges(EDGE);
    await ConceptRepository.bulkInsertConflicts(CONFLICT);
};
