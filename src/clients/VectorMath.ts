/**
 * VectorMath.ts
 * Shared utilities for high-dimensional vector operations.
 */
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
     * Used to find the 'mathematical heart' of a Concept cluster.
     */
    public static calculateCentroid(vectors: number[][]): number[] {
        if (vectors.length === 0) return [];
        const dimensions = vectors[0].length;
        const centroid = new Array(dimensions).fill(0);

        for (const vec of vectors) {
            for (let i = 0; i < dimensions; i++) {
                centroid[i] += vec[i];
            }
        }

        return centroid.map(val => val / vectors.length);
    }

    public static average(vectors: number[][]): number[] {
        if (vectors.length === 0) return [];

        const size = vectors[0].length;
        const avg = new Array(size).fill(0);

        for (const v of vectors) {
            for (let i = 0; i < size; i++) {
                avg[i] += v[i];
            }
        }

        return avg.map(val => val / vectors.length);
    }

}