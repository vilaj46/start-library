const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY ?? '';

export interface GoogleBooksResult {
    matched: boolean;
    matchScore: number;
    canonicalTitle: string;
    isbn13: string | null;
    googleBooksId: string | null;
    categories: string[];
    description: string | null;
    raw: Record<string, unknown> | null;
}

const UNMATCHED: GoogleBooksResult = {
    matched: false,
    matchScore: 0,
    canonicalTitle: '',
    isbn13: null,
    googleBooksId: null,
    categories: [],
    description: null,
    raw: null,
};

/**
 * Jaccard similarity on word sets — good enough for title comparison without
 * adding a string-distance dependency.
 */
function titleSimilarity(a: string, b: string): number {
    const clean = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const wordsA = new Set(clean(a).split(' ').filter(Boolean));
    const wordsB = new Set(clean(b).split(' ').filter(Boolean));
    if (wordsA.size === 0 && wordsB.size === 0) return 1;
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return intersection / union;
}

export class GoogleBooksClient {
    /**
     * Queries Google Books to find a canonical match for a given title + author.
     * Returns UNMATCHED (non-throwing) if the API is unreachable or no good match found.
     * Match threshold: Jaccard similarity >= 0.5 on title words.
     */
    async verifyWork(title: string, authorName: string): Promise<GoogleBooksResult> {
        const query = `intitle:${encodeURIComponent('"' + title + '"')}+inauthor:${encodeURIComponent(authorName)}`;
        const keyParam = API_KEY ? `&key=${API_KEY}` : '';
        const url = `${BASE_URL}?q=${query}&maxResults=3&langRestrict=en&printType=books${keyParam}`;

        let data: any;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 429) {
                    console.warn('⚠️  Google Books API quota exceeded — add GOOGLE_BOOKS_API_KEY to .env for a free personal quota');
                }
                return UNMATCHED;
            }
            data = await res.json();
        } catch {
            return UNMATCHED;
        }

        const items: any[] = data.items ?? [];
        if (items.length === 0) return UNMATCHED;

        // Pick the item whose title is most similar to our input
        let best: any = null;
        let bestScore = 0;

        for (const item of items) {
            const volTitle: string = item.volumeInfo?.title ?? '';
            const score = titleSimilarity(title, volTitle);
            if (score > bestScore) {
                bestScore = score;
                best = item;
            }
        }

        if (!best || bestScore < 0.5) return UNMATCHED;

        const info = best.volumeInfo ?? {};

        const isbn13 =
            (info.industryIdentifiers ?? []).find((x: any) => x.type === 'ISBN_13')
                ?.identifier ?? null;

        const categories: string[] = info.categories ?? [];

        return {
            matched: true,
            matchScore: bestScore,
            canonicalTitle: info.title ?? title,
            isbn13,
            googleBooksId: best.id ?? null,
            categories,
            description: info.description ?? null,
            raw: best as Record<string, unknown>,
        };
    }
}
