import fs from "node:fs/promises";
import type { Category, SubCategory, PostConceptBody } from "#/lib/concepts/types";

async function ingestCSV(limit?: number) {
    const csvPath = '/Users/julian/Documents/Projects/next-fantasy-books-2/data/input.csv';
    const content = await fs.readFile(csvPath, 'utf8');
    let lines = content.split('\n').filter(l => l.trim().length > 0);

    if (limit) {
        lines = lines.slice(0, limit);
    }

    const results = [];

    for (const line of lines) {
        let cols = parseCSVRow(line);
        if (cols.length < 5) continue; // Basic validation

        let category = cols[0] as Category;
        if (category.toLowerCase() === 'systems') {
            category = 'system' as Category;
        }

        const body: PostConceptBody = {
            category: category,
            subCategory: cols[1] as SubCategory,
            name: cols[3],
            description: cols[4],
            logic: cols[5] || "",
            appeal: cols[6] || "",
            examples: cols[7] && cols[7] !== 'null' ? cols[7].split(';').map(s => s.trim()) : [],
            notes: cols[8] === 'null' ? null : cols[8],
            weight: parseFloat(cols[10]) || 1,
            levelOne: cols[11] && cols[11] !== 'null' ? { rank: 1, label: cols[11] } : null,
            levelTwo: cols[12] && cols[12] !== 'null' ? { rank: 2, label: cols[12] } : null,
            levelThree: cols[13] && cols[13] !== 'null' ? { rank: 3, label: cols[13] } : null,
            levelFour: cols[14] && cols[14] !== 'null' ? { rank: 4, label: cols[14] } : null,
            levelFive: cols[15] && cols[15] !== 'null' ? { rank: 5, label: cols[15] } : null,
        };

        try {
            const response = await fetch('http://localhost:3000/api/concepts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            results.push({ name: body.name, status: response.status, id: data.created?.[0]?.id });
        } catch (err: any) {
            results.push({ name: body.name, error: err.message });
        }
    }
    return results;
}

function parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"' && row[i + 1] === '"') {
            cur += '"';
            i++;
        } else if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(cur);
            cur = "";
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
}

// Execution block
const limit = process.argv[2] ? parseInt(process.argv[2]) : undefined;

console.log(`Starting ingestion${limit ? ` with limit ${limit}` : ''}...`);

ingestCSV(limit)
    .then(results => {
        const success = results.filter(r => !r.error && r.status === 201);
        const skipped = results.filter(r => !r.error && r.status === 200);
        const errors = results.filter(r => r.error);
        
        console.log(`Ingestion complete!`);
        console.log(`- Created: ${success.length}`);
        console.log(`- Skipped (exists): ${skipped.length}`);
        console.log(`- Errors: ${errors.length}`);
        
        if (errors.length > 0) {
            console.error('Errors encountered:');
            errors.slice(0, 5).forEach(e => console.error(`  - ${e.name}: ${e.error}`));
            if (errors.length > 5) console.error(`  ... and ${errors.length - 5} more.`);
        }
    })
    .catch(err => {
        console.error('Fatal ingestion error:', err);
        process.exit(1);
    });
