import { Ollama } from 'ollama';
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
import type { Candidate } from '../concepts/types';
import {
  CANDIDATE_CATEGORY_LABELS,
} from '../concepts/constants';

const SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: Object.values(CANDIDATE_CATEGORY_LABELS)
    },
    subCategory: {
      type: "string",
      maxLength: 255
    },
    slug: {
      type: "string",
      description: "A snake_case, short identifier",
      maxLength: 255
    },
    name: {
      type: "string",
      description: "A human-readable presentation name",
      maxLength: 255
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
};

export async function generateConceptForGap(
  workTitle: string,
  workDescription: string,
  existingConceptsContext: string[] = []
): Promise<Candidate | null> {
  const categoriesList = Object.values(CANDIDATE_CATEGORY_LABELS).join(", ");
  
  const prompt = `
You are a literary ontologist. 
Generate a NEW structural, narrative, or thematic concept representing the book provided.

WORK: "${workTitle}"
DESCRIPTION: ${workDescription}

EXISTING CONCEPTS (DO NOT DUPLICATE):
${existingConceptsContext.join(', ')}

Available Categories: ${categoriesList}

Rules:
- name, slug, and subCategory MUST be under 255 characters.
- Generate a comprehensive breakdown matching the schema exactly.
`;

  try {
    const response = await ollama.chat({
      model: 'llama3.1',
      messages: [{ role: 'user', content: prompt }],
      format: SCHEMA as any, 
      options: {
        temperature: 0.1,
        num_ctx: 4096,
      }
    });

    const content = response.message.content;
    const candidate = JSON.parse(content);

    // Strict validation of the generated object
    if (!candidate.name || !candidate.category || !candidate.subCategory || !candidate.slug || !candidate.description) {
        console.error("❌ LLM returned incomplete concept:", candidate);
        return null;
    }

    // Proactive truncation to prevent DB LengthMismatch errors
    if (candidate.name.length > 255) candidate.name = candidate.name.slice(0, 255);
    if (candidate.slug.length > 255) candidate.slug = candidate.slug.slice(0, 255);
    if (candidate.subCategory.length > 255) candidate.subCategory = candidate.subCategory.slice(0, 255);

    return candidate as Candidate;
  } catch (e) {
    console.error("❌ Generation failed:", e);
    return null;
  }
}

export async function enrichAuthorBiography(rawBio: string, authorName: string): Promise<string> {
    const prompt = `
You are an expert literary scholar and biographer.
Clean and enrich the biography for the author: "${authorName}".
Raw Biography from Database/API:
"""
${rawBio || "No biography available."}
"""
Task Instructions:
1. Clean up any raw Markdown links (e.g. convert "[Wikipedia](url)" to plain text, remove bracketed footnotes like [1] or [OBE]).
2. If the biography is messy or poorly formatted, rewrite it into a cohesive, professional 2-3 paragraph literary biography.
3. If the raw biography is empty, short, or low quality, use your broad general knowledge to construct a beautiful, informative biography. Include their major achievements, literary style, and primary contributions.
4. Output ONLY the plain text biography. Do not include introductory notes, headers, or markdown styling.
`;

    try {
        const response = await ollama.chat({
            model: 'llama3.1',
            messages: [{ role: 'user', content: prompt }],
            options: { temperature: 0.2, num_ctx: 4096 }
        });
        return response.message.content.trim();
    } catch (e) {
        console.error('❌ Bio enrichment failed:', e);
        return rawBio || '';
    }
}

export async function summarizeWork(
  title: string,
  description: string
): Promise<string> {
  const prompt = `
Summarize the following book into exactly ONE sentence that captures its core narrative, thematic, and structural elements. 
Focus on tropes, setting, and the nature of the story, NOT plot points or character names.

TITLE: "${title}"
DESCRIPTION: ${description}

EXAMPLE OUTPUT: A young orphan discovers he has magical abilities and attends a hidden academy for wizards while being hunted by an ancient dark lord.
`;

  try {
    const response = await ollama.chat({
      model: 'llama3.1',
      messages: [{ role: 'user', content: prompt }],
      options: {
        temperature: 0.1,
        num_ctx: 4096,
      }
    });

    return response.message.content.trim();
  } catch (e) {
    console.error("❌ Summarization failed:", e);
    return description.slice(0, 500); // Fallback to raw truncated description
  }
}