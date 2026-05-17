import { prisma } from "#/db";
import { EmbeddingClient } from "#/clients/EmbeddingClient";
import { OpenLibraryClient } from "#/clients/OpenLibraryClient";
import { GoogleBooksClient } from "#/clients/GoogleBooksClient";
import { AuthorRepository } from "../authors/repository";
import { WorkRepository } from "../works/repository";
import type { OpenLibraryId } from "./types";
import { detectSeries, isQualityWork, matchesTitleBlacklist, normalizeTitle } from "./utils";
import { enrichAuthorBiography, summarizeWork } from "../ai/generator";

const embeddingClient = new EmbeddingClient();
const openLibraryClient = new OpenLibraryClient();
const googleBooksClient = new GoogleBooksClient();

export async function processOpenLibraryAuthor(openLibraryId: OpenLibraryId) {
    const olAuthor = await openLibraryClient.fetchAuthorById(openLibraryId);
    if (!olAuthor) {
        throw new Error(`Author not found for ud: ${openLibraryId}`);
    }

    const rawBio = openLibraryClient.extractText(olAuthor.bio) || '';
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

        // Google Books verification — canonical title, ISBN, secondary genre check
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
        // Fall back to OL if Google had no match or returned no description.
        const description = (googleDescription && googleDescription.length > olDescription.length)
            ? googleDescription
            : olDescription;

        // Clean the "Book Vector" by using AI to summarize the noisy description into a thematic blurb.
        console.log(`🧠 Summarizing "${olWork.title}" for thematic cleaning...`);
        const thematicSummary = await summarizeWork(olWork.title, description || "No description provided.");

        const limitedSubjects = (olWork.subjects || []).slice(0, 40).join(', ');

        // Build embedding text: thematic summary + OL subjects + Google categories.
        // Google categories act as a standardised genre signal that steers concept matching.
        const categoriesText = googleCategories.length > 0 ? ` Genres: ${googleCategories.join(', ')}.` : '';
        const workText = `Summary: ${thematicSummary}. Subjects: ${limitedSubjects}.${categoriesText}`;
        const [workEmbedding] = await embeddingClient.fetchBatch([workText]);

        if (!workEmbedding || workEmbedding.length === 0) continue;

        const vectorString = embeddingClient.toVectorString(workEmbedding);

        // Stage 1 (Transatlantic Collapser): check if a near-identical work already exists
        // under this author by cosine similarity (catches regional title variants like
        // "Philosopher's Stone" vs "Sorcerer's Stone")
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

        // If the work record didn't exist, create it now.
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
            // Update existing work with new embedding and description to ensure semantic sync
            await WorkRepository.updateEmbedding(work.id, description, vectorString);
        }

        if (seriesInfo.name) {
            await WorkRepository.linkSeries(work.id, seriesInfo.name, seriesInfo.order);
        }

        if (!work) continue;

        // Fetch Top 8 closest concepts for semantic depth
        const closestConcepts = await prisma.$queryRaw<{ id: number, similarity: number, name: string }[]>`
            SELECT id, name, 1 - (embedding <=> ${vectorString}::vector) as similarity
            FROM concepts
            ORDER BY embedding <=> ${vectorString}::vector ASC
            LIMIT 8;
        `;

        console.log(`🔍 Top matches for "${work.title}":`, closestConcepts.slice(0, 3).map(c => `${c.name} (${c.similarity.toFixed(4)})`).join(', '));

        // Logic:
        // 1. Link all concepts with similarity > 0.65
        // 2. If the best match is < 0.75, ALSO trigger gap detection for a new specialized concept

        let bestSimilarity = 0;

        // Tier 1: Link everything >= 0.65
        const primaryMatches = closestConcepts.filter(c => c.similarity >= 0.65);

        if (primaryMatches.length > 0) {
            for (const match of primaryMatches) {
                await WorkRepository.linkConcept(work.id, match.id, match.similarity);
                console.log(`🔗 Linked Concept (T1): "${match.name}" (Sim: ${match.similarity.toFixed(3)})`);
                if (match.similarity > bestSimilarity) bestSimilarity = match.similarity;
            }
        } else {
            // Tier 2 Fallback: If no primary matches, link everything >= 0.60
            const fallbackMatches = closestConcepts.filter(c => c.similarity >= 0.60);
            for (const match of fallbackMatches) {
                await WorkRepository.linkConcept(work.id, match.id, match.similarity);
                console.log(`🔗 Linked Concept (T2 Fallback): "${match.name}" (Sim: ${match.similarity.toFixed(3)})`);
                if (match.similarity > bestSimilarity) bestSimilarity = match.similarity;
            }
        }

        // Trigger gap detection if our best existing match is weak
        /*
        if (bestSimilarity < 0.75) {
            const neighbors = await prisma.$queryRaw<any[]>`
                SELECT name, category FROM concepts
                ORDER BY embedding <=> ${vectorString}::vector ASC
                LIMIT 5;
            `;
            const neighborContextArray = neighbors.map(n => `${n.name} (${n.category})`);

            const slimDesc = description.slice(0, 1000);
            const candidate = await generateConceptForGap(olWork.title, slimDesc, neighborContextArray);

            if (candidate) {
                // Ensure critical fields exist (Llama sometimes omits or nulls them)
                candidate.slug = candidate.slug || candidate.name?.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '');

                if (!candidate.slug || !candidate.name || !candidate.category || !candidate.subCategory) {
                    console.error(`⚠️ Skipping concept generation for "${olWork.title}" - missing critical fields (slug: ${!!candidate.slug}, name: ${!!candidate.name}, cat: ${!!candidate.category}, sub: ${!!candidate.subCategory})`);
                } else {
                    // Generate the semantic embedding for the new concept itself
                    const conceptDeepContext = `${candidate.name}: ${candidate.logic} ${candidate.description} ${candidate.appeal}`;
                    const [conceptEmbedding] = await embeddingClient.fetchBatch([conceptDeepContext]);

                    if (conceptEmbedding && conceptEmbedding.length > 0) {
                        const conceptVectorString = embeddingClient.toVectorString(conceptEmbedding);
                        const levelsString = JSON.stringify(candidate.levels || []);

                        // Insert the concept (using raw SQL for vector support)
                        const result = await prisma.$queryRaw<{ id: number }[]>`
                            INSERT INTO concepts (
                                slug, name, description, category, sub_category,
                                logic, appeal, examples, embedding, raw_input,
                                levels, weight, is_verified, updated_at
                            )
                            VALUES (
                                ${candidate.slug}, ${candidate.name}, ${candidate.description}, 
                                ${candidate.category}, ${candidate.subCategory},
                                ${candidate.logic}, ${candidate.appeal}, ${candidate.examples},
                                ${conceptVectorString}::vector, 
                                ${conceptDeepContext},
                                ${levelsString}::jsonb, 
                                1.0, 
                                false,
                                NOW()
                            )
                            ON CONFLICT (slug) DO NOTHING
                            RETURNING id;
                        `;

                        if (result && result[0]) {
                            console.log(`✨ Created new specialized Concept: "${candidate.name}" (ID: ${result[0].id})`);
                            await WorkRepository.linkConcept(work.id, result[0].id, 1.0);
                        } else {
                            const existing = await prisma.concept.findUnique({ where: { slug: candidate.slug } });
                            if (existing) {
                                console.log(`🔗 Linking to existing Concept (Slug Conflict): "${existing.name}"`);
                                await WorkRepository.linkConcept(work.id, existing.id, 0.85);
                            }
                        }
                    }
                }
            }
        }
        */
    }

    await AuthorRepository.updateCentroid(author.id);


    return author;
}
