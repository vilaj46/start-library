import { prisma } from "#/db";
import { embeddingClient } from "#/lib/ai/embedding";
import { openLibraryClient } from "#/lib/openlibrary/client";
import { GoogleBooksClient } from "#/clients/GoogleBooksClient";
import { AuthorRepository } from "#/db/authors/repository";
import { WorkRepository } from "#/db/works/repository";
import type { OpenLibraryId } from "#/lib/openlibrary/schema";
import { detectSeries, extractText, isQualityWork, matchesTitleBlacklist, normalizeTitle } from "#/lib/openlibrary/utils";
import { enrichAuthorBiography, summarizeWork, tagWork } from "#/lib/ai/generator";
import { VectorMath } from "#/lib/math";

const googleBooksClient = new GoogleBooksClient();

export async function processOpenLibraryAuthor(openLibraryId: OpenLibraryId) {
    const olAuthor = await openLibraryClient.fetchAuthorById(openLibraryId);
    if (!olAuthor) {
        throw new Error(`Author not found for id: ${openLibraryId}`);
    }

    const rawBio = extractText(olAuthor.bio) || '';
    console.log(`✍️  Enriching biography for "${olAuthor.name}"...`);
    const enrichedBio = await enrichAuthorBiography(rawBio, olAuthor.name);

    const author = await AuthorRepository.findOrCreate({
        openLibraryId,
        name: olAuthor.name,
        bio: enrichedBio,
        rawApiResponse: olAuthor
    });

    const olWorks = await openLibraryClient.fetchAuthorWorks(olAuthor.key);

    for (const olWork of olWorks) {
        if (!olWork.title) continue;

        // Stage 1: Full quality + narrative filter before any DB or AI work
        const qualityCheck = isQualityWork(olWork);
        if (!qualityCheck.valid) {
            console.log(`🗑️  Skipping "${olWork.title}": ${qualityCheck.reason}`);
            continue;
        }
        if (matchesTitleBlacklist(olWork.title)) {
            console.log(`🚫 Blacklisted title skipped: "${olWork.title}"`);
            continue;
        }

        // Use normalized title for dedup so edition/format variants collapse to one record
        const normalizedTitle = normalizeTitle(olWork.title);

        // Google Books verification — canonical title, secondary genre check
        const gbResult = await googleBooksClient.verifyWork(normalizedTitle, olAuthor.name);

        let canonicalTitle = normalizedTitle;
        let googleCategories: string[] = [];
        let googleDescription: string | null = null;
        let googleRaw: Record<string, unknown> | null = null;

        if (gbResult.matched) {
            canonicalTitle = gbResult.canonicalTitle;
            googleCategories = gbResult.categories;
            googleDescription = gbResult.description;
            googleRaw = gbResult.raw;
            console.log(`📚 Google Books matched "${normalizedTitle}" → "${canonicalTitle}" (score: ${gbResult.matchScore.toFixed(2)}, categories: [${googleCategories.join(', ') || 'none'}])`);

            // Secondary genre veto: Google has categories AND they're all non-genre
            if (googleCategories.length > 0) {
                const hasGenre = googleCategories.some(c =>
                    /fantasy|horror|sci.fi|science fiction|speculative|paranormal|supernatural|magic/i.test(c)
                );
                const hasNonGenre = googleCategories.some(c =>
                    /crime|thriller|mystery|drama|contemporary|literary|detective|noir/i.test(c)
                );
                if (!hasGenre && hasNonGenre) {
                    console.log(`🚫 Google Books genre veto: "${canonicalTitle}" — [${googleCategories.join(', ')}]`);
                    continue;
                }
            }
        } else {
            console.log(`⚠️  Google Books: no match for "${normalizedTitle}" — proceeding with OL data`);
        }

        let work: any = await WorkRepository.findByTitleAndAuthor(canonicalTitle, author.id);

        // Only skip if the work already has 3 or more concepts (fully enriched)
        if (work && work.workConcepts.length >= 3) continue;

        const olDescription = (typeof olWork.description === 'string'
            ? olWork.description
            : olWork.description?.value) || "";

        // Prefer Google Books description — it's cleaner and more standardised than OL.
        const description = (googleDescription && googleDescription.length > olDescription.length)
            ? googleDescription
            : olDescription;

        console.log(`🧠 Summarizing "${olWork.title}"...`);
        const thematicSummary = await summarizeWork(olWork.title, description || "No description provided.");

        console.log(`🏷️  Tagging "${olWork.title}"...`);
        const tags = await tagWork(olWork.title, thematicSummary);

        const limitedSubjects = (olWork.subjects || []).slice(0, 40).join(', ');
        const categoriesText = googleCategories.length > 0 ? ` Genres: ${googleCategories.join(', ')}.` : '';
        const workText = [
            tags.narrative.length ? `Narrative: ${tags.narrative.join(', ')}.` : '',
            tags.world.length     ? `World: ${tags.world.join(', ')}.` : '',
            tags.character.length ? `Characters: ${tags.character.join(', ')}.` : '',
            tags.system.length    ? `Systems: ${tags.system.join(', ')}.` : '',
            tags.genre.length     ? `Genre: ${tags.genre.join(', ')}.` : '',
            `Subjects: ${limitedSubjects}.`,
            categoriesText,
        ].filter(Boolean).join(' ');
        const [workEmbedding] = await embeddingClient.fetchBatch([workText]);

        if (!workEmbedding || workEmbedding.length === 0) continue;

        const vectorString = VectorMath.toVectorString(workEmbedding);

        // Transatlantic Collapser: cosine dedup for regional title variants
        if (!work) {
            const [nearDuplicate] = await prisma.$queryRaw<{ id: number; title: string; similarity: number }[]>`
                SELECT id, title, 1 - (embedding <=> ${vectorString}::vector) AS similarity
                FROM works
                WHERE author_id = ${author.id} AND embedding IS NOT NULL
                ORDER BY embedding <=> ${vectorString}::vector ASC
                LIMIT 1;
            `;
            if (nearDuplicate && nearDuplicate.similarity > 0.94) {
                console.log(`🔀 Transatlantic duplicate detected: "${olWork.title}" ≈ "${nearDuplicate.title}" (sim: ${nearDuplicate.similarity.toFixed(4)}) — skipping`);
                continue;
            }
        }

        const seriesInfo = detectSeries(olWork);

        if (!work) {
            const created = await WorkRepository.createWithEmbedding(
                canonicalTitle,
                description,
                olWork,
                author.id,
                vectorString,
                { googleRawResponse: googleRaw }
            );
            work = { id: created.id, ...olWork };
        } else {
            await WorkRepository.updateEmbedding(work.id, description, vectorString);
        }

        if (seriesInfo.name) {
            await WorkRepository.linkSeries(work.id, seriesInfo.name, seriesInfo.order);
        }

        if (!work) continue;

        // Two-stage concept search:
        // Stage 1 — HNSW finds top 50 globally, CTE discovers the 3 strongest categories.
        // Stage 2 — Returns top 3 concepts per category (up to 9 total), ensuring coverage
        //           across narrative, world, character etc. rather than one category dominating.
        const closestConcepts = await prisma.$queryRaw<{ id: number, name: string, category: string, similarity: number }[]>`
            WITH candidate_pool AS (
                SELECT id, name, category,
                       1 - (embedding <=> ${vectorString}::vector) AS similarity
                FROM concepts
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> ${vectorString}::vector ASC
                LIMIT 50
            ),
            top_categories AS (
                SELECT category
                FROM candidate_pool
                GROUP BY category
                ORDER BY MAX(similarity) DESC
                LIMIT 3
            ),
            ranked AS (
                SELECT cp.id, cp.name, cp.category, cp.similarity,
                       ROW_NUMBER() OVER (PARTITION BY cp.category ORDER BY cp.similarity DESC) AS rn
                FROM candidate_pool cp
                INNER JOIN top_categories tc ON cp.category = tc.category
            )
            SELECT id, name, category, similarity
            FROM ranked
            WHERE rn <= 3
            ORDER BY similarity DESC;
        `;

        console.log(`🔍 Top matches for "${work.title}":`, closestConcepts.slice(0, 3).map(c => `${c.name} [${c.category}] (${c.similarity.toFixed(4)})`).join(', '));

        const primaryMatches = closestConcepts.filter(c => c.similarity >= 0.65);
        const toLink = primaryMatches.length > 0
            ? primaryMatches
            : closestConcepts.filter(c => c.similarity >= 0.60);

        for (const match of toLink) {
            await WorkRepository.linkConcept(work.id, match.id, match.similarity);
            console.log(`🔗 Linked [${match.category}] "${match.name}" (Sim: ${match.similarity.toFixed(3)})`);
        }
    }

    await AuthorRepository.updateCentroid(author.id);
    return author;
}
