export const CONFLICT_THRESHOLD = 0.45;
export const EDGE_THRESHOLD = 0.65;
export const FALLBACK_THRESHOLD = 0.60;

export const CANDIDATE_CATEGORY_LABELS = {
    NARRATIVE: "narrative",
    WORLD: "world",
    INTENSITY: "intensity",
    CONTENT: "content",
    SYSTEM: "system",
    CHARACTER: "character",
    GENRE: "genre"
} as const;

export const NARRATIVE_SUB_CATEGORY_LABELS = {
    PERSPECTIVE: "perspective",
    PROSE: "prose",
    PACING: "pacing",
    TARGET_AUDIENCE: "target_audience",
    TROPE: "trope",
    TONE: "tone",
    CONFLICT_TYPE: "conflict_type",
    CONFLICT_THEME: "conflict_theme",
    PHILOSOPHY: "philosophy",
    MOTIF: "motif",
    MOOD: "mood"
} as const;

export const WORLD_SUB_CATEGORY_LABELS = {
    CULTURE_BASE: "culture_base",
    BIOME: "biome",
    SOCIAL_STRUCTURE: "social_structure",
    WORLD: "world",
    SCALE: "scale",
    AESTHETIC: "aesthetic",
    WORLD_SCOPE: "world_scope",
    POWER_STRUCTURE: "power_structure",
    LANDMARK: "landmark",
    GEOPOLITICAL: "geopolitical",
    CHRONOLOGY: "chronology",
    TEMPORAL_LOGIC: "temporal_logic",
    EVENT_CHRONOLOGY: "event_chronology",
    TEMPORAL_SYSTEM: "temporal_system",
    SYSTEMS: "systems",
} as const;

export const INTENSITY_SUB_CATEGORY_LABELS = {
    INTENSITY: "intensity",
} as const;

export const CONTENT_SUB_CATEGORY_LABELS = {
    ADDICTION: "addiction",
    CHILD_SAFETY: "child_safety",
    HORROR: "horror",
    SEXUAL: "sexual",
    SCI_FI: "sci_fi",
} as const;

export const SYSTEMS_SUB_CATEGORY_LABELS = {
    ACCESS: "access",
    MANIFESTATION: "manifestation",
    LIMITATION: "limitation",
    VIBE: "vibe",
    ENCHANTMENT: "enchantment",
    SIDE_EFFECT: "side_effect",
    RESONANCE: "resonance",
    SOCIOLOGY: "sociology",
    MATERIALITY: "materiality",
    SOURCE: "source",
    DISCIPLINE: "discipline",
    LOGIC: "logic",
    METAPHYSICS: "metaphysics",
    INTEGRATION_MECHANICS: "integration_mechanics",
} as const;

export const CHARACTER_SUB_CATEGORY_LABELS = {
    RELATION: "relation",
    GROUP_LOGIC: "group_logic",
    PHYSIQUE: "physique",
    AFFILIATION: "affiliation",
    MORALITY: "morality",
    STATUS: "status",
    CAPABILITY: "capability",
    MOTIVATION: "motivation",
    BACKGROUND: "background",
    FACTION: "faction",
    COGNITION: "cognition",
    SOCIAL_RANK: "social_rank",
    ARCHETYPE: "archetype",
    ORIGIN: "origin",
    ALIGNMENT: "alignment",
    COGNITIVE_STATE: "cognitive_state",
} as const;

export const GENRE_SUB_CATEGORY_LABELS = {
    FANTASY: "fantasy",
    SCI_FI: "sci_fi",
    HORROR: "horror",
    SCI_FANTASY: "sci_fantasy",
} as const;

export const SUB_CATEGORY_MAP = {
    [CANDIDATE_CATEGORY_LABELS.NARRATIVE]: NARRATIVE_SUB_CATEGORY_LABELS,
    [CANDIDATE_CATEGORY_LABELS.WORLD]: WORLD_SUB_CATEGORY_LABELS,
    [CANDIDATE_CATEGORY_LABELS.INTENSITY]: INTENSITY_SUB_CATEGORY_LABELS,
    [CANDIDATE_CATEGORY_LABELS.CONTENT]: CONTENT_SUB_CATEGORY_LABELS,
    [CANDIDATE_CATEGORY_LABELS.SYSTEM]: SYSTEMS_SUB_CATEGORY_LABELS,
    [CANDIDATE_CATEGORY_LABELS.CHARACTER]: CHARACTER_SUB_CATEGORY_LABELS,
    [CANDIDATE_CATEGORY_LABELS.GENRE]: GENRE_SUB_CATEGORY_LABELS,
} as const;

export const SEVERITY_LABELS = {
    LOW: "low",
    MODERATE: "moderate",
    HIGH: "high",
    EXTREME: "extreme",
} as const;

export const CANDIDATE_DEFAULT_WEIGHT = 1;
