import { prisma } from "#/db";
import { openLibraryClient } from "#/lib/openlibrary/client";
import { AuthorRepository } from "#/db/authors/repository";
import { WorkRepository } from "#/db/works/repository";
import { WorkService } from "#/lib/works/service";
import type { OpenLibraryId } from "#/lib/openlibrary/schema";
import { extractText } from "#/lib/openlibrary/utils";
import { isValidGenre, generateWorkEmbedding } from "#/lib/ai/utils";

export async function processOpenLibraryAuthor(openLibraryId: OpenLibraryId) {
    const olAuthor = await openLibraryClient.fetchAuthorById(openLibraryId);
    if (!olAuthor) {
        throw new Error(`Author not found for id: ${openLibraryId}`);
    }

    const author = await AuthorRepository.findOrCreate({
        openLibraryId,
        name: olAuthor.name,
        bio: extractText(olAuthor.bio),
        rawApiResponse: olAuthor
    });

    const olWorks = await openLibraryClient.fetchAuthorWorks(olAuthor.key);

    for (const olWork of olWorks) {
        if (!olWork.title) continue;

        let work = await WorkRepository.findByTitleAndAuthor(olWork.title, author.id);

        if (work && work.missingCategories.length === 0) continue;

        const description = extractText(olWork.description);

        if (!(await isValidGenre(olWork, description))) continue;

        const vectorString = await generateWorkEmbedding(olWork, description);
        if (!vectorString) continue;

        const persistedWork = await WorkService.syncWorkWithEmbedding(work, olWork, description, author.id, vectorString);

        await WorkService.linkSeries(persistedWork.id, olWork);

        const currentMissingCategories = await WorkService.evaluateAndLinkConcepts(persistedWork.id, persistedWork.title, vectorString);

        if (currentMissingCategories.length > 0) {
            await prisma.work.update({
                where: { id: persistedWork.id },
                data: { missingCategories: currentMissingCategories }
            });
        }
    }

    await AuthorRepository.updateCentroid(author.id);
    return author;
}
