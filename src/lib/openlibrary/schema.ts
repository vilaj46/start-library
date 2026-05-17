import z from "zod";
import { jsonValueSchema } from "#/lib/schema";

export type OpenLibraryId = `OL${string}`;
export type OpenLibraryAuthor = z.infer<typeof openLibraryAuthorSchema>;
export type OpenLibraryWork = z.infer<typeof openLibraryWorkSchema>;
export type SeriesInfo = z.infer<typeof seriesInfoSchema>;

export const seriesInfoSchema = z.object({
    name: z.string().nullable(),
    order: z.number().nullable()
});

export const openLibraryIdSchema = z.string().startsWith("OL");

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
}).catchall(jsonValueSchema);

export const openLibraryWorkSchema = z.object({
    key: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.union([
        z.string(),
        z.object({
            type: z.string(),
            value: z.string()
        })
    ]).optional(),
    subjects: z.array(z.string()).optional(),
    subject_places: z.array(z.string()).optional(),
    subject_times: z.array(z.string()).optional(),
    subject_people: z.array(z.string()).optional(),
    authors: z.array(z.object({
        author: z.object({ key: z.string() }),
        type: z.object({ key: z.string() })
    })).optional(),
    first_publish_date: z.string().optional(),
    covers: z.array(z.number()).optional(),
    lccn: z.array(z.string()).optional(),
    oclc_numbers: z.array(z.string()).optional(),
    isbn_10: z.array(z.string()).optional(),
    isbn_13: z.array(z.string()).optional(),
    series: z.array(z.string()).optional(),
}).catchall(jsonValueSchema);
