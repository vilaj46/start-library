import type { OpenLibraryId, OpenLibraryWork, OpenLibraryAuthor, SeriesInfo } from "#/lib/openlibrary/schema";
import {
    openLibraryWorkSchema,
    openLibraryAuthorSchema,
    openLibraryIdSchema,
} from "#/lib/openlibrary/schema";
import {
    BLACKLIST_KEYWORDS,
    NON_NARRATIVE_TAGS,
    NON_NARRATIVE_TITLE_PATTERNS,
    CONTAINER_PATTERNS,
    NARRATIVE_KEYWORDS,
} from "#/lib/openlibrary/constants";
import { QUALITY_CONFIG } from "#/lib/openlibrary/config";
import { isEnglish, hasNonLatinScripts } from "#/lib/utils/language";

export const isOpenLibraryId = (id: unknown): id is OpenLibraryId =>
    openLibraryIdSchema.safeParse(id).success;

export const extractId = (keyOrPath: string): OpenLibraryId | null => {
    const match = keyOrPath.match(/OL\d+[A-Z]?/i);
    const id = match ? match[0].toUpperCase() : null;
    return isOpenLibraryId(id) ? id : null;
};

export const extractText = (field?: string | { value: string }): string => {
    if (!field) return "";
    return typeof field === 'string' ? field : field.value;
};

export const parseOpenLibraryAuthor = (data: unknown): OpenLibraryAuthor =>
    openLibraryAuthorSchema.parse(data);

export const isOpenLibraryAuthor = (data: unknown): data is OpenLibraryAuthor =>
    openLibraryAuthorSchema.safeParse(data).success;

export const isOpenLibraryWork = (obj: unknown): obj is OpenLibraryWork =>
    openLibraryWorkSchema.safeParse(obj).success;

export const normalizeTitle = (title: string): string =>
    title
        .replace(/\s*\(hardcover\)|\s*\(paperback\)|\s*\(edition\)/i, ' ')
        .replace(/\s+vol(\.?)\s*\d+/i, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[:.,!?;]+$/, '')
        .trim();

export const isGoodForOntology = (work: OpenLibraryWork): { valid: boolean; reason?: string } => {
    const title = work.title?.toLowerCase() || "";
    const subtitle = work.subtitle?.toLowerCase() || "";

    if (CONTAINER_PATTERNS.some(p => p.test(title) || p.test(subtitle))) {
        return { valid: false, reason: "Container/Box-Set detected" };
    }

    if (BLACKLIST_KEYWORDS.some(word => title.includes(word) || subtitle.includes(word))) {
        return { valid: false, reason: "Blacklisted keyword detected in title" };
    }

    if ((work.authors?.length || 0) > 3) {
        return { valid: false, reason: "Multi-author compilation (> 3)" };
    }

    const subjects = (work.subjects || [])
        .map((s: any) => (typeof s === 'string' ? s.toLowerCase() : ''));

    if (subjects.length > 0) {
        const hasNarrativeKeyword = subjects.some(s =>
            NARRATIVE_KEYWORDS.some(keyword => s.includes(keyword))
        );
        if (!hasNarrativeKeyword) {
            return { valid: false, reason: "Generic subjects only" };
        }
    }

    return { valid: true };
};

export const isNarrativeWork = (work: OpenLibraryWork): { isNarrative: boolean; reason?: string } => {
    const subjects = (work.subjects || [])
        .map((s: any) => (typeof s === 'string' ? s.toLowerCase() : ''));
    const title = (work.title || "").toLowerCase();

    if (subjects.some(s => NON_NARRATIVE_TAGS.some(tag => s.includes(tag)))) {
        return { isNarrative: false, reason: "Ancillary/Non-fiction tags detected" };
    }

    if (NON_NARRATIVE_TITLE_PATTERNS.some(pattern => pattern.test(title))) {
        return { isNarrative: false, reason: "Companion title pattern detected" };
    }

    const isExplicitNarrative = subjects.some(s =>
        NARRATIVE_KEYWORDS.some(keyword => s.includes(keyword))
    );

    if (!isExplicitNarrative && subjects.length > QUALITY_CONFIG.MAX_SUBJECTS_WITHOUT_NARRATIVE_TAG) {
        return { isNarrative: false, reason: "High metadata density without explicit narrative tags" };
    }

    return { isNarrative: true };
};

export const getTrustScore = (work: OpenLibraryWork): number => {
    let score = 0;
    const weights = QUALITY_CONFIG.TRUST_WEIGHTS;

    if (work.lccn && work.lccn.length > 0) score += weights.IDENTIFIERS.LCCN;
    if (work.oclc_numbers && work.oclc_numbers.length > 0) score += weights.IDENTIFIERS.OCLC;

    const hasIsbn13 = Array.isArray(work.isbn_13) && work.isbn_13.length > 0;
    const hasIsbn10 = Array.isArray(work.isbn_10) && work.isbn_10.length > 0;
    if (hasIsbn13 || hasIsbn10) score += weights.IDENTIFIERS.ISBN;

    const subjects = (work.subjects || [])
        .map((s: any) => (typeof s === 'string' ? s.toLowerCase() : ''));

    for (const rule of weights.SUBJECT_MAP) {
        if (subjects.some(s => s.includes(rule.keyword))) {
            score += rule.weight;
        }
    }

    return score;
};

export const isQualityWork = (work: OpenLibraryWork): { valid: boolean; reason?: string } => {
    const description = extractText(work.description);
    const title = work.title || "";

    if (title.length < QUALITY_CONFIG.TITLE_MIN_LENGTH || title.length > QUALITY_CONFIG.TITLE_MAX_LENGTH) {
        return { valid: false, reason: `Invalid title length (must be ${QUALITY_CONFIG.TITLE_MIN_LENGTH}-${QUALITY_CONFIG.TITLE_MAX_LENGTH})` };
    }

    if (hasNonLatinScripts(title)) return { valid: false, reason: "Non-Latin script title" };

    if (/part \d+ of \d+/i.test(title)) {
        return { valid: false, reason: "Split-volume work detected in title" };
    }

    const ontologyResult = isGoodForOntology(work);
    if (!ontologyResult.valid) return ontologyResult;

    const narrativeResult = isNarrativeWork(work);
    if (!narrativeResult.isNarrative) {
        return { valid: false, reason: narrativeResult.reason };
    }

    if (description.length > 0) {
        if (!isEnglish(description)) {
            return { valid: false, reason: "Non-English description detected" };
        }

        if (description.length < QUALITY_CONFIG.DESCRIPTION_MIN_LENGTH) {
            return { valid: false, reason: `Description too short (< ${QUALITY_CONFIG.DESCRIPTION_MIN_LENGTH} chars)` };
        }
    } else {
        return { valid: false, reason: "Missing description" };
    }

    if (getTrustScore(work) < QUALITY_CONFIG.MIN_TRUST_SCORE) {
        return { valid: false, reason: `Trust score too low (< ${QUALITY_CONFIG.MIN_TRUST_SCORE})` };
    }

    return { valid: true };
};

export const detectSeries = (work: OpenLibraryWork): SeriesInfo => {
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

    return { name: null, order: null };
};
