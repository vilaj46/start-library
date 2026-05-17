import { prisma } from '../src/db';

async function main() {
    console.log("🚀 Starting Series Stabilization...");

    // 1. Get all series with their associated works and concepts
    const seriesList = await prisma.series.findMany({
        include: {
            works: {
                include: {
                    work: {
                        include: {
                            workConcepts: {
                                include: { concept: true }
                            }
                        }
                    }
                }
            }
        }
    });

    for (const series of seriesList) {
        console.log(`\n📚 Stabilizing Series: "${series.name}"`);
        
        // Aggregate genre and world concepts by cumulative similarity
        const genreScores: Record<number, { concept: any, cumulativeSim: number }> = {};
        const worldScores: Record<number, { concept: any, cumulativeSim: number }> = {};
        const systemScores: Record<number, { concept: any, cumulativeSim: number }> = {};

        const allWorks = series.works.map(w => w.work);

        if (allWorks.length === 0) continue;

        for (const work of allWorks) {
            for (const wc of work.workConcepts) {
                if (wc.concept.category === 'genre') {
                    if (!genreScores[wc.conceptId]) genreScores[wc.conceptId] = { concept: wc.concept, cumulativeSim: 0 };
                    genreScores[wc.conceptId].cumulativeSim += wc.similarity;
                } else if (wc.concept.category === 'world') {
                    if (!worldScores[wc.conceptId]) worldScores[wc.conceptId] = { concept: wc.concept, cumulativeSim: 0 };
                    worldScores[wc.conceptId].cumulativeSim += wc.similarity;
                } else if (wc.concept.category === 'system') {
                    if (!systemScores[wc.conceptId]) systemScores[wc.conceptId] = { concept: wc.concept, cumulativeSim: 0 };
                    systemScores[wc.conceptId].cumulativeSim += wc.similarity;
                }
            }
        }

        // Determine Primary Genre and World based on highest cumulative similarity
        const pickPrimary = (scores: Record<number, { concept: any, cumulativeSim: number }>) => {
            const arr = Object.values(scores);
            if (arr.length === 0) return null;
            arr.sort((a, b) => b.cumulativeSim - a.cumulativeSim);
            return arr[0];
        };

        const primaryGenre = pickPrimary(genreScores);
        const primaryWorld = pickPrimary(worldScores);
        const primarySystem = pickPrimary(systemScores);

        if (primaryGenre) console.log(`  🎯 Primary Genre: ${primaryGenre.concept.name} (Cumulative Score: ${primaryGenre.cumulativeSim.toFixed(3)})`);
        if (primaryWorld) console.log(`  🎯 Primary World: ${primaryWorld.concept.name} (Cumulative Score: ${primaryWorld.cumulativeSim.toFixed(3)})`);
        if (primarySystem) console.log(`  🎯 Primary System: ${primarySystem.concept.name} (Cumulative Score: ${primarySystem.cumulativeSim.toFixed(3)})`);

        // Enforce on all books in the series
        for (const work of allWorks) {
            const existingToKeepIds = [];
            if (primaryGenre) existingToKeepIds.push(primaryGenre.concept.id);
            if (primaryWorld) existingToKeepIds.push(primaryWorld.concept.id);
            if (primarySystem) existingToKeepIds.push(primarySystem.concept.id);

            // Delete all existing genre, world, and system tags for this work that are NOT the primary ones
            await prisma.workConcept.deleteMany({
                where: {
                    workId: work.id,
                    concept: { category: { in: ['genre', 'world', 'system'] } },
                    conceptId: { notIn: existingToKeepIds }
                }
            });

            // Ensure the primary tags are linked (if they weren't originally linked to this specific work)
            // For similarity score, we'll assign the average similarity across the series, or just 1.0, 
            // or the original similarity if it was present. Let's use the average (cumulative / num works).
            if (primaryGenre) {
                const avgSim = primaryGenre.cumulativeSim / allWorks.length;
                await prisma.workConcept.upsert({
                    where: { workId_conceptId: { workId: work.id, conceptId: primaryGenre.concept.id } },
                    create: { workId: work.id, conceptId: primaryGenre.concept.id, similarity: avgSim },
                    update: {} // leave similarity alone if it already exists
                });
            }
            if (primaryWorld) {
                const avgSim = primaryWorld.cumulativeSim / allWorks.length;
                await prisma.workConcept.upsert({
                    where: { workId_conceptId: { workId: work.id, conceptId: primaryWorld.concept.id } },
                    create: { workId: work.id, conceptId: primaryWorld.concept.id, similarity: avgSim },
                    update: {}
                });
            }
            if (primarySystem) {
                const avgSim = primarySystem.cumulativeSim / allWorks.length;
                await prisma.workConcept.upsert({
                    where: { workId_conceptId: { workId: work.id, conceptId: primarySystem.concept.id } },
                    create: { workId: work.id, conceptId: primarySystem.concept.id, similarity: avgSim },
                    update: {}
                });
            }
            
            // Clean up missingCategories array if we just successfully added the primary tags
            let missingToRemove: string[] = [];
            if (primaryGenre) missingToRemove.push('genre');
            if (primaryWorld) missingToRemove.push('world');
            if (primarySystem) missingToRemove.push('system');
            
            if (missingToRemove.length > 0 && work.missingCategories.length > 0) {
                const newMissing = work.missingCategories.filter(cat => !missingToRemove.includes(cat));
                if (newMissing.length !== work.missingCategories.length) {
                    await prisma.work.update({
                        where: { id: work.id },
                        data: { missingCategories: newMissing }
                    });
                }
            }
        }
        console.log(`  ✅ Enforced primary tags across ${allWorks.length} books in the series.`);
    }
}

main().finally(() => prisma.$disconnect());
