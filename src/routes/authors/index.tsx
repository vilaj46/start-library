import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/db'
import { Users, BookOpen, ChevronRight, User } from 'lucide-react'

const getAuthors = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.author.findMany({
    select: {
      id: true,
      name: true,
      openLibraryId: true,
      isVerified: true,
      _count: {
        select: { works: true }
      }
    },
    orderBy: { name: 'asc' }
  })
})

export const Route = createFileRoute('/authors/')({
  component: AuthorsPage,
  loader: async () => await getAuthors(),
})

function AuthorsPage() {
  const authors = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 py-12">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)]">
            <Users size={20} />
          </div>
          <p className="island-kicker !mb-0 uppercase tracking-widest">Library Directory</p>
        </div>
        <h1 className="display-title text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Authors
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--sea-ink-soft)]">
          Browse all authors currently indexed in the system. Select an author to view their works and semantic mappings.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {authors.map((author) => (
          <Link
            key={author.id}
            to="/authors/$authorId"
            params={{ authorId: author.id.toString() }}
            className="island-shell group relative overflow-hidden rounded-3xl p-6 transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(30,90,72,0.12)] border border-[var(--line)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--lagoon-soft)]/50 text-[var(--lagoon-deep)] group-hover:bg-[var(--lagoon-deep)] group-hover:text-white transition-colors duration-300">
                  <User size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon-deep)] transition-colors">
                    {author.name}
                  </h2>
                  <p className="text-sm text-[var(--sea-ink-soft)] font-mono">
                    {author.openLibraryId}
                  </p>
                </div>
              </div>
              {author.isVerified && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Verified
                </span>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-[var(--line)] pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink-soft)]">
                <BookOpen size={16} />
                <span>{author._count.works} Works</span>
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
      
      {authors.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-[var(--line)] py-24 text-center">
          <Users size={48} className="mx-auto mb-4 text-[var(--sea-ink-soft)] opacity-30" />
          <p className="text-lg text-[var(--sea-ink-soft)]">No authors found in the database.</p>
        </div>
      )}
    </main>
  )
}
