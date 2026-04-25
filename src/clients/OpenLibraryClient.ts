import type { OpenLibraryAuthor, OpenLibraryId, OpenLibraryWork } from "#/lib/openlibrary/types";
import { isQualityWork, isOpenLibraryId, normalizeTitle } from "#/lib/openlibrary/utils";


export class OpenLibraryClient {
    private readonly baseUrl = 'https://openlibrary.org';

    extractId = (keyOrPath: string): OpenLibraryId | null => {
        const match = keyOrPath.match(/OL\d+[A-Z]?/i);
        const id = match ? match[0].toUpperCase() : null;
        return isOpenLibraryId(id) ? id : null;
    };

    fetchAuthorById = async (id: OpenLibraryId): Promise<OpenLibraryAuthor | null> => {
        const res = await fetch(`${this.baseUrl}/authors/${id}.json`);
        if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error(`OpenLibrary Author API Error: ${res.statusText}`);
        }
        return res.json();
    };

    fetchAuthorWorks = async (authorKey: string): Promise<OpenLibraryWork[]> => {
        const id = this.extractId(authorKey);
        if (!id) throw new Error(`Invalid Author Key: ${authorKey}`);

        let allEntries: OpenLibraryWork[] = [];
        let offset = 0;
        const limit = 100;
        let total = 0;

        try {
            do {
                const res = await fetch(`${this.baseUrl}/authors/${id}/works.json?limit=${limit}&offset=${offset}`);
                if (!res.ok) break;
                const data = await res.json();
                const entries = data.entries || [];
                if (entries.length === 0) break;
                
                allEntries = allEntries.concat(entries);
                total = data.size || 0;
                offset += limit;
            } while (offset < total && offset < 500); // Safety cap at 500 works to avoid infinite loops or excessive API calls
        } catch (error) {
            console.error(`Error fetching paginated works for ${authorKey}:`, error);
        }

        const worksMap = new Map<string, OpenLibraryWork & { _score: number }>();
        
        for (const work of allEntries) {
            const quality = isQualityWork(work);
            if (!quality.valid) {
                console.log(`🗑️  Skipping "${work.title}": ${quality.reason}`);
                continue;
            }
            
            const normalizedTitle = normalizeTitle(work.title);
            const titleKey = normalizedTitle.toLowerCase();
            
            // Score based on metadata quality
            const hasDesc = !!work.description;
            const subjectsCount = (work.subjects || []).length;
            const score = (hasDesc ? 100 : 0) + subjectsCount;
            
            const existing = worksMap.get(titleKey);
            if (!existing || score > existing._score) {
                worksMap.set(titleKey, { 
                    ...work, 
                    title: normalizedTitle,
                    _score: score 
                });
            }
        }

        // Return cleaned up works, removing the internal score
        return Array.from(worksMap.values()).map(({ _score, ...work }) => work);
    };

    extractText = (field?: string | { value: string }): string => {
        if (!field) return "";
        return typeof field === 'string' ? field : field.value;
    };
}