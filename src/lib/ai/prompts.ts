export const PROMPTS = {
    GENERATE_CONCEPT_FOR_GAP: (title: string, description: string, categories: string, context: string[]) => `
You are a literary ontologist. 
Generate a NEW structural, narrative, or thematic concept representing the book provided.

WORK: "${title}"
DESCRIPTION: ${description}

EXISTING CONCEPTS (DO NOT DUPLICATE):
${context.join(', ')}

Available Categories: ${categories}

Rules:
- name, slug, and subCategory MUST be under 255 characters.
- Generate a comprehensive breakdown matching the schema exactly.
`,

    SUMMARIZE_WORK: (title: string, description: string, metadata: any) => `
Summarize the following book into exactly ONE sentence that captures its core narrative, thematic, and structural elements. 
Focus on tropes, setting, and the nature of the story, NOT plot points or character names.

TITLE: "${title}"
DESCRIPTION: ${description}
SUBJECTS: ${(metadata.subjects || []).slice(0, 20).join(', ')}
PLACES: ${(metadata.subjectPlaces || []).slice(0, 10).join(', ')}
TIMES: ${(metadata.subjectTimes || []).slice(0, 10).join(', ')}
PEOPLE: ${(metadata.subjectPeople || []).slice(0, 10).join(', ')}

IMPORTANT: You MUST deduce the series name (if any), volume number (if any), narrative perspective, target audience, and tone of the book.
Append them to the end of your summary like this: " Series: [Name]. Volume: [Number]. Perspective: [Type]. Target Audience: [Type]. Tone: [Type]."
If a field is unknown, omit it.

EXAMPLE OUTPUT: A young orphan discovers he has magical abilities and attends a hidden academy for wizards while being hunted by an ancient dark lord. Series: Harry Potter. Volume: 1. Perspective: Third Person Limited. Target Audience: Young Adult. Tone: Dark.
`,

    ENRICH_CONCEPT: (name: string, description: string) => `
You are an expert taxonomist and literary analyst.
I have a concept named "${name}" with a short or weak description: "${description}".
Please provide a high-quality, comprehensive 2-3 sentence description explaining what this concept is in literature and why it matters.
Return ONLY the description text, no quotes, no conversational intro.
`,

    IS_TARGET_GENRE: (title: string, description: string, subjects: string[]) => `
Analyze if the following book belongs to any of these genres: Science Fiction, Fantasy, Horror, or high-concept speculative fiction.

TITLE: "${title}"
DESCRIPTION: ${description}
SUBJECTS: ${subjects.join(', ')}

Return ONLY 'TRUE' if it belongs to these genres, or 'FALSE' if it is general fiction, non-fiction, or another unrelated genre.
`
};
