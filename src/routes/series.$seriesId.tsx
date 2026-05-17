import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/db'
import { Book, Sparkles, ArrowLeft, ExternalLink, Tag, User } from 'lucide-react'

const getSeriesDetails = createServerFn({
  method: 'GET',
})
  .inputValidator((seriesId: string) => parseInt(seriesId))
  .handler(async ({ data: seriesId }) => {
    const series = await prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        works: {
          include: {
            work: {
              include: {
                author: true,
                workConcepts: {
                  include: {
                    concept: true
                  },
                  orderBy: { similarity: 'desc' }
                }
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!series) throw new Error('Series not found')
    return series
  })

export const Route = createFileRoute('/series/$seriesId')({
  component: SeriesDetailPage,
  loader: async ({ params }) => await getSeriesDetails({ data: params.seriesId }),
})

function SeriesDetailPage() {
  const series = Route.useLoaderData()

  // Get unique authors in this series
  const authors = Array.from(new Set(series.works.map(ws => ws.work.author.id)))
    .map(id => series.works.find(ws => ws.work.author.id === id)?.work.author)
    .filter(Boolean)

  return (
    <main className="page-wrap px-4 py-12">
      <div className="mb-8">
        <Link
          to="/series"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink-soft)] hover:text-[var(--lagoon-deep)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Series
        </Link>
      </div>

      <header className="island-shell rise-in relative overflow-hidden rounded-[2.5rem] p-8 sm:p-12 mb-12 border border-[var(--line)]">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.2),transparent_70%)]" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)] shadow-lg">
            <Sparkles size={48} />
          </div>
          <div className="flex-1">
            <h1 className="display-title text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl mb-4">
              {series.name}
            </h1>
            
            <div className="flex flex-wrap gap-4 mb-6">
              {authors.map(author => (
                <Link 
                  key={author?.id}
                  to="/authors/$authorId"
                  params={{ authorId: author?.id.toString() || '' }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--lagoon-deep)] bg-[var(--lagoon-soft)]/30 px-3 py-1 rounded-full hover:bg-[var(--lagoon-soft)] transition-colors"
                >
                  <User size={14} />
                  {author?.name}
                </Link>
              ))}
            </div>

            {series.description && (
              <div className="prose prose-sm prose-slate max-w-none text-[var(--sea-ink-soft)] leading-relaxed bg-white/40 rounded-2xl p-6 border border-[var(--line)]">
                {series.description}
              </div>
            )}
          </div>
        </div>
      </header>

      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)]">
            <Book size={18} />
          </div>
          <h2 className="text-2xl font-bold text-[var(--sea-ink)]">Volumes</h2>
        </div>

        <div className="grid gap-8">
          {series.works.map((ws) => (
            <article 
              key={ws.work.id}
              className="island-shell group rounded-3xl p-8 border border-[var(--line)] transition-all hover:shadow-[0_15px_35px_rgba(30,90,72,0.08)]"
            >
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                  <div className="flex items-baseline gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon-deep)] transition-colors">
                      <Link to={`/works/${ws.work.id}`}>{ws.work.title}</Link>
                    </h3>
                    {ws.order !== null && (
                      <span className="shrink-0 rounded-lg bg-[var(--sea-ink)] px-2 py-1 text-xs font-bold text-white shadow-sm">
                        Book {ws.order}
                      </span>
                    )}
                  </div>
                  <div className="mb-4 text-sm font-medium text-[var(--sea-ink-soft)]">
                    by {ws.work.author.name}
                  </div>
                  {ws.work.description && (
                    <p className="text-[var(--sea-ink-soft)] leading-relaxed mb-6 line-clamp-4">
                      {ws.work.description}
                    </p>
                  )}
                </div>

                <div className="lg:w-80 shrink-0">
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-[var(--sea-ink-soft)]">
                    <Tag size={14} className="text-[var(--lagoon-deep)]" />
                    Semantic Concepts
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {ws.work.workConcepts.length > 0 ? (
                      ws.work.workConcepts.map((wc) => (
                        <div 
                          key={wc.concept.id}
                          className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white/60 px-3 py-2 text-sm transition-all hover:border-[var(--lagoon-soft)] hover:bg-[var(--lagoon-soft)]/10"
                        >
                          <span className="font-semibold text-[var(--sea-ink)]">{wc.concept.name}</span>
                          <span className="text-xs text-[var(--sea-ink-soft)] bg-[var(--lagoon-soft)]/30 px-1.5 py-0.5 rounded-md">
                            {Math.round(wc.similarity * 100)}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm italic text-[var(--sea-ink-soft)]">No concepts linked yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
