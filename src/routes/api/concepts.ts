import { createFileRoute } from "@tanstack/react-router";
import { createConcept, reEdgeAllConcepts } from "#/lib/concepts/services";

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
                const body = await request.json();
                const { status, data } = await createConcept(body);

                return new Response(JSON.stringify(data), {
                    status,
                    headers: { 'Content-Type': 'application/json' },
                })
            },
        },
    },
})
