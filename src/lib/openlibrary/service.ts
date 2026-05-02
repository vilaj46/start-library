import { prisma } from "#/db";
import { EmbeddingClient } from "#/clients/EmbeddingClient";
import { OpenLibraryClient } from "#/clients/OpenLibraryClient";
import { AuthorRepository } from "../authors/repository";
import { WorkRepository } from "../works/repository";
import type { OpenLibraryId } from "./types";
import { detectSeries } from "./utils";
import { summarizeWork } from "../ai/generator";

const embeddingClient = new EmbeddingClient();

const openLibraryClient = new OpenLibraryClient();

export async function processOpenLibraryAuthor(openLibraryId: OpenLibraryId) {
    const olAuthor = await openLibraryClient.fetchAuthorById(openLibraryId);
    if (!olAuthor) {
        throw new Error(`Author not found for ud: ${openLibraryId}`);
    }

    const author = await AuthorRepository.findOrCreate({
        openLibraryId,
        name: olAuthor.name,
        bio: openLibraryClient.extractText(olAuthor.bio),
        rawApiResponse: olAuthor
    });

    const olWorks = await openLibraryClient.fetchAuthorWorks(olAuthor.key);

    for (const olWork of olWorks) {
        if (!olWork.title) continue;

        let work: any = await WorkRepository.findByTitleAndAuthor(olWork.title, author.id);

        // Only skip if the work already has 3 or more concepts (fully enriched)
        if (work && work.workConcepts.length >= 3) continue;

        const description = (typeof olWork.description === 'string'
            ? olWork.description
            : olWork.description?.value) || "";

        // Clean the "Book Vector" by using AI to summarize the noisy description into a thematic blurb.
        console.log(`🧠 Summarizing "${olWork.title}" for thematic cleaning...`);
        const thematicSummary = await summarizeWork(olWork.title, description || "No description provided.");

        const limitedSubjects = (olWork.subjects || []).slice(0, 40).join(', ');

        // The "Clean Vector" approach: Summary + Subjects.
        const workText = `Summary: ${thematicSummary}. Subjects: ${limitedSubjects}.`;
        const [workEmbedding] = await embeddingClient.fetchBatch([workText]);

        if (!workEmbedding || workEmbedding.length === 0) continue;

        const vectorString = embeddingClient.toVectorString(workEmbedding);

        const seriesInfo = detectSeries(olWork);

        // If the work record didn't exist, create it now.
        if (!work) {
            const created = await WorkRepository.createWithEmbedding(
                olWork.title,
                description,
                olWork,
                author.id,
                vectorString
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
