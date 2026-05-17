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
} from "#/lib/concepts/constants";

export type Severity = typeof SEVERITY_LABELS[keyof typeof SEVERITY_LABELS] | null;

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
