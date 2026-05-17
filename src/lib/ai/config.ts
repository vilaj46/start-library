import { Ollama } from 'ollama';

export const AI_CONFIG = {
    OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    
    // Models
    EMBEDDING_MODEL: "mxbai-embed-large",
    SUMMARY_MODEL: "llama3.1",
    
    // Limits
    EMBEDDING_CHAR_LIMIT: 3000,
    REQUEST_TIMEOUT_MS: 30000,
    
    THRESHOLDS: {
        CONFLICT: 0.45,
        EDGE: 0.65,
        FALLBACK: 0.60,
        CONCEPT_MATCH: 0.635,
        MULTI_LINK_DELTA: 0.015,
    },
    
    DEFAULT_OPTIONS: {
        temperature: 0.1,
        num_ctx: 4096,
    },
    
    DB_LIMITS: {
        NAME_MAX_LENGTH: 255,
        SLUG_MAX_LENGTH: 255,
        SUB_CATEGORY_MAX_LENGTH: 255,
        FALLBACK_TRUNCATE_LENGTH: 500,
        MIN_DESCRIPTION_LENGTH: 10,
        MIN_LOGIC_LENGTH: 10,
    }
};

export const ollama = new Ollama({ host: AI_CONFIG.OLLAMA_HOST });
