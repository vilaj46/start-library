import { CANDIDATE_CATEGORY_LABELS, SUB_CATEGORY_MAP, CANDIDATE_DEFAULT_WEIGHT } from "./constants";
import type { Category, SubCategory, PostConceptBody, Candidate } from "./types";

export function createCandidateSlug(category: Category, subCategory: SubCategory, label: string) {
    return `${category}::${subCategory}::${slugify(label)}`;
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '_')
        .replace(/^-+|-+$/g, '');
};

export function isValidCategory(category: string): category is Category {
    return Object.values(CANDIDATE_CATEGORY_LABELS).includes(category as Category);
};

export function isValidSubCategory(
    category: Category,
    subCategory: string
): subCategory is SubCategory {
    const validSubs = Object.values(SUB_CATEGORY_MAP[category]);
    return validSubs.includes(subCategory as SubCategory);
};

export function createCandidate(data: PostConceptBody): Candidate {
    const category = data.category.toLowerCase();
    const subCategory = data.subCategory.toLowerCase();

    if (!isValidCategory(category)) {
        throw new Error(`Invalid Category: ${category}`);
    }

    if (!isValidSubCategory(category, subCategory)) {
        throw new Error(`Invalid SubCategory "${subCategory}" for Category "${category}"`);
    }

    const slug = createCandidateSlug(category, subCategory, data.name);

    const levels = [
        data.levelOne,
        data.levelTwo,
        data.levelThree,
        data.levelFour,
        data.levelFive,
    ].filter((level) => level !== null);

    return {
        category,
        subCategory,
        slug,
        name: data.name,
        weight: data.weight || CANDIDATE_DEFAULT_WEIGHT,
        description: data.description,
        logic: data.logic,
        appeal: data.appeal,
        examples: data.examples,
        notes: data.notes,
        levels,
    };
};

export function toEmbeddingString(candidate: Candidate): string {
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
}
