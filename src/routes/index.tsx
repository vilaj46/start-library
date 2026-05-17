import { createFileRoute, Link } from '@tanstack/react-router'
import { Book, Library, Sparkles, Inbox } from 'lucide-react'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">Semantic Library Engine</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Your literature, mathematically mapped.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          A state-of-the-art vector taxonomy engine. Ingest works from OpenLibrary, summarize themes with local LLMs, and map them to a dense semantic graph.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/ingest"
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            Ingest New Author
          </Link>
          <Link
            to="/curation"
            className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
          >
            Review Curation Queue
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            'Intelligent Ingestion',
            'Automatically strips out non-fantasy/sci-fi books and summarizes thematic content using Ollama.',
            <Library key="1" size={24} className="mb-3 text-[var(--lagoon-deep)]" />
          ],
          [
            'Vector Mapping',
            'Converts literature into 1,024-dimensional embeddings and measures cosine similarity across 8 categories.',
            <Sparkles key="2" size={24} className="mb-3 text-[var(--lagoon-deep)]" />
          ],
          [
            'Strict Auto-Linking',
            'Only links concepts that hit a >63.5% confidence threshold to prevent hallucinated tags.',
            <Book key="3" size={24} className="mb-3 text-[var(--lagoon-deep)]" />
          ],
          [
            'Smart Curation',
            'Logs category gaps and mathematically calculates "Near Misses" for 1-click human approval.',
            <Inbox key="4" size={24} className="mb-3 text-[var(--lagoon-deep)]" />
          ],
        ].map(([title, desc, icon], index) => (
          <article
            key={String(title)}
            className="island-shell feature-card rise-in rounded-2xl p-5"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            {icon}
            <h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
              {title}
            </h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
