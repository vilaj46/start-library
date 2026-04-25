import { createFileRoute } from "@tanstack/react-router";
import { processOpenLibraryAuthor } from "#/lib/openlibrary/service";

export const Route = createFileRoute('/api/authors/openlibrary')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    const body = await request.json();
                    if (!body.query) {
                        return new Response(JSON.stringify({ error: 'Missing "query" in body (author name or OL key)' }), {
                            status: 400,
                            headers: { 'Content-Type': 'application/json' },
                        });
                    }

                    const author = await processOpenLibraryAuthor(body.query);

                    return new Response(JSON.stringify({ 
                        success: true, 
                        authorId: author?.id,
                        openLibraryId: author?.openLibraryId,
                        name: author?.name
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    });
                } catch (error: any) {
                    console.error("OpenLibrary Ingestion Error:", error);
                    return new Response(JSON.stringify({ error: error.message }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
            },
        },
    },
});
