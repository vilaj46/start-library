export class VectorMath {
    /**
     * Calculates the Cosine Similarity between two vectors.
     * Range: -1.0 (Opposite) to 1.0 (Identical). 
     * 0.0 usually means Orthogonal (Unrelated).
     */
    public static calculateCosine(a: number[], b: number[]): number {
        if (a.length !== b.length || a.length === 0) return 0;

        let dot = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        return magnitude === 0 ? 0 : dot / magnitude;
    }

    /**
     * Calculates the "Centroid" (average) of a group of vectors.
     * Used to find the 'mathematical heart' of a Concept cluster or Author's body of work.
     */
    public static calculateCentroid(vectors: number[][]): number[] | null {
        if (vectors.length === 0) return null;
        const dimensions = vectors[0].length;
        const centroid = new Array(dimensions).fill(0);

        for (const vec of vectors) {
            if (vec.length !== dimensions) {
                throw new Error(`Vector size mismatch: expected ${dimensions}, got ${vec.length}`);
            }
            for (let i = 0; i < dimensions; i++) {
                centroid[i] += vec[i];
            }
        }

        return centroid.map(val => val / vectors.length);
    }

    /**
     * Converts a numeric array to a Postgres vector string format "[1,2,3]"
     */
    public static toVectorString(vector: number[]): string {
        return `[${vector.join(',')}]`;
    }

    /**
     * Parses a Postgres vector string "[1,2,3]" into a numeric array
     */
    public static parseVectorString(vectorString: string): number[] {
        return vectorString.replace(/[\[\]]/g, '').split(',').map(Number);
    }
}
