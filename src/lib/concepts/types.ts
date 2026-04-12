import type { Concept } from "@prisma/client";

export interface PeerResult {
    id: Concept['id'];
    distance: number;
    subCategory: string;
}

import {
    CANDIDATE_CATEGORY_LABELS,
    NARRATIVE_SUB_CATEGORY_LABELS,
    WORLD_SUB_CATEGORY_LABELS,
    INTENSITY_SUB_CATEGORY_LABELS,
    CONTENT_SUB_CATEGORY_LABELS,
    SYSTEMS_SUB_CATEGORY_LABELS,
    CHARACTER_SUB_CATEGORY_LABELS,
    GENRE_SUB_CATEGORY_LABELS,
    SEVERITY_LABELS
} from "./constants";

export type ProgressionLevel = {
    rank: number;
    label: string;
};

export type Severity = typeof SEVERITY_LABELS[keyof typeof SEVERITY_LABELS] | null;

export type PostConceptBody = Omit<Concept, "id" | "slug" | "embedding" | "updatedAt" | "levels" | "rawInput" | "metadata"> & {
    levelOne: ProgressionLevel | null;
    levelTwo: ProgressionLevel | null;
    levelThree: ProgressionLevel | null;
    levelFour: ProgressionLevel | null;
    levelFive: ProgressionLevel | null;
    weight: number;
};

export type Candidate = {
    category: Category;
    subCategory: SubCategory;
    slug: Concept["slug"];
    name: Concept["name"];
    description: Concept["description"];
    logic: Concept["logic"];
    appeal: Concept["appeal"];
    examples: Concept["examples"];
    notes: Concept["notes"];
    levels: Concept["levels"];
    weight: number;
};

export type Category = typeof CANDIDATE_CATEGORY_LABELS[keyof typeof CANDIDATE_CATEGORY_LABELS];

export type NarrativeSubCategory = typeof NARRATIVE_SUB_CATEGORY_LABELS[keyof typeof NARRATIVE_SUB_CATEGORY_LABELS];
export type WorldSubCategory = typeof WORLD_SUB_CATEGORY_LABELS[keyof typeof WORLD_SUB_CATEGORY_LABELS];
export type IntensitySubCategory = typeof INTENSITY_SUB_CATEGORY_LABELS[keyof typeof INTENSITY_SUB_CATEGORY_LABELS];
export type ContentSubCategory = typeof CONTENT_SUB_CATEGORY_LABELS[keyof typeof CONTENT_SUB_CATEGORY_LABELS];
export type SystemsSubCategory = typeof SYSTEMS_SUB_CATEGORY_LABELS[keyof typeof SYSTEMS_SUB_CATEGORY_LABELS];
export type CharacterSubCategory = typeof CHARACTER_SUB_CATEGORY_LABELS[keyof typeof CHARACTER_SUB_CATEGORY_LABELS];
export type GenreSubCategory = typeof GENRE_SUB_CATEGORY_LABELS[keyof typeof GENRE_SUB_CATEGORY_LABELS];

export type SubCategory =
    | NarrativeSubCategory
    | WorldSubCategory
    | IntensitySubCategory
    | ContentSubCategory
    | SystemsSubCategory
    | CharacterSubCategory
    | GenreSubCategory;
