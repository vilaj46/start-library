import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/db'
import { Inbox, AlertCircle, Book, User } from 'lucide-react'

// Server function to get all works that have missing categories
const getCurationQueueFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    // We fetch works where missingCategories is not empty
    const worksWithGaps = await prisma.work.findMany({
      where: {
        NOT: {
          missingCategories: {
            isEmpty: true
          }
        }
      },
      include: {
        author: true
      },
      orderBy: {
        title: 'asc'
      }
    })

    // Group the works by Author for a cleaner UI
    const groupedByAuthor = worksWithGaps.reduce((acc, work) => {
      const authorId = work.author.id
      if (!acc[authorId]) {
        acc[authorId] = {
          author: work.author,
          works: []
        }
      }
      acc[authorId].works.push(work)
      return acc
    }, {} as Record<number, { author: any, works: typeof worksWithGaps }>)

    return Object.values(groupedByAuthor)
  })

export const Route = createFileRoute('/curation')({
  component: CurationDashboard,
  loader: async () => await getCurationQueueFn(),
})

function CurationDashboard() {
  const queue = Route.useLoaderData()

  const totalWorksInQueue = queue.reduce((sum, group) => sum + group.works.length, 0)

  return (
    <main className="page-wrap px-4 py-12">
      <header className="mb-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-6 shadow-sm">
          <Inbox size={32} />
        </div>
        <h1 className="display-title text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl mb-4">
          Curation Dashboard
        </h1>
        <p className="text-lg text-[var(--sea-ink-soft)] max-w-2xl">
          This is your global inbox. These are the books that failed to automatically clear the strict 63.5% threshold during ingestion. Click into a book to manually approve its suggested concepts.
        </p>
      </header>

      {totalWorksInQueue === 0 ? (
        <div className="island-shell rounded-3xl p-12 text-center border-2 border-dashed border-[var(--line)]">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600 mb-4">
            <Inbox size={40} />
          </div>
          <h2 className="text-2xl font-bold text-[var(--sea-ink)] mb-2">Inbox Zero!</h2>
          <p className="text-[var(--sea-ink-soft)] max-w-md mx-auto">
            Your database is perfectly mapped. There are no pending books waiting for human curation.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl inline-flex">
            <AlertCircle size={16} />
            {totalWorksInQueue} Books Require Review
          </div>

          {queue.map((group) => (
            <section key={group.author.id} className="island-shell rounded-3xl overflow-hidden border border-[var(--line)]">
              <div className="bg-[var(--lagoon-soft)]/20 px-8 py-5 border-b border-[var(--line)] flex items-center gap-4">
                <div className="h-10 w-10 flex items-center justify-center bg-white rounded-full text-[var(--lagoon-deep)] shadow-sm">
                  <User size={20} />
                </div>
                <h2 className="text-2xl font-bold text-[var(--sea-ink)]">
                  {group.author.name}
                </h2>
              </div>
              
              <div className="divide-y divide-[var(--line)]">
                {group.works.map(work => (
                  <Link 
                    key={work.id} 
                    to={`/works/${work.id}`}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 bg-white hover:bg-[var(--lagoon-soft)]/5 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 text-[var(--sea-ink-soft)] group-hover:text-[var(--lagoon-deep)] transition-colors">
                        <Book size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon-deep)] transition-colors mb-1">
                          {work.title}
                        </h3>
                        <p className="text-sm text-[var(--sea-ink-soft)] line-clamp-1 max-w-2xl">
                          {work.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-200">
                        Missing {work.missingCategories.length} Categories
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
