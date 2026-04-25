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