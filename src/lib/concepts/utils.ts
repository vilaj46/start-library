import {
    CANDIDATE_DEFAULT_WEIGHT
} from "#/lib/concepts/constants";
import { AI_CONFIG } from "#/lib/ai/config";
import type { Category, SubCategory, PeerResult } from "#/lib/concepts/types";
import { type Candidate, type PostConceptBody, type ProgressionLevel } from "#/lib/concepts/schema";
import { slugify } from "#/lib/utils/string";
import type { Prisma } from "@prisma/client";

export const createCandidateSlug = (category: Category, subCategory: SubCategory, label: string) =>
    `${category}::${subCategory}::${slugify(label)}`;

export const formatLevels = (data: PostConceptBody): ProgressionLevel[] =>
    [data.levelOne, data.levelTwo, data.levelThree, data.levelFour, data.levelFive].filter((level): level is ProgressionLevel => level !== null);

export const createCandidate = (data: PostConceptBody): Candidate => {
    const slug = createCandidateSlug(data.category, data.subCategory, data.name);
    const levels = formatLevels(data);

    return {
        category: data.category,
        subCategory: data.subCategory,
        slug,
        name: data.name,
        weight: data.weight || CANDIDATE_DEFAULT_WEIGHT,
        description: data.description,
        logic: data.logic,
        appeal: data.appeal,
        examples: data.examples,
        aliases: data.aliases || [],
        notes: data.notes,
        levels,
    };
};

export const toEmbeddingString = (candidate: Candidate): string => {
    const category = candidate.category.toLowerCase();
    const sub = candidate.subCategory.toLowerCase();
    const label = candidate.name.toLowerCase();
    const description = candidate.description.toLowerCase()

    const cleanSub = label.includes(sub) ? "" : ` ${sub}`;

    const logic = candidate.logic ? ` | Logic: ${candidate.logic}` : '';
    const appeal = candidate.appeal ? ` | Appeal: ${candidate.appeal}` : '';
    const examples = candidate.examples && candidate.examples.length > 0 ? ` | Examples: ${candidate.examples}` : '';

    const base = `${category}${cleanSub} | ${label}: ${description}${logic}${appeal}${examples}`;

    return base.replace(/\s+/g, ' ').trim();
};

export const determineRelationships = (
    newConceptId: number,
    subCategory: string,
    peers: PeerResult[]
) => {
    const { CONFLICT, EDGE, FALLBACK } = AI_CONFIG.THRESHOLDS;

    const conflicts: Prisma.ConceptConflictCreateManyInput[] = peers
        .filter(p => p.subCategory === subCategory && (1 - p.distance) <= CONFLICT)
        .sort((a, b) => b.distance - a.distance)
        .slice(0, 12)
        .map(peer => ({
            conceptAId: newConceptId,
            conceptBId: peer.id,
            reason: `Similarity: ${(1 - peer.distance).toFixed(4)}`,
            source: 'MATHEMATICAL'
        }));

    let potentialEdges = peers.filter(p => (1 - p.distance) >= EDGE);

    if (potentialEdges.length === 0) {
        potentialEdges = peers.filter(p => (1 - p.distance) >= FALLBACK);
    }

    const edges: Prisma.ConceptEdgeCreateManyInput[] = potentialEdges
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10)
        .map(peer => ({
            sourceConceptId: newConceptId,
            targetConceptId: peer.id,
            weight: 1 - peer.distance,
        }));

    return { conflicts, edges };
};
