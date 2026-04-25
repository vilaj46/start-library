import { prisma } from "#/db";
import { EmbeddingClient } from "#/clients/EmbeddingClient";
import { OpenLibraryClient } from "#/clients/OpenLibraryClient";
import { AuthorRepository } from "../authors/repository";
import { WorkRepository } from "../works/repository";
import type { OpenLibraryId } from "./types";

const embeddingClient = new EmbeddingClient();

const openLibraryClient = new OpenLibraryClient();

// 1. Data Integrity & Validation

//     Type Safety: Replace any with strict TypeScript interfaces for Open Library responses and internal models.

//     Property Guarantees: Ensure isVerified (boolean) is added to both Author and Work schemas to track manual review status.

//     Nullability: Standardize extractText to return null consistently for empty bios to simplify database inserts.

// 2. Business Logic Refinement

//     Similarity Thresholds: Lower the "best match" requirement to 0.65 and remove hardcoded "magic numbers" in favor of a CONFIG object.

//     Normalization Pipeline: Filter fetchAuthorWorks to remove non-English titles, duplicates, and study guides (like SparkNotes) before processing.

//     Gap Logic Alignment: Update generateConceptForGap to strictly follow your existing database schema (slugs, categories, sub-categories).

// 3. Architecture & Cleanup

//     Repository Pattern: Extract all prisma.$queryRaw and .create calls into AuthorRepository or ConceptRepository to isolate data access.

//     Module Extraction: Move the logic inside the for loop into a standalone processWork function to improve readability and error handling.

//     Upsert Strategy: Clarify the "Path Forward" by implementing a formal Upsert pattern—handling new authors and existing author updates through a single, predictable flow.

//     1. The "Ambiguity" Flag (Conditional Verification)

// If the AI generates a new concept but the similarity score is right on the edge (e.g., 0.74), the system should automatically flag that record for urgent review.

//     Cleanup: Add a needsReview boolean or a confidenceScore column. If the AI output is "shaky," you can sort by these in your UI to find the messiest data first.

// 2. Idempotency & Conflict Handling

// Right now, if the script crashes halfway through J.K. Rowling, running it again might re-trigger the AI for the same "gaps."

//     Cleanup: Implement Idempotency. Before calling the LLM to generate a gap, check if a concept with that specific slug or name was already created in a previous (failed) run but not yet linked.

// 3. Source Attribution (Lineage)

// Since this is all automated, you’ll eventually want to know which version of your prompt or which model version created a specific concept.

//     Cleanup: Add a metadata JSONB column to the Concept and Work tables. Store the model_name (e.g., "llama3-8b") and the api_source (Open Library). This is a lifesaver when you realize a specific model update started hallucinating.

// 4. Batch Embedding Optimization

// As we discussed, the fetchBatch call inside a loop is a major bottleneck.

//     Cleanup: Move embedding generation outside the loop. Fetch all work descriptions for the author, send one batch request to your embedding server, and then map those vectors back to the works. This can turn a 10-minute process into a 1-minute process.

// Revised Repository Pattern Structure
// Task	Goal
// Deduplication	Ensure "Harry Potter" (Hardcover) and "Harry Potter" (Paperback) don't create two "Work" records.
// Slugification Utility	Move the replace().toLowerCase() logic into a shared helper function so it's consistent across the app.
// Error Boundaries	Wrap the loop in a try/catch that logs the specific work.id that failed, so one bad AI response doesn't kill the whole author process.

// Figure out series

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

        const description = openLibraryClient.extractText(olWork.description) || "";
        const limitedSubjects = (olWork.subjects || []).slice(0, 10).join(', ');

        // Use title as fallback if description is missing. Client handles long truncation.
        const workText = `${olWork.title}. ${description || "No description provided."}. Subjects: ${limitedSubjects}`;
        const [workEmbedding] = await embeddingClient.fetchBatch([workText]);

        if (!workEmbedding || workEmbedding.length === 0) continue;

        const vectorString = embeddingClient.toVectorString(workEmbedding);

        // If the work record didn't exist, create it now.
        if (!work) {
            work = await WorkRepository.createWithEmbedding(olWork.title, description, olWork, author.id, vectorString);
        }

        if (!work) continue;

        // Fetch Top 3 closest concepts for semantic depth
        const closestConcepts = await prisma.$queryRaw<{ id: number, similarity: number, name: string }[]>`
            SELECT id, name, 1 - (embedding <=> ${vectorString}::vector) as similarity
            FROM concepts
            ORDER BY embedding <=> ${vectorString}::vector ASC
            LIMIT 3;
        `;

        // Logic:
        // 1. Link all concepts with similarity > 0.65
        // 2. If the best match is < 0.75, ALSO trigger gap detection for a new specialized concept

        let bestSimilarity = 0;
        let linkedAny = false;

        for (const closest of closestConcepts) {
            if (closest.similarity > bestSimilarity) bestSimilarity = closest.similarity;

            if (closest.similarity >= 0.65) {
                await WorkRepository.linkConcept(work.id, closest.id, closest.similarity);
                console.log(`🔗 Linked existing Concept: "${closest.name}" (Sim: ${closest.similarity.toFixed(3)})`);
                linkedAny = true;
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
