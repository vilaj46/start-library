import 'dotenv/config';
import { prisma } from '../src/db';
import { enrichConceptDescription } from '../src/lib/ai/utils';
import { embeddingClient } from '../src/lib/ai/embedding';
import { VectorMath } from '../src/lib/math';

const DELAY_MS = 300;

// Categories/sub-categories where embedding quality is critical and we re-enrich regardless of description length
const PRIORITY_CATEGORIES = ['world', 'intensity'];
const PRIORITY_SUBCATEGORIES = ['perspective', 'tone', 'target_audience'];

async function enrichOne(concept: any, label: string) {
    console.log(`\n  🧠 [${label}] "${concept.name}"`);
    console.log(`     Desc: "${concept.description?.slice(0, 80)}..."`);

    const expandedDescription = await enrichConceptDescription(concept.name, concept.description ?? '');

    const rawContext = [
        concept.name,
        expandedDescription,
        concept.logic,
        concept.appeal
    ].filter(Boolean).join('. ');

    const [embedding] = await embeddingClient.fetchBatch([rawContext]);
    const vectorString = VectorMath.toVectorString(embedding);

    await prisma.$executeRaw`
        UPDATE concepts
        SET description  = ${expandedDescription},
            raw_input    = ${rawContext},
            embedding    = ${vectorString}::vector,
            updated_at   = NOW()
        WHERE id = ${concept.id};
    `;

    console.log(`     ✅ "${expandedDescription.slice(0, 100)}..."`);
    await new Promise(r => setTimeout(r, DELAY_MS));
}

async function enrichConcepts() {
    // ── PASS 1: Priority re-enrichment — weak categories regardless of description length ──
    console.log('\n═══════════════════════════════════════════');
    console.log('PASS 1: Priority re-enrichment (weak categories)');
    console.log('═══════════════════════════════════════════');

    const priorityConcepts = await prisma.$queryRaw<any[]>`
        SELECT * FROM concepts
        WHERE category = ANY(${PRIORITY_CATEGORIES}::text[])
           OR sub_category = ANY(${PRIORITY_SUBCATEGORIES}::text[])
        ORDER BY category, sub_category, id ASC;
    `;

    console.log(`Found ${priorityConcepts.length} concepts to re-enrich in priority categories.\n`);
    let p1 = 0;
    for (const concept of priorityConcepts) {
        p1++;
        try {
            await enrichOne(concept, `${p1}/${priorityConcepts.length} ${concept.category}/${concept.sub_category}`);
        } catch (err) {
            console.error(`  ❌ Failed: "${concept.name}"`, err);
        }
    }

    // ── PASS 2: Sweep — any concept still with a thin description (< 150 chars) ──
    console.log('\n═══════════════════════════════════════════');
    console.log('PASS 2: Sweep — all remaining thin descriptions (< 150 chars)');
    console.log('═══════════════════════════════════════════');

    // Exclude ones we just did in pass 1 to avoid double-processing
    const thinConcepts = await prisma.$queryRaw<any[]>`
        SELECT * FROM concepts
        WHERE LENGTH(description) < 150
          AND category != ALL(${PRIORITY_CATEGORIES}::text[])
          AND sub_category != ALL(${PRIORITY_SUBCATEGORIES}::text[])
        ORDER BY id ASC;
    `;

    console.log(`Found ${thinConcepts.length} additional concepts with thin descriptions.\n`);
    let p2 = 0;
    for (const concept of thinConcepts) {
        p2++;
        try {
            await enrichOne(concept, `${p2}/${thinConcepts.length} ${concept.category}/${concept.sub_category}`);
        } catch (err) {
            console.error(`  ❌ Failed: "${concept.name}"`, err);
        }
    }

    console.log(`\n✅ Enrichment complete.`);
    console.log(`   Pass 1 (priority): ${p1} concepts`);
    console.log(`   Pass 2 (sweep):    ${p2} concepts`);
    console.log(`   Total:             ${p1 + p2} concepts`);
}

enrichConcepts().finally(() => prisma.$disconnect());
