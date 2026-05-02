import fs from 'node:fs/promises';

const CANDIDATE_CATEGORY_LABELS = {
    NARRATIVE: "narrative",
    WORLD: "world",
    INTENSITY: "intensity",
    CONTENT: "content",
    SYSTEM: "system",
    CHARACTER: "character",
    GENRE: "genre"
} as const;

const SUB_CATEGORY_MAP: Record<string, Record<string, string>> = {
    narrative: {
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
    },
    world: {
        CULTURE_BASE: "culture_base",
        BIOME: "biome",
        SOCIAL_STRUCTURE: "social_structure",
        TECH_LEVEL: "tech_level",
        MAGIC_SYSTEM_TYPE: "magic_system_type",
        COSMOLOGY: "cosmology",
        GEOPOLITICS: "geopolitics",
        RELIGION: "religion",
        ECONOMY: "economy"
    },
    character: {
        ARCHETYPE: "archetype",
        ROLE: "role",
        MORALITY: "morality",
        DEVELOPMENT: "development",
        STATUS: "status",
        RELATIONSHIP_TYPE: "relationship_type",
        MOTIVATION: "motivation",
        FLAW: "flaw",
        GROUP_LOGIC: "group_logic",
        ALIGNMENT: "alignment"
    },
    intensity: {
        VIOLENCE: "violence",
        LANGUAGE: "language",
        MATURE_THEMES: "mature_themes",
        ROMANCE: "romance",
        STAKES: "stakes",
        TENSION: "tension"
    },
    system: {
        PROGRESSION: "progression",
        POWER_SOURCE: "power_source",
        CLASS_SYSTEM: "class_system",
        INTERFACE: "interface",
        RESOURCE_MANAGEMENT: "resource_management",
        CRAFTING: "crafting"
    },
    content: {
        CONTENT_WARNING: "content_warning",
        SPECIFIC_ELEMENT: "specific_element",
        THEME: "theme"
    },
    genre: {
        PRIMARY_GENRE: "primary_genre",
        SUB_GENRE: "sub_genre",
        FUSION: "fusion",
        SETTING_VARIANT: "setting_variant"
    }
};

function parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"' && row[i + 1] === '"') {
            cur += '"';
            i++;
        } else if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(cur);
            cur = "";
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
}

async function main() {
    const csvPath = '/Users/julian/Documents/Projects/next-fantasy-books-2/data/input.csv';
    const content = await fs.readFile(csvPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    
    let validCount = 0;
    let invalidCount = 0;
    const errors: string[] = [];

    lines.forEach((line, index) => {
        const cols = parseCSVRow(line);
        const category = cols[0]?.toLowerCase();
        const subCategory = cols[1]?.toLowerCase();

        if (!Object.values(CANDIDATE_CATEGORY_LABELS).includes(category as any)) {
            errors.push(`Line ${index + 1}: Invalid category "${category}"`);
            invalidCount++;
            return;
        }

        const validSubs = Object.values(SUB_CATEGORY_MAP[category] || {});
        if (!validSubs.includes(subCategory)) {
            errors.push(`Line ${index + 1}: Invalid subCategory "${subCategory}" for category "${category}"`);
            invalidCount++;
            return;
        }

        validCount++;
    });

    console.log(`Valid: ${validCount}`);
    console.log(`Invalid: ${invalidCount}`);
    console.log('Sample errors:', errors.slice(0, 10));
}

main();
