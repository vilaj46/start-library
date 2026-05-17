import { llmClient } from '#/lib/ai/llm';
import { PROMPTS } from '#/lib/ai/prompts';
import { candidateSchema, type Candidate } from '#/lib/concepts/schema';
import {
  CANDIDATE_CATEGORY_LABELS,
  CONCEPT_SCHEMA,
} from '#/lib/concepts/constants';
import { AI_CONFIG } from '#/lib/ai/config';
import { embeddingClient } from '#/lib/ai/embedding';
import { VectorMath } from '#/lib/math';
import type { OpenLibraryWork } from '#/lib/openlibrary/schema';

export const proposeConcept = async (
  workTitle: string,
  workDescription: string,
  existingConceptsContext: string[] = []
): Promise<Candidate | null> => {
  const categoriesList = Object.values(CANDIDATE_CATEGORY_LABELS).join(", ");

  const prompt = PROMPTS.GENERATE_CONCEPT_FOR_GAP(
    workTitle,
    workDescription,
    categoriesList,
    existingConceptsContext
  );

  try {
    const content = await llmClient.chat(prompt, { format: CONCEPT_SCHEMA });
    const rawCandidate = JSON.parse(content);

    const result = candidateSchema.safeParse(rawCandidate);

    if (!result.success) {
      return null;
    }

    const candidate = result.data;

    const { NAME_MAX_LENGTH, SLUG_MAX_LENGTH, SUB_CATEGORY_MAX_LENGTH } = AI_CONFIG.DB_LIMITS;

    if (candidate.name.length > NAME_MAX_LENGTH) candidate.name = candidate.name.slice(0, NAME_MAX_LENGTH);
    if (candidate.slug.length > SLUG_MAX_LENGTH) candidate.slug = candidate.slug.slice(0, SLUG_MAX_LENGTH);
    if (candidate.subCategory.length > SUB_CATEGORY_MAX_LENGTH) candidate.subCategory = candidate.subCategory.slice(0, SUB_CATEGORY_MAX_LENGTH);

    return candidate;
  } catch (e) {
    return null;
  }
};

export const summarizeWork = async (
  title: string,
  description: string,
  metadata: {
    subjects?: string[];
    subjectPlaces?: string[];
    subjectTimes?: string[];
    subjectPeople?: string[];
  } = {}
): Promise<{ summary: string; seriesName: string | null; seriesOrder: number | null }> => {
  const prompt = PROMPTS.SUMMARIZE_WORK(title, description, metadata);

  try {
    const content = await llmClient.chat(prompt);
    
    // Extract series info from the special markers if present
    const seriesMatch = content.match(/Series: (.*?)\./);
    const orderMatch = content.match(/Volume: (\d+)\./);
    
    // Clean the summary by removing the trailing metadata strings
    const cleanSummary = content
      .replace(/Series: (.*?)\./, '')
      .replace(/Volume: (\d+)\./, '')
      .replace(/Perspective: (.*?)\./, '')
      .replace(/Target Audience: (.*?)\./, '')
      .replace(/Tone: (.*?)\./, '')
      .trim();

    return {
      summary: cleanSummary,
      seriesName: seriesMatch ? seriesMatch[1].trim() : null,
      seriesOrder: orderMatch ? parseInt(orderMatch[1]) : null
    };
  } catch (e) {
    return {
      summary: description.slice(0, AI_CONFIG.DB_LIMITS.FALLBACK_TRUNCATE_LENGTH),
      seriesName: null,
      seriesOrder: null
    };
  }
};

export const enrichConceptDescription = async (name: string, oldDescription: string): Promise<string> => {
  const prompt = PROMPTS.ENRICH_CONCEPT(name, oldDescription);
  return await llmClient.chat(prompt);
};

export const isTargetGenre = async (
  title: string,
  description: string,
  subjects: string[] = []
): Promise<boolean> => {
  const prompt = PROMPTS.IS_TARGET_GENRE(title, description, subjects);

  try {
    const content = await llmClient.chat(prompt, { temperature: 0.0 });
    return content.toUpperCase().includes('TRUE');
  } catch (e) {
    return true;
  }
};

/**
 * Validates whether an OpenLibrary work fits our target demographic (Sci-Fi/Fantasy/Horror).
 */
export const isValidGenre = async (olWork: OpenLibraryWork, description: string): Promise<boolean> => {
  console.log(`🤖 Checking if "${olWork.title}" is in target genres...`);
  const isValid = await isTargetGenre(olWork.title, description, olWork.subjects || []);
  if (!isValid) {
    console.log(`   Skip: "${olWork.title}" (Not Sci-Fi/Fantasy/Horror)`);
  }
  return isValid;
};

/**
 * Leverages AI to clean noisy metadata and fetches a vector string embedding.
 */
export const generateWorkEmbedding = async (
  olWork: OpenLibraryWork & { _aiSeriesHint?: { name: string | null; order: number | null } }, 
  description: string
): Promise<string | null> => {
  console.log(`🧠 Summarizing "${olWork.title}" for thematic cleaning...`);
  
  const { summary, seriesName, seriesOrder } = await summarizeWork(
    olWork.title, 
    description || "No description provided.", 
    {
      subjects: olWork.subjects,
      subjectPlaces: olWork.subject_places,
      subjectTimes: olWork.subject_times,
      subjectPeople: olWork.subject_people
    }
  );

  // Store AI hints on the OpenLibrary object dynamically for downstream series processing
  olWork._aiSeriesHint = { name: seriesName, order: seriesOrder };

  const limitedSubjects = (olWork.subjects || []).slice(0, 40).join(', ');
  const workText = `Summary: ${summary}. Subjects: ${limitedSubjects}.`;
  
  const [workEmbedding] = await embeddingClient.fetchBatch([workText]);
  if (!workEmbedding || workEmbedding.length === 0) return null;

  return VectorMath.toVectorString(workEmbedding);
};
