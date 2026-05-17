import { z } from "zod";
import { CANDIDATE_CATEGORY_LABELS, CONCEPT_TAXONOMY } from "#/lib/concepts/constants";
import { AI_CONFIG } from "#/lib/ai/config";

import { type Category, type SubCategory } from "#/lib/concepts/types";

export type Candidate = z.infer<typeof candidateSchema>;
export type PostConceptBody = z.infer<typeof postConceptSchema>;
export type ProgressionLevel = z.infer<typeof progressionLevelSchema>;

export const progressionLevelSchema = z.object({
    rank: z.number(),
    label: z.string()
});

const {
    NAME_MAX_LENGTH,
    SLUG_MAX_LENGTH,
    SUB_CATEGORY_MAX_LENGTH,
    MIN_DESCRIPTION_LENGTH,
    MIN_LOGIC_LENGTH
} = AI_CONFIG.DB_LIMITS;

export const candidateSchema = z.object({
    category: z.nativeEnum(CANDIDATE_CATEGORY_LABELS),
    subCategory: z.string().min(1).max(SUB_CATEGORY_MAX_LENGTH),
    slug: z.string().min(1).max(SLUG_MAX_LENGTH),
    name: z.string().min(1).max(NAME_MAX_LENGTH),
    description: z.string().min(MIN_DESCRIPTION_LENGTH),
    logic: z.string().min(MIN_LOGIC_LENGTH),
    appeal: z.string().min(MIN_LOGIC_LENGTH),
    examples: z.array(z.string()).min(1),
    aliases: z.array(z.string()).optional(),
    notes: z.string().optional().nullable(),
    levels: z.array(progressionLevelSchema).length(5),
    weight: z.number().default(1)
});

export const postConceptSchema = z.object({
    name: z.string().min(1).max(NAME_MAX_LENGTH),
    category: z.nativeEnum(CANDIDATE_CATEGORY_LABELS) as z.ZodType<Category>,
    subCategory: z.string().min(1) as z.ZodType<SubCategory>,
    description: z.string().min(MIN_DESCRIPTION_LENGTH),
    logic: z.string().min(MIN_LOGIC_LENGTH),
    appeal: z.string().min(MIN_LOGIC_LENGTH),
    examples: z.array(z.string()).min(1),
    levelOne: progressionLevelSchema.nullable(),
    levelTwo: progressionLevelSchema.nullable(),
    levelThree: progressionLevelSchema.nullable(),
    levelFour: progressionLevelSchema.nullable(),
    levelFive: progressionLevelSchema.nullable(),
    weight: z.number().optional().default(1),
    notes: z.string().optional().nullable(),
    aliases: z.array(z.string()).optional()
}).superRefine((data, ctx) => {
    const validSubs = (CONCEPT_TAXONOMY as any)[data.category] || [];
    if (!validSubs.includes(data.subCategory)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid sub-category "${data.subCategory}" for category "${data.category}"`,
            path: ["subCategory"]
        });
    }
});
