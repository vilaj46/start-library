import { OpenLibraryClient } from "../src/clients/OpenLibraryClient";

async function test() {
    const client = new OpenLibraryClient();
    const authorId = "OL23919A"; // J.K. Rowling
    
    console.log(`Fetching improved works for ${authorId}...`);
    const works = await client.fetchAuthorWorks(authorId);
    
    console.log(`Total high-quality works found: ${works.length}`);
    
    for (const work of works) {
        console.log(`✅ "${work.title}"`);
    }
}

test();
