import { ollama, AI_CONFIG } from "#/lib/ai/config";

class LlmClient {
    private readonly model: string;

    constructor(model: string = AI_CONFIG.SUMMARY_MODEL) {
        this.model = model;
    }

    async chat(prompt: string, options: { format?: any, temperature?: number } = {}) {
        const response = await ollama.chat({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            options: {
                ...AI_CONFIG.DEFAULT_OPTIONS,
                temperature: options.temperature ?? AI_CONFIG.DEFAULT_OPTIONS.temperature,
            },
            format: options.format
        });

        const content = response.message.content.trim();
        if (content.startsWith('"') && content.endsWith('"')) {
            return content.slice(1, -1);
        }
        return content;
    }
}

export const llmClient = new LlmClient();
