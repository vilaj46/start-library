import { createFileRoute } from "@tanstack/react-router";
import { createConcept, reEdgeAllConcepts } from "#/lib/concepts/services";
import { postConceptSchema } from "#/lib/concepts/schema";

export const Route = createFileRoute('/api/concepts')({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const url = new URL(request.url)

                if (url.searchParams.has('re-edge')) {
                    await reEdgeAllConcepts()
                    return new Response(JSON.stringify({ status: 'Full library re-edging complete' }), {
                        headers: { 'Content-Type': 'application/json' },
                    })
                }

                return new Response(JSON.stringify({ message: 'Hello from the concepts API! Commands: ?re-edge' }), {
                    headers: { 'Content-Type': 'application/json' },
                })
            },
            POST: async ({ request }) => {
                try {
                    const json = await request.json();
                    const body = postConceptSchema.parse(json);
                    const newConceptId = await createConcept(body);

                    if (!newConceptId) {
                        return new Response(JSON.stringify({ 
                            message: "Concept already exists (or same slug), skipped.",
                            received: body 
                        }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        });
                    }

                    return new Response(JSON.stringify({ 
                        message: "Concept created successfully", 
                        id: newConceptId 
                    }), {
                        status: 201,
                        headers: { 'Content-Type': 'application/json' },
                    });
                } catch (error) {
                    console.error("❌ API Error:", error);
                    return new Response(JSON.stringify({ 
                        error: error instanceof Error ? error.message : "Internal Server Error" 
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
            },
        },
    },
})
