import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });


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

export async function summarizeWork(title: string, description: string): Promise<string> {
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
            options: { temperature: 0.1, num_ctx: 4096 }
        });
        return response.message.content.trim();
    } catch (e) {
        console.error('❌ Summarization failed:', e);
        return description.slice(0, 500);
    }
}
