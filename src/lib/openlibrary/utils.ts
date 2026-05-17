import { z } from "zod";
import type { OpenLibraryId, OpenLibraryWork } from "./types";

/**
 * Validates a string as an OpenLibraryId (starts with 'OL')
 */
export const openLibraryIdSchema = z.string().startsWith("OL");

export function isOpenLibraryId(id: unknown): id is OpenLibraryId {
    return openLibraryIdSchema.safeParse(id).success;
}

/**
 * Validates a value is compatible with JSON storage
 */
export const jsonValueSchema: z.ZodType<any> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(jsonValueSchema),
        z.record(z.string(), jsonValueSchema),
    ])
);

/**
 * Validates the raw API response from OpenLibrary for a Work
 */
export const openLibraryWorkSchema = z.object({
    key: z.string(),
    title: z.string(),
    description: z.union([
        z.string(),
        z.object({
            type: z.string(),
            value: z.string()
        })
    ]).optional(),
    subjects: z.array(z.string()).optional(),
}).catchall(jsonValueSchema);

import { franc } from 'franc';

export function isOpenLibraryWork(obj: unknown): obj is OpenLibraryWork {
    return openLibraryWorkSchema.safeParse(obj).success;
}

export const BLACKLIST_KEYWORDS = [
    'sparknotes', 'cliffnotes', "cliff's notes", 'summary of', 'study guide',
    'workbook', 'analysis of', 'audiobook', 'audio cd', 'cassette',
    'large print', 'library binding', 'box set', 'complete set', 'collection',
    'omnibus', 'bundle', 'anthology', 'series', 'selected works', 'works of',
    'the works of', 'journal', 'diary', 'notebook', 'pop-up', 'gallery of',
    'coloring book', 'activity book', 'sticker book', 'schoolbooks'
];

export const BLACKLIST_TITLE_PATTERNS = [
    /\bcolou?ring\b/i,
    /\btrivia\b/i,
    /\bactivity book\b/i,
    /\bposter book\b/i,
    /\bsticker book\b/i,
    /\bjournal\b/i,
    /\bnotebook\b/i,
    /\bcookbook\b/i,
    /\bstudy guide\b/i,
    /\bcompanion guide\b/i,
    /\bcalendar\b/i,
    /\bscreenplay\b/i,
    /\bfilm script\b/i,
    /\bpop.?up\b/i,
    /\bschoolbook/i,
];

export function matchesTitleBlacklist(title: string): boolean {
    return BLACKLIST_TITLE_PATTERNS.some(pattern => pattern.test(title));
}

/**
 * Strips ALL parenthetical/bracketed noise and edition qualifiers for dedup keying.
 * Used only for DB lookup — never stored as the display title.
 */
export function normalizeTitle(title: string): string {
    return title
        .replace(/\s*\(.*?\)/g, ' ')       // strip ALL parenthetical content e.g. (Full-Cast Edition)
        .replace(/\s*\[.*?\]/g, ' ')       // strip all bracketed content e.g. [Illustrated]
        .replace(/\s+vol(\.?)\s*\d+/i, ' ')
        .replace(/\s+\d+\/\d+\s*/g, ' ')   // split volumes e.g. 1/2
        .replace(/_+/g, ' ')               // underscore subtitle separators e.g. Title_Subtitle
        .replace(/\s+/g, ' ')
        .replace(/[:.,!?;]+$/, '')
        .trim();
}

export function isGoodForOntology(work: OpenLibraryWork): { valid: boolean; reason?: string } {
    const title = work.title?.toLowerCase() || "";
    const subtitle = work.subtitle?.toLowerCase() || "";
    
    // 1. Check for "Container" keywords
    const junkPatterns = [
        /box set/i, /complete set/i, /collection/i, /omnibus/i,
        /bundle/i, /library/i, /anthology/i, /series/i,
        /schoolbook/i, /pop.?up/i,
    ];

    if (junkPatterns.some(p => p.test(title) || p.test(subtitle))) {
        return { valid: false, reason: "Container/Box-Set detected" };
    }

    // 2. Author Count check (Compilations are often noisy, but 3 is common for collaborations)
    if ((work.authors?.length || 0) > 3) {
        return { valid: false, reason: "Multi-author compilation (> 3)" };
    }

    // 3. Subject Breadth
    const subjects = work.subjects || [];
    if (subjects.length > 0) {
        const specificSubjects = subjects.filter((s: string) => 
            !s.toLowerCase().includes("fiction") && 
            !s.toLowerCase().includes("stories")
        );
        // If all subjects are just "Fiction" or "Stories", it's too vague
        if (specificSubjects.length === 0) {
            return { valid: false, reason: "Generic subjects only" };
        }
    }

    return { valid: true };
}

export function isNarrativeWork(work: OpenLibraryWork): { isNarrative: boolean; reason?: string } {
    const subjects = (work.subjects || []).map((s: string) => s.toLowerCase());
    const title = (work.title || "").toLowerCase();

    // 1. Definite Non-Fiction/Ancillary Keywords
    const blacklistedTags = [
        'exhibition', 'catalog', 'miscellanea', 'history and criticism',
        'juvenile nonfiction', 'study guide', 'sparknotes', 'bibliography',
        'companion', 'handbook', 'almanac', 'biography',
        'screenplay', 'film script', 'script',
    ];

    if (subjects.some(s => blacklistedTags.some(tag => s.includes(tag)))) {
        return { isNarrative: false, reason: "Ancillary/Non-fiction tags detected" };
    }

    // 2. Non-Narrative Title Patterns
    const nonNarrativeTitlePatterns = [
        /history of magic/i,
        /the world of/i,
        /companion to/i,
        /guide to/i,
        /official handbook/i,
        /original screenplay/i,
        /the screenplay/i,
        /pop.?up/i,
    ];

    if (nonNarrativeTitlePatterns.some(pattern => pattern.test(title))) {
        return { isNarrative: false, reason: "Companion/format title pattern detected" };
    }

    // 3. Halo Effect guard — reject if subjects actively signal non-genre fiction with no genre signal
    const GENRE_SIGNALS = [
        'fantasy', 'science fiction', 'sci-fi', 'horror', 'magic', 'wizard',
        'witch', 'supernatural', 'dystopia', 'speculative', 'paranormal', 'mythic',
    ];
    const NON_GENRE_SIGNALS = [
        'detective', 'mystery', 'crime fiction', 'thriller', 'drama',
        'contemporary fiction', 'political fiction', 'literary fiction', 'realism',
        'domestic fiction', 'social fiction',
        'city council', 'local elections', 'city and town life', 'village life',
        'private investigator', 'private detective', 'noir',
    ];
    const hasGenreSignal = subjects.some(s => GENRE_SIGNALS.some(g => s.includes(g)));
    const hasNonGenreSignal = subjects.some(s => NON_GENRE_SIGNALS.some(g => s.includes(g)));
    if (!hasGenreSignal && hasNonGenreSignal && subjects.length >= 1) {
        return { isNarrative: false, reason: "Halo effect — non-genre signals present, no fantasy/sci-fi/horror signal" };
    }

    // 4. Subject Density Check
    const isFiction = subjects.some(s => s.includes('fiction') || s.includes('novel') || s.includes('stories'));
    if (!isFiction && subjects.length > 5) {
        return { isNarrative: false, reason: "High metadata density without 'fiction' tag" };
    }

    return { isNarrative: true };
}

export function isEnglish(text: string): boolean {
    if (!text || text.length < 20) return true; // Too short to judge, assume OK or skip
    const langCode = franc(text); 
    return langCode === 'eng';
}

export function getTrustScore(work: OpenLibraryWork): number {
    let score = 0;

    // 1. Check for Identifiers (High Trust)
    if (work.lccn && work.lccn.length > 0) score += 50;
    if (work.oclc_numbers && work.oclc_numbers.length > 0) score += 30;
    if (work.isbn_13 || work.isbn_10) score += 20;

    // 2. Check for 'Good' Subjects vs 'Bad' Subjects
    const subjects = (work.subjects || []).map((s: string) => s.toLowerCase());
    if (subjects.includes('fiction')) score += 10;
    if (subjects.includes('exhibitions')) score -= 50; // Immediate penalty

    return score;
}

/**
 * High-precision check to determine if a work should be ingested.
 */
export function isQualityWork(work: OpenLibraryWork): { valid: boolean; reason?: string } {
    const title = work.title || "";
    if (title.length < 3 || title.length > 200) {
        return { valid: false, reason: "Invalid title length" };
    }

    // Latin script check (Initial coarse filter)
    const nonLatinRegex = /[^\x00-\x7F\u00C0-\u017F\u2000-\u206F\u2070-\u209F\u2200-\u22FF]/;
    if (nonLatinRegex.test(title)) return { valid: false, reason: "Non-Latin script title" };

    // BLACKLIST_KEYWORDS check on title
    const titleLower = title.toLowerCase();
    const hitKeyword = BLACKLIST_KEYWORDS.find(kw => titleLower.includes(kw));
    if (hitKeyword) return { valid: false, reason: `Blacklisted keyword in title: "${hitKeyword}"` };

    const ontologyResult = isGoodForOntology(work);
    if (!ontologyResult.valid) return ontologyResult;

    const narrativeResult = isNarrativeWork(work);
    if (!narrativeResult.isNarrative) {
        return { valid: false, reason: narrativeResult.reason };
    }

    const description = typeof work.description === 'string' 
        ? work.description 
        : work.description?.value || "";

    // 6. Split-volume detection in description
    if (/part \d+ of \d+/i.test(description)) {
        return { valid: false, reason: "Split-volume description detected" };
    }

    if (description.length < 80) {
        return { valid: false, reason: "Description too short (< 80 chars)" };
    }

    if (!isEnglish(description)) {
        return { valid: false, reason: "Non-English description detected" };
    }

    if (getTrustScore(work) < -20) {
        return { valid: false, reason: "Trust score too low" };
    }

    return { valid: true };
}

/**
 * Attempts to extract series name and order from work metadata.
 */
export function detectSeries(work: OpenLibraryWork): { name: string | null; order: number | null } {
    // 1. Check explicit series field from OpenLibrary
    if (work.series && work.series.length > 0) {
        const seriesStr = work.series[0];
        if (typeof seriesStr === 'string') {
            const match = seriesStr.match(/^(.*?)(?:,?\s*#?(\d+))?$/);
            if (match) {
                return { 
                    name: match[1].trim(), 
                    order: match[2] ? parseInt(match[2]) : null 
                };
            }
        }
    }

    // 2. Heuristic for Harry Potter
    const title = work.title || "";
    if (/harry potter/i.test(title)) {
        const volMatch = title.match(/#(\d+)/) || title.match(/book\s+(\d+)/i);
        return { 
            name: "Harry Potter", 
            order: volMatch ? parseInt(volMatch[1]) : null 
        };
    }

    // 3. Heuristic for Cormoran Strike
    const subjects = (work.subjects || []).map(s => s.toLowerCase());
    if (subjects.some(s => s.includes("cormoran strike")) || /cormoran strike/i.test(title)) {
        return { name: "Cormoran Strike", order: null };
    }

    return { name: null, order: null };
}
