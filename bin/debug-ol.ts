import { OpenLibraryClient } from "../src/clients/OpenLibraryClient";

async function debug() {
    const client = new OpenLibraryClient();
    const authorId = "OL23919A";
    
    console.log(`Fetching works for ${authorId}...`);
    const res = await fetch(`https://openlibrary.org/authors/${authorId}/works.json?limit=100`);
    const data = await res.json();
    
    console.log(`Total works reported by API: ${data.size}`);
    console.log(`Works returned in this batch: ${data.entries.length}`);

    const entries = data.entries || [];
    
    for (const entry of entries) {
        const hasDesc = !!entry.description;
        const subjectsCount = (entry.subjects || []).length;
        const isQuality = hasDesc || subjectsCount >= 2;
        
        console.log(`[${isQuality ? '✅' : '❌'}] "${entry.title}" | Desc: ${!!entry.description} | Subjects: ${subjectsCount}`);
    }
}

debug();
