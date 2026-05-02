import { prisma } from "../src/db";
import { isQualityWork, BLACKLIST_KEYWORDS } from "../src/lib/openlibrary/utils";
import type { OpenLibraryWork } from "../src/lib/openlibrary/types";

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    
    console.log(`Starting cleanup... ${dryRun ? '[DRY RUN]' : ''}`);

    const works = await prisma.work.findMany({
        include: { 
            author: { select: { name: true } },
            workConcepts: true 
        }
    });

    console.log(`Total works in database: ${works.length}`);

    let deletedCount = 0;
    let keptCount = 0;

    for (const work of works) {
        const olWork = work.rawApiResponse as unknown as OpenLibraryWork;
        
        // Validation check
        let isValid = false;
        let reason = "";

        if (olWork) {
            isValid = isQualityWork(olWork);
            if (!isValid) reason = "Failed isQualityWork heuristics (keywords, language, or missing metadata)";
        } else {
            // Fallback for works missing rawApiResponse
            const lowerTitle = work.title.toLowerCase();
            const hasBlacklist = BLACKLIST_KEYWORDS.some(k => lowerTitle.includes(k));
            const isEnglish = !(/[^\x00-\x7F\u00C0-\u017F\u2000-\u206F\u2070-\u209F\u2200-\u22FF]/.test(work.title));
            
            isValid = work.title.length >= 3 && !hasBlacklist && isEnglish;
            if (!isValid) reason = "Manual fallback check failed (title length, blacklist, or non-Latin script)";
        }

        if (!isValid) {
            console.log(`🗑️  ${dryRun ? '[DRY]' : 'DELETING'}: "${work.title}" (Author: ${work.author.name}) - Reason: ${reason}`);
            if (!dryRun) {
                await prisma.work.delete({ where: { id: work.id } });
            }
            deletedCount++;
        } else {
            console.log(`✅  KEPT: "${work.title}" (Author: ${work.author.name})`);
            keptCount++;
        }
    }

    console.log("\n--- Summary ---");
    console.log(`Kept:    ${keptCount}`);
    console.log(`Deleted: ${deletedCount}`);
    if (dryRun) console.log("Note: This was a dry run. No records were deleted.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
