/**
 * Configuration for the OpenLibrary ingestion engine.
 * Tuning these values affects how strictly the pipeline filters incoming data.
 */
export const QUALITY_CONFIG = {
    /**
     * Minimum and maximum title lengths to filter out malformed or overly long titles.
     */
    TITLE_MIN_LENGTH: 3,
    TITLE_MAX_LENGTH: 200,

    /**
     * Minimum description length to ensure there is enough semantic context for embedding.
     */
    DESCRIPTION_MIN_LENGTH: 50,

    /**
     * The minimum trust score required for a work to be accepted.
     * Calculated based on presence of identifiers like LCCN, OCLC, and ISBN.
     */
    MIN_TRUST_SCORE: -20,

    /**
     * Maximum number of subjects allowed for a work without any explicit narrative tags
     * before it is considered a non-narrative work (e.g. metadata-heavy non-fiction).
     */
    MAX_SUBJECTS_WITHOUT_NARRATIVE_TAG: 10,

    /**
     * Weights used to calculate the trust score of a work.
     * Identifier weights are applied if the field is present and non-empty.
     */
    TRUST_WEIGHTS: {
        IDENTIFIERS: {
            LCCN: 50,
            OCLC: 30,
            ISBN: 20,
        },
        /**
         * Dynamic subject-based weights. 
         * The engine will iterate through these and apply the weight if the keyword 
         * is found within any of the work's subjects.
         */
        SUBJECT_MAP: [
            { keyword: 'fiction', weight: 10 },
            { keyword: 'exhibitions', weight: -50 },
        ]
    }
} as const;
