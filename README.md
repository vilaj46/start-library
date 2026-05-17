Semantic Library Database

An intelligent, vector-backed taxonomy engine for evaluating and categorizing literature.
👁️ Overview

Ingests works from OpenLibrary, uses local LLMs (Ollama) for thematic enrichment, and maps titles to a dense literary taxonomy across 8 primary dimensions (world, meta, character, intensity, system, genre, narrative, content) using pgvector.
✨ Core Features
Ingestion & Taxonomy Pipeline

    Multi-Dimensional Mapping: Evaluates works against the 8 core dimensions using cosine similarity with a strict 0.635 auto-link threshold.

    Gap & Near-Miss Detection: Identifies ontological gaps (missingCategories) when a book misses the threshold, and surfaces "near misses" (0.58–0.634) for manual UI curation.

    Genre-Targeted Pre-Filtering: LLM pre-flight check that immediately rejects works outside of Sci-Fi, Fantasy, and Horror to save resources.

    Series Stabilization: Computes cumulative vector probabilities across a series to resolve conflicting tags (e.g., High vs. Low Fantasy) and enforce consistency.

    Concept Enrichment: Automatically expands weak concept descriptions into dense, high-quality vector embeddings.

🚀 Roadmap

    Concept Drift Analytics: Track and plot the vector trajectory of flexible dimensions (intensity, character, content) to visualize how a series or author changes over time.

    Vector "Read-Alike" Engine: A pure mathematical recommendation feature using raw vector distance (<=>) to find books with a matching "vibe" without relying on shared tags.

    Concept Inheritance Graph: Introduce parent/child relationships to taxonomy concepts, allowing books to implicitly inherit parent tags (e.g., Hard Magic → Magic System).

    Automated Ontological Loop: Automate taxonomy growth by parsing missingCategories and tasking Ollama to generate, embed, and inject missing concepts on the fly.