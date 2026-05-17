import fs from "fs";
import path from "path";
import { ollama, AI_CONFIG } from "#/lib/ai/config";

class EmbeddingClient {
    private readonly model: string;
    private readonly maxRetries: number = 3;
    private cache: Record<string, number[]> = {};
    private readonly cachePath: string;

    constructor(model: string = AI_CONFIG.EMBEDDING_MODEL) {
        this.model = model;
        this.cachePath = path.resolve(process.cwd(), "output/embeddings.cache.json");
        this.loadCache();
    }

    private loadCache() {
        if (fs.existsSync(this.cachePath)) {
            try {
                this.cache = JSON.parse(fs.readFileSync(this.cachePath, "utf-8"));
            } catch {
                this.cache = {};
            }
        }
    }

    private async fetch(text: string, attempt: number = 1): Promise<number[]> {
        const truncatedText = text.length > AI_CONFIG.EMBEDDING_CHAR_LIMIT
            ? text.slice(0, AI_CONFIG.EMBEDDING_CHAR_LIMIT)
            : text;

        if (this.cache[truncatedText]) {
            return this.cache[truncatedText];
        }

        try {
            const response = await ollama.embeddings({
                model: this.model,
                prompt: truncatedText,
            });

            const vector = response.embedding || [];

            if (vector.length > 0) {
                this.cache[truncatedText] = vector;
            }

            return vector;

        } catch (error) {
            console.warn(`⚠️ Ollama attempt ${attempt} error:`, error);
            if (attempt < this.maxRetries) {
                await new Promise(res => setTimeout(res, 1000 * attempt));
                return this.fetch(text, attempt + 1);
            }

            console.error(`❌ Connection to Ollama failed after ${this.maxRetries} attempts.`);
            return [];
        }
    }

    async fetchBatch(inputs: string[]): Promise<number[][]> {
        const results: number[][] = [];
        const CHUNK_SIZE = 5;

        try {
            for (let i = 0; i < inputs.length; i += CHUNK_SIZE) {
                const chunk = inputs.slice(i, i + CHUNK_SIZE);
                console.log(`   📦 Processing batch ${Math.floor(i / CHUNK_SIZE) + 1}...`);

                const chunkResults = await Promise.all(
                    chunk.map(text => this.fetch(text))
                );

                results.push(...chunkResults);
            }
            return results;
        } catch (err) {
            console.error("❌ Fatal Batch Failure:", err);
            throw err;
        }
    }
}

export const embeddingClient = new EmbeddingClient();
