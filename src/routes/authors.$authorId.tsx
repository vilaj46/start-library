import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/db'
import { Book, User, ArrowLeft, ExternalLink, Sparkles, Tag } from 'lucide-react'

const getAuthorDetails = createServerFn({
  method: 'GET',
})
  .inputValidator((authorId: string) => parseInt(authorId))
  .handler(async ({ data: authorId }) => {
    const author = await prisma.author.findUnique({
      where: { id: authorId },
      select: {
        id: true,
        name: true,
        openLibraryId: true,
        bio: true,
        works: {
          select: {
            id: true,
            title: true,
            description: true,
            workSeries: {
              select: {
                order: true,
                series: {
                  select: {
                    name: true
                  }
                }
              }
            },
            workConcepts: {
              select: {
                similarity: true,
                concept: {
                  select: {
                    id: true,
                    name: true,
                    category: true
                  }
                }
              },
              orderBy: { similarity: 'desc' }
            }
          },
          orderBy: { title: 'asc' }
        }
      }
    })

    if (!author) throw new Error('Author not found')
    return author
  })

export const Route = createFileRoute('/authors/$authorId')({
  component: AuthorDetailPage,
  loader: async ({ params }) => await getAuthorDetails({ data: params.authorId }),
})

function AuthorDetailPage() {
  const author = Route.useLoaderData()

  const worksBySeries = author.works.reduce((acc, work) => {
    const seriesName = work.workSeries[0]?.series.name || 'Standalone Works'
    if (!acc[seriesName]) acc[seriesName] = []
    acc[seriesName].push(work)
    return acc
  }, {} as Record<string, typeof author.works>)

  // Sort series names: specific series first, then Standalone
  const sortedSeriesNames = Object.keys(worksBySeries).sort((a, b) => {
    if (a === 'Standalone Works') return 1
    if (b === 'Standalone Works') return -1
    return a.localeCompare(b)
  })

  return (
    <main className="page-wrap px-4 py-12">
      <div className="mb-8">
        <Link
          to="/authors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink-soft)] hover:text-[var(--lagoon-deep)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Authors
        </Link>
      </div>

      <header className="island-shell rise-in relative overflow-hidden rounded-[2.5rem] p-8 sm:p-12 mb-12 border border-[var(--line)]">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.2),transparent_70%)]" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)] shadow-lg">
            <User size={48} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="display-title text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
                {author.name}
              </h1>
              <a 
                href={`https://openlibrary.org/authors/${author.openLibraryId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--sea-ink-soft)] hover:text-[var(--lagoon-deep)] transition-colors"
              >
                <ExternalLink size={20} />
              </a>
            </div>
            <p className="text-sm font-mono text-[var(--sea-ink-soft)] mb-6">{author.openLibraryId}</p>
            
            {author.bio && (
              <div className="prose prose-sm prose-slate max-w-none text-[var(--sea-ink-soft)] leading-relaxed bg-white/40 rounded-2xl p-6 border border-[var(--line)]">
                {author.bio}
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="space-y-16">
        {sortedSeriesNames.map(seriesName => (
          <div key={seriesName}>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)] shadow-sm">
                {seriesName === 'Standalone Works' ? <Book size={20} /> : <Sparkles size={20} />}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-[var(--sea-ink)] leading-none">
                  {seriesName}
                </h2>
                {seriesName !== 'Standalone Works' && (
                  <p className="text-sm font-semibold text-[var(--lagoon-deep)] mt-1 uppercase tracking-wider">Book Series</p>
                )}
              </div>
            </div>

            <div className="grid gap-8">
              {worksBySeries[seriesName]
                .sort((a, b) => {
                  const orderA = a.workSeries[0]?.order ?? Infinity;
                  const orderB = b.workSeries[0]?.order ?? Infinity;
                  if (orderA !== Infinity || orderB !== Infinity) return orderA - orderB;
                  return a.title.localeCompare(b.title);
                })
                .map((work) => {
                  const seriesOrder = work.workSeries[0]?.order;
                  return (
                    <article 
                      key={work.id}
                      className="island-shell group rounded-3xl p-8 border border-[var(--line)] transition-all hover:shadow-[0_15px_35px_rgba(30,90,72,0.08)]"
                    >
                      <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon-deep)] transition-colors">
                              <Link to={`/works/${work.id}`}>{work.title}</Link>
                            </h3>
                            {seriesOrder !== undefined && seriesOrder !== null && (
                              <span className="shrink-0 rounded-lg bg-[var(--sea-ink)]/5 px-2 py-1 text-xs font-bold text-[var(--sea-ink-soft)]">
                                Book {seriesOrder}
                              </span>
                            )}
                          </div>
                          {work.description && (
                            <p className="text-[var(--sea-ink-soft)] leading-relaxed mb-6 line-clamp-4">
                              {work.description}
                            </p>
                          )}
                        </div>

                        <div className="lg:w-80 shrink-0">
                          <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-[var(--sea-ink-soft)]">
                            <Tag size={14} className="text-[var(--lagoon-deep)]" />
                            Semantic Concepts
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {work.workConcepts.length > 0 ? (
                              work.workConcepts.map((wc) => (
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
                  )
                })}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
