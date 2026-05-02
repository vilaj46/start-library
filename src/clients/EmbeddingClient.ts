import fs from "fs";
import path from "path";

export class EmbeddingClient {
    private readonly endpoint: string;
    private readonly model: string;
    private readonly maxRetries: number = 3;
    private cache: Record<string, number[]> = {};
    private readonly cachePath: string;

    constructor(model: string = "mxbai-embed-large", port: number = 11434) {
        this.endpoint = `http://127.0.0.1:${port}/api/embeddings`;
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

    private saveCache() {
        try {
            if (!fs.existsSync(path.dirname(this.cachePath))) {
                fs.mkdirSync(path.dirname(this.cachePath), { recursive: true });
            }
            fs.writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2));
        } catch (err) {
            console.warn("⚠️ Failed to save embedding cache:", err);
        }
    }

    /**
     * Converts a string into a high-dimensional vector.
     * Includes basic retry logic for local server stability.
     */
    public async fetch(text: string, attempt: number = 1): Promise<number[]> {
        // Truncate text to avoid "context length exceeded" errors in Ollama
        // mxbai-embed-large limit is ~512 tokens. 3000 chars is a better balance for depth.
        const truncatedText = text.length > 3000 ? text.slice(0, 3000) : text;

        if (this.cache[truncatedText]) {
            return this.cache[truncatedText];
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(this.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: this.model,
                    prompt: truncatedText,
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const body = await response.text();
                throw new Error(`Ollama Error: ${response.statusText} - ${body}`);
            }

            const json = await response.json() as { embedding: number[] };
            const vector = json.embedding || [];

            if (vector.length > 0) {
                this.cache[truncatedText] = vector;
            }

            return vector;

        } catch (error) {
            const msg = error instanceof Error ? `${error.message} | cause: ${(error as any).cause?.message}` : String(error);
            console.warn(`⚠️ Ollama attempt ${attempt} error: ${msg}`);
            if (attempt < this.maxRetries) {
                console.warn(`⚠️ Ollama attempt ${attempt} failed. Retrying...`);
                // Short delay before retry
                await new Promise(res => setTimeout(res, 1000 * attempt));
                return this.fetch(text, attempt + 1);
            }

            console.error(`❌ Connection to Ollama failed after ${this.maxRetries} attempts.`);
            return [];
        }
    }

    /**
     * Batch processing helper. 
     * Even if the API is 1-by-1, this keeps the Orchestrator loop clean.
     */
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

            // this.saveCache();
            return results;
        } catch (err) {
            console.error("❌ Fatal Batch Failure:", err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            throw new Error(`Batch embedding failed: ${errorMessage}`);
        }
    }

    public toVectorString(embedding: number[]) {
        return `[${embedding.join(',')}]`;
    }
}