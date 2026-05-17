-- HNSW index for fast approximate nearest-neighbour concept search.
-- m=16 (neighbours per node), ef_construction=64 (build-time search width).
-- Queries use vector_cosine_ops to match the <=> operator in service.ts.
CREATE INDEX CONCURRENTLY IF NOT EXISTS concepts_embedding_hnsw
    ON concepts
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
