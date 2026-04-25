export type OpenLibraryId = `OL${string}`;

export interface OpenLibraryAuthor {
    key: string;
    name: string;
    birth_date?: string;
    death_date?: string;
    bio?: string | { type: string; value: string };
    remote_ids?: {
        wikidata?: string;
        isni?: string;
    };
    photos?: number[];
}

export interface OpenLibraryWork {
    key: string;
    title: string;
    description?: string | { type: string; value: string };
    subjects?: string[];
    subject_places?: string[];
    subject_times?: string[];
    subject_people?: string[];
    authors?: Array<{
        author: { key: string };
        type: { key: string };
    }>;
    first_publish_date?: string;
    covers?: number[];
    subtitle?: string;
    lccn?: string[];
    oclc_numbers?: string[];
    isbn_10?: string[];
    isbn_13?: string[];
}