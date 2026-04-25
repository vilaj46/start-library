import { z } from "zod";
import { jsonValueSchema } from "../openlibrary/utils";
import type { OpenLibraryAuthor } from "../openlibrary/types";

/**
 * Validates a string as an OpenLibraryId (starts with 'OL')
 */
export const openLibraryIdSchema = z.string().startsWith("OL");

/**
 * Validates the raw API response from OpenLibrary for an Author
 */
export const openLibraryAuthorSchema = z.object({
    key: z.string(),
    name: z.string(),
    birth_date: z.string().optional(),
    death_date: z.string().optional(),
    bio: z.union([
        z.string(),
        z.object({
            type: z.string(),
            value: z.string()
        })
    ]).optional(),
    remote_ids: z.object({
        wikidata: z.string().optional(),
        isni: z.string().optional()
    }).optional(),
    photos: z.array(z.number()).optional()
}).catchall(jsonValueSchema); // Ensure Prisma compatibility

/**
 * Validates the input for AuthorRepository.findOrCreate
 */
export const authorCreateSchema = z.object({
    openLibraryId: z.string().startsWith("OL"), // We use string here to avoid branding issues with Prisma
    name: z.string(),
    bio: z.string().nullable(),
    rawApiResponse: openLibraryAuthorSchema,
    isVerified: z.boolean().optional()
});

/**
 * Type-safe parser for OpenLibraryAuthor
 */
export function parseOpenLibraryAuthor(data: unknown): OpenLibraryAuthor {
    return openLibraryAuthorSchema.parse(data) as OpenLibraryAuthor;
}

/**
 * Type-safe guard for OpenLibraryAuthor
 */
export function isOpenLibraryAuthor(data: unknown): data is OpenLibraryAuthor {
    return openLibraryAuthorSchema.safeParse(data).success;
}
