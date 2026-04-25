import { prisma } from "#/db";
import { type Author } from "@prisma/client";
import type { OpenLibraryAuthor, OpenLibraryId } from "../openlibrary/types";
import { authorCreateSchema } from "./utils";

export const AuthorRepository = {
    async findOrCreate(data: {
        openLibraryId: OpenLibraryId;
        name: string;
        bio: string | null;
        rawApiResponse: OpenLibraryAuthor;
        isVerified?: boolean;
    }): Promise<Author> {
        const validatedData = authorCreateSchema.parse(data);

        let author = await prisma.author.findUnique({
            where: { openLibraryId: validatedData.openLibraryId }
        });

        if (!author) {
            author = await prisma.author.create({
                data: {
                    openLibraryId: validatedData.openLibraryId,
                    name: validatedData.name,
                    bio: validatedData.bio,
                    rawApiResponse: validatedData.rawApiResponse,
                    isVerified: validatedData.isVerified ?? false,
                }
            });
            console.log(`🆕 Created new Author record: ${validatedData.name} (${validatedData.openLibraryId})`);
        }

        return author;
    },

    async updateCentroid(authorId: Author['id']): Promise<number> {

        return prisma.$executeRaw`
        UPDATE authors 
        SET centroid = (
            SELECT AVG(embedding) 
            FROM works 
            WHERE author_id = ${authorId} 
              AND embedding IS NOT NULL
        ),
        updated_at = NOW()
        WHERE id = ${authorId};
    `;
    }
};
