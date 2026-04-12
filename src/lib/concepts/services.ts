import { Prisma } from "@prisma/client";
import { EmbeddingClient } from "#/clients/EmbeddingClient";
import { ConceptRepository } from "./repository";
import {
    CONFLICT_THRESHOLD,
    EDGE_THRESHOLD,
    FALLBACK_THRESHOLD
} from "./constants";
import type {
    PostConceptBody,
} from "./types";
import {
    createCandidate,
    toEmbeddingString
} from "./utils";

const embeddingClient = new EmbeddingClient();

export async function createConcept(body: PostConceptBody) {
    const candidate = createCandidate(body);
    const deepContext = toEmbeddingString(candidate);

    const [embedding] = await embeddingClient.fetchBatch([deepContext]);
    if (!embedding) throw new Error("Embedding generation failed");

    const levelsString = JSON.stringify(candidate.levels);
    const vectorString = embeddingClient.toVectorString(embedding);

    const result = await ConceptRepository.insertConcept(candidate, vectorString, levelsString, deepContext);

    const newConceptId = result[0]?.id;
    if (!newConceptId) {
        return {
            status: 200,
            data: { received: body, message: "Concept already exists (or same slug), skipped." }
        };
    }

    const peers = await ConceptRepository.findPeers(newConceptId, vectorString, EDGE_THRESHOLD, CONFLICT_THRESHOLD, candidate.subCategory);

    const edgesToCreate: Prisma.ConceptEdgeCreateManyInput[] = [];
    const conflictsToCreate: Prisma.ConceptConflictCreateManyInput[] = [];

    // 1. Handle Conflicts (Must be same sub-category)
    peers
        .filter(p => p.subCategory === candidate.subCategory && (1 - p.distance) <= CONFLICT_THRESHOLD)
        .sort((a, b) => b.distance - a.distance)
        .slice(0, 12)
        .forEach(peer => {
            conflictsToCreate.push({
                conceptAId: newConceptId,
                conceptBId: peer.id,
                reason: `Similarity: ${(1 - peer.distance).toFixed(4)}`,
                source: 'MATHEMATICAL'
            });
        });

    // 2. Handle Edges (Top 10 overall with Safety Net fallback)
    let potentialEdges = peers.filter(p => (1 - p.distance) >= EDGE_THRESHOLD);

    if (potentialEdges.length === 0) {
        potentialEdges = peers.filter(p => (1 - p.distance) >= FALLBACK_THRESHOLD);
    }

    potentialEdges
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10)
        .forEach(peer => {
            edgesToCreate.push({
                sourceConceptId: newConceptId,
                targetConceptId: peer.id,
                weight: 1 - peer.distance,
            });
        });

    if (conflictsToCreate.length > 0) {
        await ConceptRepository.createConflicts(conflictsToCreate);
    }

    if (edgesToCreate.length > 0) {
        await ConceptRepository.createEdges(edgesToCreate);
    }

    return {
        status: 201,
        data: { received: body, created: result }
    };
}

export async function reEdgeAllConcepts() {
    // 1. Clear existing edges and conflicts
    await ConceptRepository.clearAllRelations();

    // 2. Create Edges across all categories
    await ConceptRepository.bulkInsertEdges(EDGE_THRESHOLD);

    // 3. Create Conflicts (Only within the SAME sub-category)
    await ConceptRepository.bulkInsertConflicts(CONFLICT_THRESHOLD);
}
