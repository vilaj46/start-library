import { prisma } from "#/db";
import { type Author } from "@prisma/client";
import { authorCreateSchema, type AuthorCreate } from "#/lib/authors/schema";
import { WorkRepository } from "#/db/works/repository";
import { VectorMath } from "#/lib/math";

export const AuthorRepository = {
    async findOrCreate(data: AuthorCreate): Promise<Author> {
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
        }

        return author;
    },

    async resetCentroid(authorId: number): Promise<number> {
        return prisma.$executeRaw`
            UPDATE authors SET centroid = NULL, updated_at = NOW() WHERE id = ${authorId}
        `;
    },

    async updateCentroid(authorId: Author['id']): Promise<number> {
        const embeddings = await WorkRepository.getAuthorWorkEmbeddings(authorId);

        if (embeddings.length === 0) {
            return AuthorRepository.resetCentroid(authorId);
        }

        const centroid = VectorMath.calculateCentroid(embeddings);
        if (!centroid) return AuthorRepository.resetCentroid(authorId);

        return prisma.$executeRaw`
            UPDATE authors 
            SET centroid = ${VectorMath.toVectorString(centroid)}::vector,
                updated_at = NOW()
            WHERE id = ${authorId};
        `;
    }
};
