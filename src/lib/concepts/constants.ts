import { AI_CONFIG } from "#/lib/ai/config";

export const CONCEPT_TAXONOMY = {
  narrative: [
    "perspective", "prose", "pacing", "target_audience", "trope",
    "tone", "conflict_type", "conflict_theme", "philosophy", "motif", "mood"
  ],
  world: [
    "culture_base", "biome", "social_structure", "world", "scale",
    "aesthetic", "world_scope", "power_structure", "landmark",
    "geopolitical", "chronology", "temporal_logic", "event_chronology",
    "temporal_system", "systems"
  ],
  intensity: [
    "intensity"
  ],
  content: [
    "addiction", "child_safety", "horror", "sexual", "sci_fi"
  ],
  system: [
    "access", "manifestation", "limitation", "vibe", "enchantment",
    "side_effect", "resonance", "sociology", "materiality", "source",
    "discipline", "logic", "metaphysics", "integration_mechanics"
  ],
  character: [
    "relation", "group_logic", "physique", "affiliation", "morality",
    "status", "capability", "motivation", "background", "faction",
    "cognition", "social_rank", "archetype", "origin", "alignment", "cognitive_state"
  ],
  genre: [
    "fantasy", "sci_fi", "horror", "sci_fantasy"
  ]
} as const;


export const CANDIDATE_CATEGORY_LABELS = Object.fromEntries(
  Object.keys(CONCEPT_TAXONOMY).map(k => [k.toUpperCase(), k])
) as { [K in Uppercase<keyof typeof CONCEPT_TAXONOMY>]: Lowercase<K> };

export const SUB_CATEGORY_MAP = Object.fromEntries(
  Object.entries(CONCEPT_TAXONOMY).map(([cat, subs]) => [
    cat,
    Object.fromEntries(subs.map(s => [s.toUpperCase(), s]))
  ])
) as {
    [K in keyof typeof CONCEPT_TAXONOMY]: {
      [S in (typeof CONCEPT_TAXONOMY)[K][number]as Uppercase<S>]: S
    }
  };

export const NARRATIVE_SUB_CATEGORY_LABELS = SUB_CATEGORY_MAP.narrative;
export const WORLD_SUB_CATEGORY_LABELS = SUB_CATEGORY_MAP.world;
export const INTENSITY_SUB_CATEGORY_LABELS = SUB_CATEGORY_MAP.intensity;
export const CONTENT_SUB_CATEGORY_LABELS = SUB_CATEGORY_MAP.content;
export const SYSTEMS_SUB_CATEGORY_LABELS = SUB_CATEGORY_MAP.system;
export const CHARACTER_SUB_CATEGORY_LABELS = SUB_CATEGORY_MAP.character;
export const GENRE_SUB_CATEGORY_LABELS = SUB_CATEGORY_MAP.genre;

export const SEVERITY_LABELS = {
  LOW: "low",
  MODERATE: "moderate",
  HIGH: "high",
  EXTREME: "extreme",
} as const;

export const CANDIDATE_DEFAULT_WEIGHT = 1;

export const CONCEPT_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: Object.keys(CONCEPT_TAXONOMY)
    },
    subCategory: {
      type: "string",
      maxLength: AI_CONFIG.DB_LIMITS.SUB_CATEGORY_MAX_LENGTH
    },
    slug: {
      type: "string",
      description: "A snake_case, short identifier",
      maxLength: AI_CONFIG.DB_LIMITS.SLUG_MAX_LENGTH
    },
    name: {
      type: "string",
      description: "A human-readable presentation name",
      maxLength: AI_CONFIG.DB_LIMITS.NAME_MAX_LENGTH
    },
    description: {
      type: "string",
      description: "A 1-2 sentence detailed description of the concept"
    },
    logic: {
      type: "string",
      description: "How does this concept function structurally? Rules and limitations."
    },
    appeal: {
      type: "string",
      description: "Why does an audience enjoy this? Psychological or narrative appeal."
    },
    examples: {
      type: "array",
      items: { type: "string" },
      description: "2-3 well-known media examples (books, movies, games) featuring this concept"
    },
    notes: {
      type: "string",
      description: "Optional internal notes or caveats"
    },
    levels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          rank: { type: "number" },
          label: { type: "string" }
        },
        required: ["rank", "label"]
      },
      description: "5 tiers of intensity or progression for this concept"
    },
    weight: {
      type: "number",
      description: "Always set to 1.0"
    }
  },
  required: ["category", "subCategory", "slug", "name", "description", "logic", "appeal", "examples", "levels", "weight"]
} as const;
