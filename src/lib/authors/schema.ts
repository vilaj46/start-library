import { z } from "zod";
import { openLibraryAuthorSchema } from "#/lib/openlibrary/schema";

export type Author = z.infer<typeof authorSchema>;
export type AuthorCreate = z.infer<typeof authorCreateSchema>;

export const authorSchema = z.object({
    id: z.number().int().positive(),
    openLibraryId: z.string().startsWith("OL"),
    name: z.string(),
    bio: z.string().nullable(),
    rawApiResponse: openLibraryAuthorSchema.optional(),
    isVerified: z.boolean().default(false),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export const authorCreateSchema = authorSchema.pick({
    openLibraryId: true,
    name: true,
    bio: true,
    rawApiResponse: true,
}).extend({
    isVerified: z.boolean().optional()
});
