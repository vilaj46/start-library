import 'dotenv/config';
import { prisma } from "../src/db";
import { embeddingClient } from "../src/lib/ai/embedding";
import { summarizeWork, tagWork } from "../src/lib/ai/generator";
import { VectorMath } from "../src/lib/math";
import { AuthorRepository } from "../src/db/authors/repository";

// Usage:
//   npx tsx bin/re-enrich-works.ts                  — re-enrich all works
//   npx tsx bin/re-enrich-works.ts OL23919A         — re-enrich one author by OL id
//   npx tsx bin/re-enrich-works.ts OL23919A --dry   — preview without writing

const olId = process.argv[2]?.startsWith('OL') ? process.argv[2] : undefined;
const isDry = process.argv.includes('--dry');

async function reenrichWork(work: { id: number; title: string; description: string | null }) {
    const description = work.description || "";
    if (!description) {
        console.log(`  ⚠️  Skipping "${work.title}" — no description`);
        return false;
    }

    const thematicSummary = await summarizeWork(work.title, description);
    const tags = await tagWork(work.title, thematicSummary);

    const workText = [
        tags.narrative.length ? `Narrative: ${tags.narrative.join(', ')}.` : '',
        tags.world.length     ? `World: ${tags.world.join(', ')}.` : '',
        tags.character.length ? `Characters: ${tags.character.join(', ')}.` : '',
        tags.system.length    ? `Systems: ${tags.system.join(', ')}.` : '',
        tags.genre.length     ? `Genre: ${tags.genre.join(', ')}.` : '',
        `Description: ${description.slice(0, 500)}`,
    ].filter(Boolean).join(' ');

    const [embedding] = await embeddingClient.fetchBatch([workText]);
    if (!embedding || embedding.length === 0) {
        console.log(`  ⚠️  Skipping "${work.title}" — embedding failed`);
        return false;
    }

    const vectorString = VectorMath.toVectorString(embedding);

    if (isDry) {
        console.log(`  [dry] Summary: ${thematicSummary.slice(0, 100)}...`);
        return true;
    }

    await prisma.$executeRaw`
        UPDATE works
        SET embedding = ${vectorString}::vector(1024)
        WHERE id = ${work.id};
    `;

    // Clear old concept links and re-run two-stage matching
    await prisma.$executeRaw`DELETE FROM work_concepts WHERE work_id = ${work.id};`;

    const closestConcepts = await prisma.$queryRaw<{ id: number; name: string; category: string; similarity: number }[]>`
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

    const MIN_CONCEPTS = 3;
    const high = closestConcepts.filter(c => c.similarity >= 0.65);
    const toLink = high.length >= MIN_CONCEPTS
        ? high
        : [...high, ...closestConcepts.filter(c => c.similarity < 0.65 && c.similarity >= 0.50)]
            .slice(0, Math.max(high.length, MIN_CONCEPTS));

    const unique = [...new Map(toLink.map(c => [c.id, c])).values()];

    for (const match of unique) {
        await prisma.$executeRaw`
            INSERT INTO work_concepts (work_id, concept_id, similarity)
            VALUES (${work.id}, ${match.id}, ${match.similarity})
            ON CONFLICT DO NOTHING;
        `;
    }

    console.log(`  ✅ Linked ${unique.length} concepts: ${unique.map(c => `"${c.name}" [${c.category}]`).join(', ')}`);
    return true;
}

async function main() {
    const whereClause = olId ? { author: { openLibraryId: olId } } : {};

    const works = await prisma.work.findMany({
        where: whereClause,
        select: { id: true, title: true, description: true, author: { select: { id: true } } },
        orderBy: { id: 'asc' },
    });

    if (works.length === 0) {
        console.log(olId ? `No works found for author ${olId}` : 'No works in database');
        return;
    }

    console.log(`Re-enriching ${works.length} works${olId ? ` for ${olId}` : ''}${isDry ? ' [DRY RUN]' : ''}...\n`);

    const authorIds = new Set<number>();
    let enriched = 0;

    for (const work of works) {
        console.log(`📖 "${work.title}" (id: ${work.id})`);
        const ok = await reenrichWork(work);
        if (ok) {
            enriched++;
            authorIds.add(work.author.id);
        }
    }

    if (!isDry) {
        for (const authorId of authorIds) {
            await AuthorRepository.updateCentroid(authorId);
        }
    }

    console.log(`\nDone. ${enriched}/${works.length} works re-enriched.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
