import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/db'
import { Library, BookOpen, ChevronRight, Sparkles } from 'lucide-react'

const getSeries = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.series.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      _count: {
        select: { works: true }
      }
    },
    orderBy: { name: 'asc' }
  })
})

export const Route = createFileRoute('/series/')({
  component: SeriesPage,
  loader: async () => await getSeries(),
})

function SeriesPage() {
  const series = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 py-12">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)]">
            <Library size={20} />
          </div>
          <p className="island-kicker !mb-0 uppercase tracking-widest">Collections</p>
        </div>
        <h1 className="display-title text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Book Series
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--sea-ink-soft)]">
          Explore curated book series and collections. Discover how authors build their worlds across multiple volumes.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((s) => (
          <Link
            key={s.id}
            to="/series/$seriesId"
            params={{ seriesId: s.id.toString() }}
            className="island-shell group relative overflow-hidden rounded-3xl p-6 transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(30,90,72,0.12)] border border-[var(--line)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--lagoon-soft)]/50 text-[var(--lagoon-deep)] group-hover:bg-[var(--lagoon-deep)] group-hover:text-white transition-colors duration-300">
                  <Sparkles size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon-deep)] transition-colors">
                    {s.name}
                  </h2>
                </div>
              </div>
            </div>

            {s.description && (
              <p className="mt-4 text-sm text-[var(--sea-ink-soft)] line-clamp-2">
                {s.description}
              </p>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-[var(--line)] pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink-soft)]">
                <BookOpen size={16} />
                <span>{s._count.works} Volumes</span>
              </div>
              <div className="text-[var(--lagoon-deep)] opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 duration-300">
                <ChevronRight size={20} />
              </div>
            </div>
            
            {/* Background flourish */}
            <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.1),transparent_70%)] group-hover:scale-150 transition-transform duration-500" />
          </Link>
        ))}
      </div>
      
      {series.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-[var(--line)] py-24 text-center">
          <Library size={48} className="mx-auto mb-4 text-[var(--sea-ink-soft)] opacity-30" />
          <p className="text-lg text-[var(--sea-ink-soft)]">No series have been detected yet.</p>
        </div>
      )}
    </main>
  )
}
